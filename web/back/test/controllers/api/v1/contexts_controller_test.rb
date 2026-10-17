require "test_helper"

class Api::V1::ContextsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @account = DiscordAccount.create!(discord_id: "7001", username: "author")
    sign_in_as(@account)
  end

  test "classifies available guilds with server-side Discord data" do
    with_discord_guilds do
      get "/api/v1/contexts"
      assert_response :success
      body = response.parsed_body
      assert_equal "personal", body.fetch("selected_context_id")
      assert_equal [ "installed", "invite" ], body.fetch("guilds").map { |item| item.fetch("status") }
      refute body.fetch("guilds").any? { |item| item.fetch("id") == "3003" }
      refute body.to_s.include?("test-access")
    end
  end

  test "selects manageable servers with or without the bot and rejects unauthorized IDs" do
    with_discord_guilds do
      post "/api/v1/contexts/select", params: { context_id: "2002" }
      assert_response :success
      assert_equal "2002", response.parsed_body.fetch("selected_context_id")
      post "/api/v1/contexts/select", params: { context_id: "9999" }
      assert_response :forbidden
      post "/api/v1/contexts/select", params: { context_id: "3003" }
      assert_response :forbidden
      post "/api/v1/contexts/select", params: { context_id: "1001" }
      assert_response :success
      assert_equal "1001", response.parsed_body.fetch("selected_context_id")
      get "/api/v1/contexts"
      assert_equal "1001", response.parsed_body.fetch("selected_context_id")
      post "/api/v1/contexts/select", params: { context_id: "personal" }
      assert_equal "personal", response.parsed_body.fetch("selected_context_id")
    end
  end

  test "an account without guild consent can keep its personal session and reauthorize" do
    @account.discord_authorization.update!(scopes: "identify")
    get "/api/v1/contexts"
    assert_response :success
    assert response.parsed_body.fetch("authorization_required")
    assert_equal [], response.parsed_body.fetch("guilds")
    get "/api/v1/auth/session"
    assert response.parsed_body.fetch("authenticated")
    get "/api/v1/contexts/1001/metadata"
    assert_response :unauthorized
    assert_equal "authorization_required", response.parsed_body.fetch("code")
  end

  test "Discord failures do not turn an unknown installation into an invite opportunity" do
    original = DiscordApi.method(:get)
    DiscordApi.define_singleton_method(:get) { |*, **| raise DiscordApi::RateLimited }
    get "/api/v1/contexts"
    assert_response :too_many_requests
    assert_equal "discord_rate_limited", response.parsed_body.fetch("code")
  ensure
    DiscordApi.define_singleton_method(:get, original) if original
  end

  test "a revoked user token removes the grant without deleting the account or Kits" do
    kit = @account.kits.create!(id: SecureRandom.uuid, name: "Saved", arguments: [], placeholders: [], message: { "content" => "Hello" })
    original = DiscordApi.method(:get)
    DiscordApi.define_singleton_method(:get) { |*, **| raise DiscordApi::Unauthorized }
    get "/api/v1/contexts"
    assert_response :success
    assert response.parsed_body.fetch("authorization_required")
    assert_nil @account.reload.discord_authorization
    assert_equal kit.id, @account.kits.first.id
  ensure
    DiscordApi.define_singleton_method(:get, original) if original
  end

  test "discovery respects Discord retry time across ordinary requests" do
    original = DiscordApi.method(:get)
    calls = 0
    DiscordApi.define_singleton_method(:get) do |*, **|
      calls += 1
      raise DiscordApi::RateLimited.new(retry_after: 120)
    end
    deadline = nil
    2.times do
      get "/api/v1/contexts"
      assert_response :too_many_requests
      assert_equal "120", response.headers["Retry-After"]
      deadline ||= @account.discord_authorization.reload.contexts_retry_after_at
      assert_equal deadline, @account.discord_authorization.reload.contexts_retry_after_at
    end
    assert_equal 1, calls
    travel 121.seconds do
      get "/api/v1/contexts"
      assert_response :too_many_requests
      assert_equal 2, calls
    end
  ensure
    DiscordApi.define_singleton_method(:get, original) if original
  end

  test "bot discovery failures keep managed servers selectable and respect retry backoff" do
    original = DiscordApi.method(:get)
    bot_calls = 0
    DiscordApi.define_singleton_method(:get) do |_, authorization:|
      if authorization.start_with?("Bot ")
        bot_calls += 1
        raise DiscordApi::RateLimited.new(retry_after: 120)
      end
      [ { "id" => "2002", "name" => "Community", "permissions" => "32" } ]
    end
    token = ENV["DISCORD_BOT_TOKEN"]
    ENV["DISCORD_BOT_TOKEN"] = "test-bot"
    2.times do
      get "/api/v1/contexts"
      assert_response :success
      assert_equal "unknown", response.parsed_body.fetch("guilds").first.fetch("status")
    end
    post "/api/v1/contexts/select", params: { context_id: "2002" }
    assert_response :success
    assert_equal "2002", response.parsed_body.fetch("selected_context_id")
    assert_equal 1, bot_calls
  ensure
    ENV["DISCORD_BOT_TOKEN"] = token
    DiscordApi.define_singleton_method(:get, original) if original
  end

  test "discovers guilds beyond the first Discord page" do
    previous_token = ENV["DISCORD_BOT_TOKEN"]
    ENV["DISCORD_BOT_TOKEN"] = "test-bot"
    original = DiscordApi.method(:get)
    DiscordApi.define_singleton_method(:get) do |path, authorization:|
      if authorization.start_with?("Bot ")
        []
      elsif path.include?("after=200")
        [ { "id" => "201", "name" => "Last", "permissions" => "32" } ]
      else
        (1..200).map { |id| { "id" => id.to_s, "name" => "Guild #{id}", "permissions" => "32" } }
      end
    end

    get "/api/v1/contexts"

    assert_response :success
    assert_equal 201, response.parsed_body.fetch("guilds").length
    assert response.parsed_body.fetch("guilds").any? { |guild| guild.fetch("id") == "201" }
  ensure
    ENV["DISCORD_BOT_TOKEN"] = previous_token
    DiscordApi.define_singleton_method(:get, original) if original
  end

  test "selecting a guild uses targeted membership verification without forced rediscovery" do
    force_values = []
    original_for = DiscordContexts.method(:for)
    original_member = DiscordContexts.method(:access!)
    DiscordContexts.define_singleton_method(:for) do |_, force: false|
      force_values << force
      { authorization_required: false, guilds: [ { id: "1001", status: "installed" } ] }
    end
    DiscordContexts.define_singleton_method(:access!) { |*, **| { "id" => "1001", "permissions" => "0" } }
    post "/api/v1/contexts/select", params: { context_id: "1001" }
    assert_response :success
    assert_equal [ false ], force_values
    assert_equal "1001", response.parsed_body.fetch("selected_context_id")
  ensure
    DiscordContexts.define_singleton_method(:for, original_for) if original_for
    DiscordContexts.define_singleton_method(:access!, original_member) if original_member
  end

  test "a selected server falls back after membership discovery expires" do
    with_discord_guilds do
      post "/api/v1/contexts/select", params: { context_id: "1001" }
      assert_equal "1001", response.parsed_body.fetch("selected_context_id")
      original = DiscordApi.method(:get)
      DiscordApi.define_singleton_method(:get) do |path, authorization:|
        authorization.start_with?("Bearer ") ? [] : original.call(path, authorization:)
      end
      travel 121.seconds do
        get "/api/v1/contexts"
        assert_response :success
        assert_equal "personal", response.parsed_body.fetch("selected_context_id")
      end
    ensure
      DiscordApi.define_singleton_method(:get, original) if original
    end
  end

  test "manual context discovery refresh is rate limited on the server" do
    with_discord_guilds do
      post "/api/v1/contexts/refresh"
      assert_response :success
      post "/api/v1/contexts/refresh"
      assert_response :too_many_requests
      assert_equal "refresh_cooldown", response.parsed_body.fetch("code")
      assert_operator response.headers.fetch("Retry-After").to_i, :>, 0
    end
  end

  test "Discord Retry-After extends the server-side discovery cooldown" do
    original = DiscordApi.method(:get)
    DiscordApi.define_singleton_method(:get) { |*, **| raise DiscordApi::RateLimited.new(retry_after: 120) }
    post "/api/v1/contexts/refresh"
    assert_response :too_many_requests
    assert_equal "120", response.headers.fetch("Retry-After")
    DiscordApi.define_singleton_method(:get, original)

    post "/api/v1/contexts/refresh"
    assert_response :too_many_requests
    assert_operator response.headers.fetch("Retry-After").to_i, :>=, 119
  ensure
    DiscordApi.define_singleton_method(:get, original) if original
  end

  test "metadata returns only channels visible through live membership and keeps a cached snapshot" do
    with_discord_guilds do
      get "/api/v1/contexts/1001/metadata"
      assert_response :success
      assert_equal "current", response.parsed_body.fetch("status")
      assert_equal [ "general" ], response.parsed_body.fetch("channels").map { |channel| channel.fetch("name") }
      assert_equal 2, DiscordGuildSnapshot.find_by!(guild_id: "1001").format_version

      post "/api/v1/contexts/1001/metadata/refresh"
      assert_response :success
      post "/api/v1/contexts/1001/metadata/refresh"
      assert_response :too_many_requests
      assert_equal "refresh_cooldown", response.parsed_body.fetch("code")
    end
  end

  test "a saved snapshot is not exposed after live membership verification fails" do
    with_discord_guilds do
      get "/api/v1/contexts/1001/metadata"
      assert_response :success
    end
    original = DiscordContexts.method(:access!)
    DiscordContexts.define_singleton_method(:access!) { |_, _| raise DiscordApi::NotFound }
    get "/api/v1/contexts/1001/metadata"
    assert_response :forbidden
    refute response.parsed_body.key?("channels")
    assert DiscordGuildSnapshot.find_by(guild_id: "1001")
  ensure
    DiscordContexts.define_singleton_method(:access!, original) if original
  end

  private

  def with_discord_guilds
    previous_token = ENV["DISCORD_BOT_TOKEN"]
    ENV["DISCORD_BOT_TOKEN"] = "test-bot"
    original = DiscordApi.method(:get)
    DiscordApi.define_singleton_method(:get) do |path, authorization:|
      if authorization.start_with?("Bearer ")
        [
          { "id" => "1001", "name" => "Installed", "permissions" => "32", "owner" => false },
          { "id" => "2002", "name" => "Can invite", "permissions" => "32", "owner" => false },
          { "id" => "3003", "name" => "Not installed", "permissions" => "0", "owner" => false }
        ]
      elsif path == "/guilds/1001/members/7001"
        { "user" => { "id" => "7001" }, "roles" => [] }
      elsif path == "/guilds/1001"
        { "id" => "1001", "name" => "Installed", "owner_id" => "9000", "features" => [], "emojis" => [], "roles" => [ { "id" => "1001", "name" => "@everyone", "permissions" => "1024", "position" => 0 } ] }
      elsif path == "/guilds/1001/channels"
        [
          { "id" => "2001", "name" => "general", "type" => 0, "position" => 0, "permission_overwrites" => [] },
          { "id" => "2002", "name" => "private", "type" => 0, "position" => 1, "permission_overwrites" => [ { "id" => "1001", "type" => 0, "allow" => "0", "deny" => "1024" } ] }
        ]
      elsif path.start_with?("/guilds/")
        raise DiscordApi::NotFound
      elsif path.start_with?("/users/@me/guilds")
        [ { "id" => "1001" } ]
      else
        raise "unexpected Discord request"
      end
    end
    yield
  ensure
    ENV["DISCORD_BOT_TOKEN"] = previous_token
    DiscordApi.define_singleton_method(:get, original) if original
  end
end
