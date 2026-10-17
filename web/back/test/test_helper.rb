ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # SQLite can isolate parallel workers in separate files. The least-privilege
    # local MySQL user owns only the configured test database, not permission to
    # create Rails' per-worker database names.
    test_workers = ENV["PARALLEL_WORKERS"]&.to_i
    parallelize(workers: test_workers&.positive? ? test_workers : ENV["DB_ADAPTER"] == "mysql2" ? 1 : :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end

module OAuthConfigurationTestHelper
  private

  def with_oauth_configuration
    names = DiscordOauth::REQUIRED_ENVIRONMENT
    previous = names.to_h { |name| [ name, ENV[name] ] }
    ENV["DISCORD_CLIENT_ID"] = "test-client"
    ENV["DISCORD_CLIENT_SECRET"] = "test-secret"
    ENV["REDIRECT_AUTH_URL"] = "http://localhost:3000/auth/discord/callback"
    yield
  ensure
    previous&.each { |name, value| value.nil? ? ENV.delete(name) : ENV[name] = value }
  end
end

module AuthenticationTestHelper
  include OAuthConfigurationTestHelper

  def sign_in_as(account)
    with_oauth_configuration do
      get "/auth/discord"
      assert_response :redirect
      state = session.fetch(:discord_oauth_state)
      profile = { "id" => account.discord_id, "username" => account.username, "global_name" => account.global_name, "avatar" => account.avatar }

      exchange = DiscordOauth.method(:exchange!)
      DiscordOauth.define_singleton_method(:exchange!) do |_|
        { profile:, grant: { access_token: "test-access", refresh_token: "test-refresh", expires_at: 1.hour.from_now, scopes: %w[identify guilds] } }
      end
      get "/auth/discord/callback", params: { code: "test-code", state: }
      assert_response :redirect
    ensure
      DiscordOauth.define_singleton_method(:exchange!, exchange) if exchange
    end
  end
end

class ActionDispatch::IntegrationTest
  include AuthenticationTestHelper
  setup { Rails.cache.clear }
end
