class DiscordOauth
  require "net/http"
  require "openssl"
  AUTHORIZE_URL = "/oauth2/authorize"
  TOKEN_URL = "/api/oauth2/token"
  PROFILE_URL = "/api/v10/users/@me"
  SCOPES = %w[identify guilds].freeze
  REQUIRED_ENVIRONMENT = %w[DISCORD_CLIENT_ID DISCORD_CLIENT_SECRET REDIRECT_AUTH_URL].freeze

  class ConfigurationError < StandardError
    attr_reader :missing_environment, :reason

    def initialize(message, missing_environment: [], reason: :invalid)
      super(message)
      @missing_environment = missing_environment.freeze
      @reason = reason
    end
  end
  class ExchangeError < StandardError; end
  class ConsentRequired < StandardError; end

  def self.available?
    missing_environment.empty?
  end

  def self.missing_environment
    REQUIRED_ENVIRONMENT.reject { |name| ENV[name].present? }
  end

  def self.authorize_url(state:, guild_id: nil)
    ensure_configured!
    options = {
      redirect_uri: redirect_uri,
      response_type: "code",
      scope: (SCOPES + (guild_id ? [ "bot" ] : [])).join(" "),
      state:
    }
    options.merge!(guild_id:, disable_guild_select: true, integration_type: 0, permissions: 0) if guild_id
    client.auth_code.authorize_url(**options)
  end

  def self.exchange!(code)
    ensure_configured!
    token = client.auth_code.get_token(code, redirect_uri: redirect_uri)
    granted_scopes = token.params.fetch("scope", "").to_s.split
    missing_scopes = SCOPES - granted_scopes
    raise ExchangeError, "Discord did not grant the required scopes." if missing_scopes.any?

    profile = token.get(PROFILE_URL).parsed
    raise ExchangeError, "Discord did not return a user profile." unless profile.is_a?(Hash) && profile["id"].present?

    {
      profile: profile.slice("id", "username", "global_name", "avatar", "banner"),
      grant: grant_from_token(token)
    }
  end

  def self.refresh!(refresh_token, scopes:)
    ensure_configured!
    token = OAuth2::AccessToken.new(client, "", refresh_token:).refresh
    grant_from_token(token, fallback_scopes: scopes)
  end

  def self.revoke!(access_token)
    ensure_configured!
    uri = URI("https://discord.com/api/oauth2/token/revoke")
    request = Net::HTTP::Post.new(uri)
    request.basic_auth(ENV.fetch("DISCORD_CLIENT_ID"), ENV.fetch("DISCORD_CLIENT_SECRET"))
    request.set_form_data(token: access_token)
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 4, read_timeout: 8) { |http| http.request(request) }
    raise DiscordApi::Unavailable unless response.code.to_i.between?(200, 299)
  rescue SocketError, IOError, SystemCallError, Timeout::Error, OpenSSL::SSL::SSLError
    raise DiscordApi::Unavailable
  end

  def self.grant_from_token(token, fallback_scopes: [])
    access_token = token.token
    refresh_token = token.refresh_token
    expires_at = token.expires_at
    raise ExchangeError, "Discord did not return a renewable authorization." if access_token.blank? || refresh_token.blank? || expires_at.blank?

    granted_scopes = token.params.fetch("scope", "").to_s.split
    { access_token:, refresh_token:, expires_at: Time.at(expires_at), scopes: granted_scopes.presence || fallback_scopes }
  end

  def self.redirect_uri
    raw = ENV.fetch("REDIRECT_AUTH_URL")
    uri = URI.parse(raw)
    local_http = !Rails.env.production? && uri.is_a?(URI::HTTP) && !uri.is_a?(URI::HTTPS) && %w[localhost 127.0.0.1].include?(uri.host)
    unless (uri.is_a?(URI::HTTPS) || local_http) && uri.host.present? && uri.userinfo.blank? && uri.query.blank? && uri.fragment.blank?
      raise invalid_redirect_uri
    end

    raw
  rescue URI::InvalidURIError
    raise invalid_redirect_uri
  end

  def self.client
    OAuth2::Client.new(
      ENV.fetch("DISCORD_CLIENT_ID"),
      ENV.fetch("DISCORD_CLIENT_SECRET"),
      site: "https://discord.com",
      authorize_url: AUTHORIZE_URL,
      token_url: TOKEN_URL
    )
  end

  def self.ensure_configured!
    missing = missing_environment
    return if missing.empty?

    raise ConfigurationError.new(
      "Discord OAuth is not configured for this environment.",
      missing_environment: missing,
      reason: :missing_environment
    )
  end

  def self.invalid_redirect_uri
    ConfigurationError.new(
      "REDIRECT_AUTH_URL must be HTTPS (or local HTTP in development) without credentials, query, or fragment.",
      reason: :invalid_redirect_uri
    )
  end
  private_class_method :ensure_configured!, :invalid_redirect_uri
end
