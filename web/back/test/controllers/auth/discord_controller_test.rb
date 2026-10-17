require "test_helper"

class Auth::DiscordControllerTest < ActionDispatch::IntegrationTest
  test "does not start OAuth without server-side configuration" do
    without_oauth_environment do
      get "/auth/discord"

      assert_response :service_unavailable
      assert_equal "Discord OAuth is not configured for this environment.", response.parsed_body.fetch("error")
    end
  end

  test "logs only missing OAuth configuration names" do
    with_oauth_configuration do
      previous = ENV.delete("DISCORD_CLIENT_SECRET")
      entries = []
      logger = Object.new
      logger.define_singleton_method(:warn) { |entry| entries << entry }
      logger.define_singleton_method(:info) { |*| }
      original_logger = Rails.method(:logger)
      Rails.define_singleton_method(:logger) { logger }

      get "/auth/discord"

      assert_response :service_unavailable
      assert_equal [ "DISCORD_CLIENT_SECRET" ], entries.fetch(0).fetch(:missing_configuration)
      assert_equal :missing_environment, entries.fetch(0).fetch(:reason)
      refute_includes entries.to_s, "test-secret"
    ensure
      Rails.define_singleton_method(:logger, original_logger) if original_logger
      previous.nil? ? ENV.delete("DISCORD_CLIENT_SECRET") : ENV["DISCORD_CLIENT_SECRET"] = previous
    end
  end

  test "rejects a callback without a matching state before exchanging a code" do
    get "/auth/discord/callback", params: { code: "not-exchanged", state: "wrong" }

    assert_response :unauthorized
    assert_equal "The Discord authorization state could not be verified.", response.parsed_body.fetch("error")
  end

  test "consumes OAuth state so a callback cannot be replayed" do
    with_oauth_configuration do
      get "/auth/discord"
      state = session.fetch(:discord_oauth_state)

      get "/auth/discord/callback", params: { code: "not-exchanged", state: "wrong" }
      assert_response :unauthorized
      get "/auth/discord/callback", params: { code: "not-exchanged", state: }
      assert_response :unauthorized
      assert_equal "oauth_denied", response.parsed_body.fetch("code")
    end
  end

  test "reports a denied authorization after validating the state" do
    with_oauth_configuration do
      get "/auth/discord"
      state = session.fetch(:discord_oauth_state)

      get "/auth/discord/callback", params: { error: "access_denied", state: }

      assert_response :unauthorized
      assert_equal "oauth_denied", response.parsed_body.fetch("code")
    end
  end

  test "rejects a callback without an authorization code after validating the state" do
    with_oauth_configuration do
      get "/auth/discord"
      state = session.fetch(:discord_oauth_state)

      get "/auth/discord/callback", params: { state: }

      assert_response :unauthorized
      assert_equal "oauth_denied", response.parsed_body.fetch("code")
    end
  end

  test "rejects an expired OAuth state before exchanging a code" do
    with_oauth_configuration do
      get "/auth/discord"
      state = session.fetch(:discord_oauth_state)

      travel 11.minutes do
        get "/auth/discord/callback", params: { code: "not-exchanged", state: }
      end

      assert_response :unauthorized
      assert_equal "oauth_denied", response.parsed_body.fetch("code")
      assert_nil session[:discord_oauth_state]
      assert_nil session[:discord_oauth_state_issued_at]
    end
  end

  test "does not preserve an untrusted OAuth return URL" do
    with_oauth_configuration do
      get "/auth/discord", params: { return_to: "https://attacker.example/steal" }

      assert_response :redirect
      assert_equal "http://localhost:5173", session.fetch(:discord_oauth_return_to)
    end
  end

  test "does not preserve a return URL containing credentials" do
    with_oauth_configuration do
      get "/auth/discord", params: { return_to: "http://attacker@localhost:5173/steal" }

      assert_response :redirect
      assert_equal "http://localhost:5173", session.fetch(:discord_oauth_return_to)
    end
  end

  test "limits repeated OAuth callback attempts by client IP" do
    20.times do
      get "/auth/discord/callback", params: { code: "invalid", state: "invalid" }
      assert_response :unauthorized
    end

    get "/auth/discord/callback", params: { code: "invalid", state: "invalid" }

    assert_response :too_many_requests
    assert_equal "oauth_rate_limited", response.parsed_body.fetch("code")
  end

  test "reports an anonymous session without an OAuth token in the browser" do
    get "/api/v1/auth/session"

    assert_response :success
    assert_equal false, response.parsed_body.fetch("authenticated")
  end

  test "rotates the browser session on logout" do
    account = DiscordAccount.create!(discord_id: "logout-account", username: "author")
    sign_in_as(account)
    revoked = []
    original_revoke = DiscordOauth.method(:revoke!)
    DiscordOauth.define_singleton_method(:revoke!) { |token| revoked << token }

    get "/api/v1/auth/session"
    assert_equal true, response.parsed_body.fetch("authenticated")

    delete "/api/v1/auth/session"
    assert_response :no_content
    assert_empty revoked
    assert account.reload.discord_authorization
    assert_equal "auth.logout", account.audit_events.order(:created_at).last.action
    get "/api/v1/auth/session"
    assert_equal false, response.parsed_body.fetch("authenticated")
  ensure
    DiscordOauth.define_singleton_method(:revoke!, original_revoke) if original_revoke
  end

  test "logout rejects a replayed cookie while preserving a separate login" do
    account = DiscordAccount.create!(discord_id: "session-replay", username: "Author")
    sign_in_as(account)
    first_cookie = cookies["_pokkan_the_bot_session"]
    replay = open_session
    replay.cookies["_pokkan_the_bot_session"] = first_cookie
    cookies.delete("_pokkan_the_bot_session")
    sign_in_as(account)
    separate_cookie = cookies["_pokkan_the_bot_session"]
    cookies["_pokkan_the_bot_session"] = first_cookie
    delete "/api/v1/auth/session"
    assert_response :no_content
    replay.get "/api/v1/auth/session"
    assert_equal false, replay.response.parsed_body["authenticated"]
    cookies["_pokkan_the_bot_session"] = separate_cookie
    get "/api/v1/auth/session"
    assert_equal true, response.parsed_body["authenticated"]
    assert_equal 1, LoginSession.where(discord_account: account).count
  end

  test "OAuth return destinations do not preserve bearer fragments" do
    with_oauth_configuration do
      get "/auth/discord", params: { return_to: "http://localhost:5173/en/shared/example#private-capability" }
      refute_includes session[:discord_oauth_return_to], "private-capability"
    end
  end

  test "OAuth state cannot be consumed again using a copied pre-login cookie" do
    with_oauth_configuration do
      get "/auth/discord"
      state = session.fetch(:discord_oauth_state)
      replay = open_session
      replay.cookies["_pokkan_the_bot_session"] = cookies["_pokkan_the_bot_session"]
      calls = 0
      original = DiscordOauth.method(:exchange!)
      DiscordOauth.define_singleton_method(:exchange!) do |_|
        calls += 1
        { profile: { "id" => "single-use-state", "username" => "Author" }, grant: { access_token: "test-access", refresh_token: "test-refresh", expires_at: 1.hour.from_now, scopes: %w[identify guilds] } }
      end
      get "/auth/discord/callback", params: { code: "first-code", state: }
      assert_response :redirect
      replay.get "/auth/discord/callback", params: { code: "another-code", state: }
      assert_equal 401, replay.response.status
      assert_equal 1, calls
    ensure
      DiscordOauth.define_singleton_method(:exchange!, original) if original
    end
  end

  test "logout cannot report success when server-side revocation fails" do
    account = DiscordAccount.create!(discord_id: "revocation-failure", username: "Author")
    sign_in_as(account)
    original = LoginSession.method(:where)
    LoginSession.define_singleton_method(:where) do |*args|
      relation = original.call(*args)
      relation.define_singleton_method(:delete_all) { raise ActiveRecord::ActiveRecordError, "Revocation unavailable" }
      relation
    end
    assert_raises(ActiveRecord::ActiveRecordError) { delete "/api/v1/auth/session" }
    LoginSession.define_singleton_method(:where, original)
    get "/api/v1/auth/session"
    assert_equal true, response.parsed_body["authenticated"]
  ensure
    LoginSession.define_singleton_method(:where, original) if original
  end

  test "existing identify-only account can grant guilds without changing account or Kits" do
    account = DiscordAccount.create!(discord_id: "8101", username: "author")
    sign_in_as(account)
    kit = account.kits.create!(id: SecureRandom.uuid, name: "Personal", arguments: [], placeholders: [], message: { "content" => "Hello" })
    account.discord_authorization.update!(scopes: "identify")
    with_oauth_configuration do
      get "/auth/discord"
      state = session.fetch(:discord_oauth_state)
      original_exchange = DiscordOauth.method(:exchange!)
      DiscordOauth.define_singleton_method(:exchange!) do |_|
        { profile: { "id" => account.discord_id, "username" => "author", "banner" => "banner-hash" }, grant: { access_token: "new-access", refresh_token: "new-refresh", expires_at: 1.hour.from_now, scopes: %w[identify guilds] } }
      end
      get "/auth/discord/callback", params: { code: "grant", state: }
      assert_response :redirect
      assert_equal account.id, session.fetch(:discord_account_id)
      assert_equal kit.id, account.kits.first.id
      assert account.reload.discord_authorization.guilds_authorized?
      assert_equal "banner-hash", account.banner
      assert_includes response.location, "choose_context=1"
    ensure
      DiscordOauth.define_singleton_method(:exchange!, original_exchange) if original_exchange
    end
  end

  test "installation callback selects a guild only after verified bot membership" do
    account = DiscordAccount.create!(discord_id: "8201", username: "author")
    sign_in_as(account)
    original_contexts = DiscordContexts.method(:for)
    original_installed = DiscordContexts.method(:installed?)
    DiscordContexts.define_singleton_method(:for) do |_, force: false|
      { authorization_required: false, guilds: [ { id: "1001", status: "invite" } ] }
    end
    DiscordContexts.define_singleton_method(:installed?) { |guild_id| guild_id == "1001" }
    with_oauth_configuration do
      get "/auth/discord/install", params: { guild_id: "1001", return_to: "http://localhost:5173/en/account" }
      assert_response :redirect
      query = URI.decode_www_form(URI(response.location).query).to_h
      assert_equal "1001", query.fetch("guild_id")
      state = session.fetch(:discord_oauth_state)
      original_exchange = DiscordOauth.method(:exchange!)
      DiscordOauth.define_singleton_method(:exchange!) do |_|
        { profile: { "id" => account.discord_id, "username" => "author" }, grant: { access_token: "install-access", refresh_token: "install-refresh", expires_at: 1.hour.from_now, scopes: %w[identify guilds bot] } }
      end
      get "/auth/discord/callback", params: { code: "install", state:, guild_id: "1001" }
      assert_response :redirect
      assert_includes response.location, "installation=installed"
      assert_equal "1001", session[:selected_guild_id]
    ensure
      DiscordOauth.define_singleton_method(:exchange!, original_exchange) if original_exchange
    end
  ensure
    DiscordContexts.define_singleton_method(:for, original_contexts) if original_contexts
    DiscordContexts.define_singleton_method(:installed?, original_installed) if original_installed
  end

  test "installation cancellation keeps the personal context and session" do
    account = DiscordAccount.create!(discord_id: "8301", username: "author")
    sign_in_as(account)
    original_contexts = DiscordContexts.method(:for)
    DiscordContexts.define_singleton_method(:for) { |_, force: false| { authorization_required: false, guilds: [ { id: "1001", status: "invite" } ] } }
    with_oauth_configuration do
      get "/auth/discord/install", params: { guild_id: "1001", return_to: "http://localhost:5173/en/account" }
      state = session.fetch(:discord_oauth_state)
      get "/auth/discord/callback", params: { error: "access_denied", state: }

      assert_response :redirect
      assert_includes response.location, "installation=cancelled"
      assert_nil session[:selected_guild_id]
      assert_equal account.id, session[:discord_account_id]
    end
  ensure
    DiscordContexts.define_singleton_method(:for, original_contexts) if original_contexts
  end

  test "installation is not selected when bot membership is still unverified" do
    account = DiscordAccount.create!(discord_id: "8401", username: "author")
    sign_in_as(account)
    original_contexts = DiscordContexts.method(:for)
    original_installed = DiscordContexts.method(:installed?)
    DiscordContexts.define_singleton_method(:for) { |_, force: false| { authorization_required: false, guilds: [ { id: "1001", status: "invite" } ] } }
    DiscordContexts.define_singleton_method(:installed?) { |_| false }
    with_oauth_configuration do
      get "/auth/discord/install", params: { guild_id: "1001", return_to: "http://localhost:5173/en/account" }
      state = session.fetch(:discord_oauth_state)
      original_exchange = DiscordOauth.method(:exchange!)
      DiscordOauth.define_singleton_method(:exchange!) do |_|
        { profile: { "id" => account.discord_id, "username" => "author" }, grant: { access_token: "install-access", refresh_token: "install-refresh", expires_at: 1.hour.from_now, scopes: %w[identify guilds bot] } }
      end
      get "/auth/discord/callback", params: { code: "install", state:, guild_id: "1001" }

      assert_response :redirect
      assert_includes response.location, "installation=unverified"
      assert_nil session[:selected_guild_id]
    ensure
      DiscordOauth.define_singleton_method(:exchange!, original_exchange) if original_exchange
    end
  ensure
    DiscordContexts.define_singleton_method(:for, original_contexts) if original_contexts
    DiscordContexts.define_singleton_method(:installed?, original_installed) if original_installed
  end

  test "server installation cannot start for a guild the user cannot invite to" do
    account = DiscordAccount.create!(discord_id: "8501", username: "author")
    sign_in_as(account)
    original_contexts = DiscordContexts.method(:for)
    DiscordContexts.define_singleton_method(:for) { |_, force: false| { authorization_required: false, guilds: [ { id: "1001", status: "unavailable" } ] } }

    get "/auth/discord/install", params: { guild_id: "1001" }

    assert_response :forbidden
    assert_nil session[:discord_oauth_state]
  ensure
    DiscordContexts.define_singleton_method(:for, original_contexts) if original_contexts
  end

  test "reauthorization never switches an existing session to a different Discord account" do
    account = DiscordAccount.create!(discord_id: "8601", username: "author")
    sign_in_as(account)
    with_oauth_configuration do
      get "/auth/discord"
      state = session.fetch(:discord_oauth_state)
      original_exchange = DiscordOauth.method(:exchange!)
      DiscordOauth.define_singleton_method(:exchange!) do |_|
        { profile: { "id" => "another-account", "username" => "other" }, grant: { access_token: "other-access", refresh_token: "other-refresh", expires_at: 1.hour.from_now, scopes: %w[identify guilds] } }
      end

      get "/auth/discord/callback", params: { code: "grant", state: }

      assert_response :unauthorized
      assert_equal account.id, session[:discord_account_id]
      assert_nil DiscordAccount.find_by(discord_id: "another-account")
    ensure
      DiscordOauth.define_singleton_method(:exchange!, original_exchange) if original_exchange
    end
  end

  private

  def without_oauth_environment
    names = DiscordOauth::REQUIRED_ENVIRONMENT
    previous = names.to_h { |name| [ name, ENV.delete(name) ] }
    yield
  ensure
    previous&.each { |name, value| value.nil? ? ENV.delete(name) : ENV[name] = value }
  end
end
