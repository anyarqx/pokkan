require "test_helper"

class Api::V1::KitsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @account = DiscordAccount.create!(discord_id: "author", username: "author")
    @id = SecureRandom.uuid
    @data = {
      name: "Welcome", message: { content: "Hello", attachments: [ { id: "0", filename: "guide.pdf" } ] },
      arguments: [ { name: "count", type: "integer", required: false, default: "2" } ],
      placeholders: [ { key: "ticket.id", label: "Ticket", description: "Ticket number", category: "Custom", type: "number", example: "42" } ]
    }
  end

  test "requires authentication" do
    get "/api/v1/kits"
    assert_response :unauthorized
    put "/api/v1/kits/#{@id}", params: { kit: @data }, as: :json
    assert_response :unauthorized
  end

  test "creates loads updates and deletes the account Kit with a single ID" do
    sign_in_as(@account)
    assert_difference("Kit.count", 1) { put "/api/v1/kits/#{@id}", params: { kit: @data }, as: :json }
    assert_response :success
    assert_equal @data.deep_stringify_keys.merge("id" => @id), response.parsed_body.fetch("kit").slice("id", "name", "message", "arguments", "placeholders")
    assert_nil response.parsed_body.dig("kit", "guild_id")
    assert_equal 0, response.parsed_body.dig("kit", "revision")
    get "/api/v1/kits/#{@id}"
    assert_response :success
    assert_equal @id, response.parsed_body.dig("kit", "id")
    get "/api/v1/kits"
    assert_equal [ @id ], response.parsed_body.fetch("kits").pluck("id")
    put "/api/v1/kits/#{@id}", params: { kit: @data.merge(name: "Updated", revision: 0) }, as: :json
    assert_response :success
    assert_equal "Updated", Kit.find(@id).name
    assert_difference("Kit.count", -1) { delete "/api/v1/kits/#{@id}" }
    assert_response :no_content
    assert_equal %w[kit.create kit.update kit.delete], @account.audit_events.where(target_id: @id).order(:id).pluck(:action)
  end

  test "isolates list read overwrite and delete across accounts" do
    owner = DiscordAccount.create!(discord_id: "other")
    owner.kits.create!(@data.merge(id: @id))
    sign_in_as(@account)
    get "/api/v1/kits"
    assert_empty response.parsed_body.fetch("kits")
    get "/api/v1/kits/#{@id}"
    assert_response :not_found
    put "/api/v1/kits/#{@id}", params: { kit: @data.merge(name: "Stolen") }, as: :json
    assert_response :not_found
    delete "/api/v1/kits/#{@id}"
    assert_response :not_found
    assert_equal owner.id, Kit.find(@id).discord_account_id
    assert_equal "Welcome", Kit.find(@id).name
  end

  test "rejects malformed data and unknown persistence fields" do
    sign_in_as(@account)
    put "/api/v1/kits/#{@id}", params: { kit: @data.merge(message: []) }, as: :json
    assert_response :unprocessable_entity
    put "/api/v1/kits/#{@id}", params: { kit: @data.merge(extra: "value") }, as: :json
    assert_response :bad_request
    put "/api/v1/kits/not-a-uuid", params: { kit: @data }, as: :json
    assert_response :unprocessable_entity
    assert_empty @account.kits
  end

  test "protects Kit mutations with the session CSRF token" do
    sign_in_as(@account)
    previous = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    put "/api/v1/kits/#{@id}", params: { kit: @data }, as: :json
    assert_response :unprocessable_entity
    get "/api/v1/csrf"
    token = response.parsed_body.fetch("token")
    put "/api/v1/kits/#{@id}", params: { kit: @data }, headers: { "X-CSRF-Token" => token }, as: :json
    assert_response :success
  ensure
    ActionController::Base.allow_forgery_protection = previous
  end

  test "ordinary members cannot access the private server collection or individual Kits" do
    creator = DiscordAccount.create!(discord_id: "creator", username: "creator")
    server_kit = creator.kits.create!(@data.merge(id: @id, guild_id: "1001"))
    with_guild(member_roles: [], role_permissions: 0) do
      sign_in_as(@account)
      get "/api/v1/kits", params: { context_id: "1001" }
      assert_response :not_found
      refute response.parsed_body.key?("kits")
      get "/api/v1/kits/#{@id}"
      assert_response :not_found
      refute response.parsed_body.key?("kit")

      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision: 0, name: "Stolen") }, as: :json
      assert_response :not_found
      delete "/api/v1/kits/#{@id}", params: { revision: 0 }
      assert_response :not_found
      assert_equal "Welcome", server_kit.reload.name

      other_id = SecureRandom.uuid
      put "/api/v1/kits/#{other_id}", params: { kit: @data.merge(guild_id: "1001") }, as: :json
      assert_response :not_found
      refute Kit.exists?(other_id)
    end
  end

  test "live guild administration permits editing even after the creator leaves" do
    creator = DiscordAccount.create!(discord_id: "creator", username: "creator")
    kit = creator.kits.create!(@data.merge(id: @id, guild_id: "1001"))
    with_guild(member_roles: [ "3001" ], role_permissions: (1 << 5)) do
      sign_in_as(@account)
      get "/api/v1/kits/#{@id}"
      assert_equal true, response.parsed_body.dig("kit", "can_edit")
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision: 0, name: "Admin edit") }, as: :json
      assert_response :success
      assert_equal "Admin edit", kit.reload.name
      assert_equal creator.id, kit.discord_account_id
      delete "/api/v1/kits/#{@id}", params: { revision: 1 }
      assert_response :no_content
    end
  end

  test "spaced server saves and reads reuse discovery until access expires" do
    sign_in_as(@account)
    @account.kits.create!(@data.merge(id: @id, guild_id: "1001"))
    original = DiscordApi.method(:get)
    original_bot = DiscordContexts.method(:bot_authorization)
    DiscordContexts.define_singleton_method(:bot_authorization) { "Bot test" }
    calls = []
    guilds = [ { "id" => "1001", "name" => "Community", "permissions" => "32" } ]
    DiscordApi.define_singleton_method(:get) do |path, authorization:|
      calls << [ path, authorization.start_with?("Bot ") ]
      authorization.start_with?("Bot ") ? [ { "id" => "1001" } ] : guilds
    end
    started = Time.current
    get "/api/v1/kits/#{@id}"
    assert_response :success
    assert_equal [ [ "/users/@me/guilds?limit=200", false ] ], calls
    get "/api/v1/contexts"
    assert_response :success
    5.times do |revision|
      travel_to(started + revision * 20.seconds) do
        put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision:, name: "Saved #{revision}") }, as: :json
        assert_response :success
        get "/api/v1/kits/#{@id}"
        assert_response :success
        get "/api/v1/kits", params: { context_id: "1001" }
        assert_response :success
      end
    end
    assert_equal 2, calls.length, "Only the initial user and bot discovery should contact Discord"
    guilds.first["permissions"] = "0"
    travel_to(started + 121.seconds) do
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision: 5, name: "Denied") }, as: :json
      assert_response :not_found
      assert_nil response.parsed_body["kit"]
      assert_equal "Saved 4", Kit.find(@id).name
    end
  ensure
    DiscordApi.define_singleton_method(:get, original) if original
    DiscordContexts.define_singleton_method(:bot_authorization, original_bot) if original_bot
  end

  test "guild owner and Administrator may edit a server Kit" do
    creator = DiscordAccount.create!(discord_id: "creator", username: "creator")
    creator.kits.create!(@data.merge(id: @id, guild_id: "1001"))
    sign_in_as(@account)
    with_guild(owner_id: @account.discord_id) do
      get "/api/v1/kits/#{@id}"
      assert_equal true, response.parsed_body.dig("kit", "can_edit")
    end
    with_guild(member_roles: [ "3001" ], role_permissions: (1 << 3)) do
      get "/api/v1/kits/#{@id}"
      assert_equal true, response.parsed_body.dig("kit", "can_edit")
    end
  end

  test "losing an administrator role removes edit permission on the next request" do
    creator = DiscordAccount.create!(discord_id: "creator", username: "creator")
    creator.kits.create!(@data.merge(id: @id, guild_id: "1001"))
    sign_in_as(@account)
    with_guild(member_roles: [ "3001" ], role_permissions: (1 << 5)) do
      get "/api/v1/kits/#{@id}"
      assert_equal true, response.parsed_body.dig("kit", "can_edit")
    end
    with_guild(member_roles: []) do
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision: 0, name: "Unauthorized") }, as: :json
      assert_response :not_found
      assert_equal "Welcome", Kit.find(@id).name
    end
  end

  test "an arbitrary selected context cannot change a Kit's ownership or authorize another guild" do
    creator = DiscordAccount.create!(discord_id: "creator", username: "creator")
    creator.kits.create!(@data.merge(id: @id, guild_id: "2002"))
    sign_in_as(@account)
    with_guild do
      get "/api/v1/kits", params: { context_id: "1001" }
      assert_response :success
      get "/api/v1/kits/#{@id}"
      assert_response :not_found
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision: 0) }, as: :json
      assert_response :not_found
    end
  end

  test "server ownership cannot be reassigned and stale revisions do not overwrite or delete" do
    with_guild do
      sign_in_as(@account)
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(guild_id: "1001", creator_id: "someone") }, as: :json
      assert_response :bad_request
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(guild_id: "1001") }, as: :json
      assert_response :success
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(guild_id: "2002", revision: 0) }, as: :json
      assert_response :bad_request
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision: 0, name: "First edit") }, as: :json
      assert_response :success
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision: 0, name: "Stale edit") }, as: :json
      assert_response :conflict
      assert_equal "kit_conflict", response.parsed_body.fetch("code")
      delete "/api/v1/kits/#{@id}", params: { revision: 0 }
      assert_response :conflict
      assert_equal "First edit", Kit.find(@id).name
    end
  end

  test "management authorization is required but bot installation is optional for Kits" do
    @account.kits.create!(@data.merge(id: @id, guild_id: "1001"))
    sign_in_as(@account)
    with_guild(member_present: false) do
      get "/api/v1/kits/#{@id}"
      assert_response :not_found
      get "/api/v1/kits", params: { context_id: "1001" }
      assert_response :not_found
    end
    with_guild(bot_present: false) do
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(revision: 0) }, as: :json
      assert_response :success
    end
    @account.discord_authorization.update!(scopes: "identify")
    get "/api/v1/kits/#{@id}"
    assert_response :unauthorized
  end

  test "Discord rate limits delay server Kit access without exposing content" do
    @account.kits.create!(@data.merge(id: @id, guild_id: "1001"))
    sign_in_as(@account)
    original = DiscordContexts.method(:access!)
    DiscordContexts.define_singleton_method(:access!) { |*, **| raise DiscordApi::RateLimited.new(retry_after: 7) }
    get "/api/v1/kits/#{@id}"
    assert_response :too_many_requests
    assert_equal "7", response.headers["Retry-After"]
    refute response.parsed_body.key?("kit")
  ensure
    DiscordContexts.define_singleton_method(:access!, original) if original
  end

  test "server and personal lists are isolated even when a different context was selected" do
    personal_id = SecureRandom.uuid
    @account.kits.create!(@data.merge(id: personal_id))
    @account.kits.create!(@data.merge(id: @id, guild_id: "1001"))
    with_guild do
      sign_in_as(@account)
      get "/api/v1/kits"
      assert_equal [ personal_id ], response.parsed_body.fetch("kits").pluck("id")
      get "/api/v1/kits", params: { context_id: "1001" }
      assert_equal [ @id ], response.parsed_body.fetch("kits").pluck("id")
      get "/api/v1/kits/#{@id}"
      assert_response :success
      assert_equal @id, response.parsed_body.dig("kit", "id")
    end
  end

  test "limits new saves per collection without blocking edits or deleting existing Kits" do
    sign_in_as(@account)
    saved = Array.new(15) { @account.kits.create!(@data.merge(id: SecureRandom.uuid)) }
    put "/api/v1/kits/#{@id}", params: { kit: @data }, as: :json
    assert_response :unprocessable_entity
    assert_equal "kit_limit", response.parsed_body.fetch("code")
    put "/api/v1/kits/#{saved.first.id}", params: { kit: @data.merge(name: "Edited", revision: 0) }, as: :json
    assert_response :success
    delete "/api/v1/kits/#{saved.last.id}"
    assert_response :no_content
    put "/api/v1/kits/#{@id}", params: { kit: @data }, as: :json
    assert_response :success
    assert_equal 15, @account.kits.where(guild_id: nil).count
  end

  test "server capacity belongs to the guild rather than each creator" do
    creator = DiscordAccount.create!(discord_id: "other-creator")
    15.times { creator.kits.create!(@data.merge(id: SecureRandom.uuid, guild_id: "1001")) }
    sign_in_as(@account)
    with_guild do
      put "/api/v1/kits/#{@id}", params: { kit: @data.merge(guild_id: "1001") }, as: :json
      assert_response :unprocessable_entity
      assert_equal "kit_limit", response.parsed_body.fetch("code")
      put "/api/v1/kits/#{@id}", params: { kit: @data }, as: :json
      assert_response :success
      assert_equal 15, Kit.where(guild_id: "1001").count
    end
  end

  private

  def with_guild(member_roles: [ "3001" ], role_permissions: (1 << 5), member_present: true, bot_present: true, owner_id: "different-owner")
    original = DiscordApi.method(:get)
    original_bot = DiscordContexts.method(:bot_authorization)
    account_id = @account.discord_id
    guild_owner_id = owner_id
    Rails.cache.clear
    DiscordContexts.define_singleton_method(:bot_authorization) { "Bot test" }
    DiscordApi.define_singleton_method(:get) do |path, authorization:|
      if authorization.start_with?("Bearer ")
        next member_present ? [ { "id" => "1001", "owner" => guild_owner_id == account_id, "permissions" => (1024 | (member_roles.include?("3001") ? role_permissions : 0)).to_s } ] : []
      end
      raise DiscordApi::NotFound unless bot_present
      case path
      when "/guilds/1001/members/#{account_id}"
        raise DiscordApi::NotFound unless member_present
        { "user" => { "id" => account_id }, "roles" => member_roles }
      when "/guilds/2002/members/#{account_id}" then raise DiscordApi::NotFound
      when "/guilds/1001" then { "id" => "1001", "owner_id" => guild_owner_id }
      when "/guilds/1001/roles" then [
        { "id" => "1001", "permissions" => "1024" },
        { "id" => "3001", "permissions" => role_permissions.to_s }
      ]
      else raise "Unexpected Discord request: #{path}"
      end
    end
    yield
  ensure
    DiscordApi.define_singleton_method(:get, original) if original
    DiscordContexts.define_singleton_method(:bot_authorization, original_bot) if original_bot
  end
end
