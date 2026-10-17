require "test_helper"

class DiscordOauthTest < ActiveSupport::TestCase
  include OAuthConfigurationTestHelper

  FakeToken = Struct.new(:params) do
    def get(*) = raise("profile lookup must not happen without the required scopes")
  end
  FakeAuthorizationCode = Struct.new(:token) do
    def get_token(*) = token
  end
  FakeOauthClient = Struct.new(:token) do
    def auth_code = FakeAuthorizationCode.new(token)
  end

  test "requests identity and guild discovery" do
    with_oauth_configuration do
      query = URI.decode_www_form(URI(DiscordOauth.authorize_url(state: "state")).query).to_h
      assert_equal "identify guilds", query.fetch("scope")
      assert_equal "state", query.fetch("state")
    end
  end

  test "guild installation keeps a state-bound code grant and requests no bot permissions" do
    with_oauth_configuration do
      query = URI.decode_www_form(URI(DiscordOauth.authorize_url(state: "state", guild_id: "123456789")).query).to_h
      assert_equal "identify guilds bot", query.fetch("scope")
      assert_equal "123456789", query.fetch("guild_id")
      assert_equal "0", query.fetch("permissions")
      assert_equal "0", query.fetch("integration_type")
      assert_equal "true", query.fetch("disable_guild_select")
      assert_equal "code", query.fetch("response_type")
      assert_equal "state", query.fetch("state")
    end
  end

  test "identifies each missing OAuth environment key without exposing values" do
    with_oauth_configuration do
      DiscordOauth::REQUIRED_ENVIRONMENT.each do |name|
        previous = ENV.delete(name)

        assert_equal [ name ], DiscordOauth.missing_environment
        assert_not DiscordOauth.available?
        error = assert_raises(DiscordOauth::ConfigurationError) { DiscordOauth.authorize_url(state: "state") }
        assert_equal [ name ], error.missing_environment
        assert_equal :missing_environment, error.reason
      ensure
        previous.nil? ? ENV.delete(name) : ENV[name] = previous
      end
    end
  end

  test "returns only account profile data from a successful exchange" do
    with_oauth_configuration do
      token = Object.new
      token.define_singleton_method(:params) { { "scope" => "identify guilds" } }
      token.define_singleton_method(:token) { "test-access" }
      token.define_singleton_method(:refresh_token) { "test-refresh" }
      token.define_singleton_method(:expires_at) { 1.hour.from_now.to_i }
      token.define_singleton_method(:get) do |path|
        raise "unexpected endpoint" unless path == "/api/v10/users/@me"
        Struct.new(:parsed).new({ "id" => "123", "username" => "author", "email" => "unused" })
      end
      original = DiscordOauth.method(:client)
      DiscordOauth.define_singleton_method(:client) { FakeOauthClient.new(token) }
      result = DiscordOauth.exchange!("code")
      assert_equal({ "id" => "123", "username" => "author" }, result.fetch(:profile))
      assert_equal %w[identify guilds], result.fetch(:grant).fetch(:scopes)
    ensure
      DiscordOauth.define_singleton_method(:client, original) if original
    end
  end

  test "rejects a non-local insecure callback URL" do
    with_oauth_configuration do
      previous = ENV["REDIRECT_AUTH_URL"]
      ENV["REDIRECT_AUTH_URL"] = "http://example.com/auth/discord/callback"

      error = assert_raises(DiscordOauth::ConfigurationError) { DiscordOauth.authorize_url(state: "state") }

      assert_equal [], error.missing_environment
      assert_equal :invalid_redirect_uri, error.reason
      assert_match(/HTTPS/, error.message)
    ensure
      previous.nil? ? ENV.delete("REDIRECT_AUTH_URL") : ENV["REDIRECT_AUTH_URL"] = previous
    end
  end

  test "rejects a token that is missing a required OAuth scope" do
    with_oauth_configuration do
      original = DiscordOauth.method(:client)
      DiscordOauth.define_singleton_method(:client) { FakeOauthClient.new(FakeToken.new({ "scope" => "" })) }

      error = assert_raises(DiscordOauth::ExchangeError) { DiscordOauth.exchange!("code") }

      assert_match(/required scopes/, error.message)
    ensure
      DiscordOauth.define_singleton_method(:client, original) if original
    end
  end
end
