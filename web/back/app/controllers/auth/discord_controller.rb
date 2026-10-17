module Auth
  class DiscordController < ApplicationController
    OAUTH_STATE_TTL = 10.minutes

    rate_limit to: 20, within: 5.minutes, by: -> { request.remote_ip }, only: :callback, name: "oauth_callback", with: :oauth_rate_limited
    rate_limit to: 20, within: 5.minutes, by: -> { request.remote_ip }, only: %i[start install], name: "oauth_start", with: :oauth_rate_limited

    rescue_from DiscordOauth::ConfigurationError, with: :oauth_unavailable
    rescue_from OAuth2::Error, with: :oauth_failed
    rescue_from Faraday::Error, with: :oauth_failed
    rescue_from DiscordOauth::ExchangeError, with: :oauth_failed
    rescue_from DiscordApi::Unavailable, with: :discord_unavailable
    rescue_from DiscordApi::Unauthorized, with: :discord_unavailable
    rescue_from DiscordContexts::BotNotConfigured, with: :discord_unavailable

    def start
      state = begin_authorization(return_to: params[:return_to], intent: "login")
      redirect_to DiscordOauth.authorize_url(state:), allow_other_host: true
    end

    def install
      return require_account! unless current_account

      guild = DiscordContexts.for(current_account)[:guilds].find { |item| item[:id] == params[:guild_id] }
      return render_error("You cannot install Pokkan in this server.", code: "guild_not_eligible", status: :forbidden) unless guild && guild[:status] == "invite"

      state = begin_authorization(return_to: params[:return_to], intent: "install", guild_id: guild[:id])
      redirect_to DiscordOauth.authorize_url(state:, guild_id: guild[:id]), allow_other_host: true
    end

    def callback
      expected_state = session.delete(:discord_oauth_state).to_s
      state_issued_at = session.delete(:discord_oauth_state_issued_at)
      intent = session.delete(:discord_oauth_intent)
      intended_guild_id = session.delete(:discord_oauth_guild_id)
      expected_account_id = session.delete(:discord_oauth_account_id)
      requested_state = params[:state].to_s
      unless secure_state?(expected_state, requested_state) && fresh_state?(state_issued_at) && Rails.cache.delete("discord-oauth-state/#{Digest::SHA256.hexdigest(expected_state)}")
        return oauth_denied("The Discord authorization state could not be verified.")
      end
      if params[:error].present?
        return redirect_to_return("installation=cancelled") if intent == "install" && current_account
        return redirect_to_return("authorization=denied") if current_account
        return oauth_denied("Discord authorization was not completed.")
      end
      return oauth_denied("Discord did not return an authorization code.") if params[:code].blank?
      if intent == "install" && (current_account.nil? || current_account.id != expected_account_id || (params[:guild_id].present? && params[:guild_id] != intended_guild_id))
        return oauth_denied("The Discord installation could not be verified.")
      end

      authorization = DiscordOauth.exchange!(params[:code])
      profile = authorization.fetch(:profile)
      if expected_account_id && profile.fetch("id") != current_account&.discord_id
        return oauth_denied("Discord account changed during authorization.")
      end
      account = DiscordAccount.find_or_initialize_by(discord_id: profile.fetch("id"))
      DiscordAccount.transaction do
        account.assign_attributes(
          username: profile["username"],
          global_name: profile["global_name"],
          avatar: profile["avatar"],
          banner: profile["banner"],
          last_signed_in_at: Time.current
        )
        account.save!
        grant = account.discord_authorization || account.build_discord_authorization
        grant.assign_grant!(authorization.fetch(:grant))
        grant.save!
        record_audit!(account:, action: intent == "install" ? "auth.install_authorized" : "auth.login")
      end

      if expected_account_id.nil?
        destination = session.delete(:discord_oauth_return_to) || frontend_origin
        login_token = LoginSession.register!(account)
        reset_session
        session[:discord_account_id] = account.id
        session[:login_token] = login_token
        redirect_to marked_return(destination, "choose_context=1"), allow_other_host: true
      else
        if intent == "install"
          begin
            verified = DiscordContexts.installed?(intended_guild_id)
            DiscordContexts.invalidate_installs!(guild_id: intended_guild_id) if verified
            session[:selected_guild_id] = intended_guild_id if verified
            redirect_to_return(verified ? "installation=installed" : "installation=unverified")
          rescue DiscordApi::Unavailable, DiscordApi::Forbidden, DiscordContexts::BotNotConfigured
            redirect_to_return("installation=unverified")
          end
        else
          redirect_to_return("choose_context=1")
        end
      end
    end

    def session_info
      account = current_account
      return render json: { authenticated: false } unless account

      render json: {
        authenticated: true,
        account: {
          id: account.discord_id,
          username: account.username,
          global_name: account.global_name,
          avatar: account.avatar,
          banner: account.banner
        }
      }
    end

    def destroy
      account = current_account
      LoginSession.where(id: Digest::SHA256.hexdigest(session[:login_token].to_s), discord_account_id: account.id).delete_all if account
      reset_session
      begin
        record_audit!(account:, action: "auth.logout") if account
      rescue ActiveRecord::ActiveRecordError => error
        Rails.logger.error(
          event: "auth.logout_audit_failed",
          error_class: error.class.name,
          request_id: request.request_id
        )
      end
      head :no_content
    end

    private

    def begin_authorization(return_to:, intent:, guild_id: nil)
      state = SecureRandom.urlsafe_base64(32)
      # CookieStore alone cannot invalidate a copied pre-login cookie.
      Rails.cache.write("discord-oauth-state/#{Digest::SHA256.hexdigest(state)}", true, expires_in: OAUTH_STATE_TTL)
      session[:discord_oauth_state] = state
      session[:discord_oauth_state_issued_at] = Time.current.to_i
      session[:discord_oauth_return_to] = return_path(return_to)
      session[:discord_oauth_intent] = intent
      session[:discord_oauth_guild_id] = guild_id
      session[:discord_oauth_account_id] = current_account&.id
      state
    end

    def redirect_to_return(query)
      destination = session.delete(:discord_oauth_return_to) || frontend_origin
      redirect_to marked_return(destination, query), allow_other_host: true
    end

    def marked_return(destination, query)
      uri = URI(destination)
      uri.query = [ uri.query, query ].compact.join("&")
      uri.fragment = nil
      uri.to_s
    end

    def secure_state?(expected, requested)
      expected.present? && requested.bytesize == expected.bytesize && ActiveSupport::SecurityUtils.secure_compare(expected, requested)
    end

    def fresh_state?(issued_at)
      issued_at.is_a?(Integer) && issued_at >= OAUTH_STATE_TTL.ago.to_i && issued_at <= Time.current.to_i
    end

    def return_path(value)
      candidate = value.presence || frontend_origin
      uri = URI.parse(candidate)
      return frontend_origin unless uri.is_a?(URI::HTTP) && uri.userinfo.blank? && frontend_origins.include?(uri.origin)

      uri.fragment = nil
      uri.to_s
    rescue URI::InvalidURIError
      frontend_origin
    end

    def frontend_origin
      Rails.configuration.x.frontend_origin
    end

    def frontend_origins
      Rails.configuration.x.frontend_origins
    end

    def oauth_denied(message)
      render_error(message, code: "oauth_denied", status: :unauthorized)
    end

    def oauth_unavailable(error)
      Rails.logger.warn(
        event: "auth.discord_oauth_unavailable",
        reason: error.reason,
        missing_configuration: error.missing_environment,
        request_id: request.request_id
      )
      render_error(error.message, code: "oauth_unavailable", status: :service_unavailable)
    end

    def oauth_failed
      return redirect_to_return("authorization=failed") if current_account

      render_error("Discord authorization could not be completed.", code: "oauth_failed", status: :bad_gateway)
    end

    def oauth_rate_limited
      response.set_header("Retry-After", "300")
      render_error("Too many authorization attempts. Try again shortly.", code: "oauth_rate_limited", status: :too_many_requests)
    end

    def discord_unavailable(error)
      Rails.logger.warn(event: "auth.discord_context_unavailable", error_class: error.class.name, request_id: request.request_id)
      render_error("Discord server information is temporarily unavailable.", code: "discord_unavailable", status: :service_unavailable)
    end
  end
end
