module Api
  module V1
    class ContextsController < ApplicationController
      before_action :require_account!

      rescue_from DiscordOauth::ConsentRequired, with: :authorization_required
      rescue_from DiscordApi::Unavailable, with: :discord_unavailable
      rescue_from DiscordApi::NotFound, DiscordApi::Forbidden, with: :context_forbidden
      rescue_from DiscordContexts::BotNotConfigured, with: :discord_unavailable

      def index
        show_contexts
      end

      def refresh
        authorization = current_account.discord_authorization
        if authorization&.guilds_authorized?
          remaining = authorization.with_lock do
            seconds = authorization.contexts_refreshed_at && (authorization.contexts_refreshed_at + 60.seconds - Time.current).ceil
            retry_seconds = authorization.contexts_retry_after_at && (authorization.contexts_retry_after_at - Time.current).ceil
            wait = [ seconds.to_i, retry_seconds.to_i ].max
            if wait.positive?
              wait
            else
              authorization.update!(contexts_refreshed_at: Time.current)
              0
            end
          end
          if remaining.positive?
            response.set_header("Retry-After", remaining.to_s)
            return render_error("Server list was refreshed recently. Try again shortly.", code: "refresh_cooldown", status: :too_many_requests)
          end
        end
        show_contexts(force: true)
      rescue DiscordApi::RateLimited => error
        authorization&.update!(contexts_retry_after_at: Time.current + error.retry_after)
        raise
      end

      def select
        context_id = params[:context_id].to_s
        if context_id == "personal"
          session.delete(:selected_guild_id)
          return show_contexts
        end

        DiscordContexts.access!(current_account, context_id)

        session[:selected_guild_id] = context_id
        show_contexts
      end

      def metadata
        guild_id = params[:guild_id].to_s
        return context_forbidden unless guild_id.match?(/\A\d+\z/)

        render json: DiscordGuildMetadata.read(current_account, guild_id)
      end

      def refresh_metadata
        guild_id = params[:guild_id].to_s
        return context_forbidden unless guild_id.match?(/\A\d+\z/)

        result = DiscordGuildMetadata.read(current_account, guild_id, manual: true)
        response.set_header("Retry-After", result[:retry_after].to_s) if result[:retry_after].positive?
        return render_error("Server data was refreshed recently. Try again shortly.", code: "refresh_cooldown", status: :too_many_requests) if result[:cooldown]

        render json: result
      end

      private

      def show_contexts(force: false)
        result = DiscordContexts.for(current_account, force:)
        selected_id = session[:selected_guild_id]
        available = result[:guilds].any? { |item| item[:id] == selected_id }
        unless available
          selected_id = "personal"
          session.delete(:selected_guild_id)
        end
        render json: result.merge(selected_context_id: selected_id)
      end

      def authorization_required
        if action_name.in?(%w[metadata refresh_metadata])
          return render_error("Discord server access needs to be authorized again.", code: "authorization_required", status: :unauthorized)
        end

        session.delete(:selected_guild_id)
        render json: { authorization_required: true, guilds: [], selected_context_id: "personal" }
      end

      def discord_unavailable(error)
        Rails.logger.warn(event: "discord.contexts_unavailable", error_class: error.class.name, request_id: request.request_id)
        if error.is_a?(DiscordApi::RateLimited)
          response.set_header("Retry-After", error.retry_after.ceil.to_s)
          return render_error("Discord asked us to wait before checking server access.", code: "discord_rate_limited", status: :too_many_requests)
        end
        render_error("Discord server information is temporarily unavailable.", code: "discord_unavailable", status: :service_unavailable)
      end

      def context_forbidden
        render_error("This server is not available for this account.", code: "context_forbidden", status: :forbidden)
      end
    end
  end
end
