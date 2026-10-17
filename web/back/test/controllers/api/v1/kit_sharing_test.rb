require "test_helper"

class Api::V1::KitSharingTest < ActionDispatch::IntegrationTest
  setup do
    @owner = DiscordAccount.create!(discord_id: "share-owner", username: "owner")
    @other = DiscordAccount.create!(discord_id: "share-other", username: "other")
    @data = { name: "Event", message: { content: "Hello {guild.name}" }, arguments: [], placeholders: [] }
    @kit = @owner.kits.create!(@data)
  end

  test "personal links default to viewing without changing canonical authorization or ownership" do
    sign_in_as(@owner)
    link = create_link
    visitor = open_session
    visitor.get "/api/v1/shared_kits/#{link.fetch('share').fetch('id')}", headers: bearer(link.fetch("token"))
    assert_equal 200, visitor.response.status
    assert_equal false, visitor.response.parsed_body.dig("kit", "can_edit")
    assert_equal @kit.id, visitor.response.parsed_body.dig("kit", "id")
    assert_nil visitor.response.parsed_body.dig("kit", "creator_id")
    assert_equal "private, no-store", visitor.response.headers["Cache-Control"]
    assert_equal "no-referrer", visitor.response.headers["Referrer-Policy"]
    visitor.get "/api/v1/kits/#{@kit.id}", headers: bearer(link.fetch("token"))
    assert_equal 401, visitor.response.status
    assert_equal @owner.id, @kit.reload.discord_account_id
    refute_includes KitShare.find(link.fetch("share").fetch("id")).attributes.values, link.fetch("token")
    assert_equal "kit.share", @owner.audit_events.last.action
  end

  test "view links reject mutations and editing links require the current revision" do
    sign_in_as(@owner)
    link = create_link
    path = "/api/v1/shared_kits/#{link.fetch('share').fetch('id')}"
    visitor = open_session
    visitor.put path, params: { kit: @data.merge(revision: 0, name: "No") }, headers: bearer(link.fetch("token")), as: :json
    assert_equal 404, visitor.response.status
    patch "/api/v1/kits/#{@kit.id}/shares/#{link.fetch('share').fetch('id')}", params: { share: { permission: "edit" } }, as: :json
    assert_response :success
    visitor.put path, params: { kit: @data.merge(revision: 0, name: "Changed") }, headers: bearer(link.fetch("token")), as: :json
    assert_equal 200, visitor.response.status
    assert_equal 1, visitor.response.parsed_body.dig("kit", "revision")
    visitor.put path, params: { kit: @data.merge(revision: 0, name: "Stale") }, headers: bearer(link.fetch("token")), as: :json
    assert_equal 409, visitor.response.status
    assert_equal "Changed", @kit.reload.name
    put "/api/v1/kits/#{@kit.id}", params: { kit: @data.merge(name: "Unversioned owner write") }, as: :json
    assert_response :conflict
    assert_equal "Changed", @kit.reload.name
    visitor.put path, params: { kit: @data.merge(name: "No revision") }, headers: bearer(link.fetch("token")), as: :json
    assert_equal 409, visitor.response.status
    visitor.put path, params: { kit: @data.merge(revision: 1, guild_id: "1001") }, headers: bearer(link.fetch("token")), as: :json
    assert_equal 400, visitor.response.status
    visitor.put path, params: { kit: @data.merge(revision: 1, creator_id: @other.id) }, headers: bearer(link.fetch("token")), as: :json
    assert_equal 400, visitor.response.status
    visitor.post "/api/v1/kits/#{@kit.id}/shares", params: { share: {} }, headers: bearer(link.fetch("token")), as: :json
    assert_equal 401, visitor.response.status
    visitor.delete "/api/v1/kits/#{@kit.id}", headers: bearer(link.fetch("token"))
    assert_equal 401, visitor.response.status
  end

  test "permission changes rotation expiration and revocation take effect on every request" do
    sign_in_as(@owner)
    link = create_link(permission: "edit", lifetime_hours: 1)
    id = link.fetch("share").fetch("id")
    path = "/api/v1/shared_kits/#{id}"
    patch "/api/v1/kits/#{@kit.id}/shares/#{id}", params: { share: { permission: "view" } }, as: :json
    put path, params: { kit: @data.merge(revision: 0) }, headers: bearer(link.fetch("token")), as: :json
    assert_response :not_found
    post "/api/v1/kits/#{@kit.id}/shares/#{id}/regenerate", as: :json
    assert_response :success
    replacement = response.parsed_body.fetch("token")
    get path, headers: bearer(link.fetch("token"))
    assert_response :not_found
    get path, headers: bearer(replacement)
    assert_response :success
    travel 2.hours do
      get path, headers: bearer(replacement)
      assert_response :not_found
    end
    revoked = create_link
    id = revoked.dig("share", "id")
    delete "/api/v1/kits/#{@kit.id}/shares/#{id}"
    assert_response :no_content
    get "/api/v1/shared_kits/#{id}", headers: bearer(revoked.fetch("token"))
    assert_response :not_found
  end

  test "a token cannot be substituted across Kits or used to manage links" do
    sign_in_as(@owner)
    first = create_link
    second_kit = @owner.kits.create!(@data)
    post "/api/v1/kits/#{second_kit.id}/shares", params: { share: {} }, as: :json
    second = response.parsed_body
    get "/api/v1/shared_kits/#{second.fetch('share').fetch('id')}", headers: bearer(first.fetch("token"))
    assert_response :not_found
    patch "/api/v1/kits/#{second_kit.id}/shares/#{first.fetch('share').fetch('id')}", params: { share: { permission: "edit" } }, as: :json
    assert_response :not_found
    delete "/api/v1/auth/session"
    sign_in_as(@other)
    get "/api/v1/kits/#{@kit.id}/shares", headers: bearer(first.fetch("token"))
    assert_response :not_found
    post "/api/v1/kits/#{@kit.id}/shares", params: { share: {} }, as: :json
    assert_response :not_found
  end

  test "invalid tokens never disclose whether a share exists and lists never return secrets" do
    sign_in_as(@owner)
    link = create_link
    id = link.fetch("share").fetch("id")
    [ nil, "wrong", SecureRandom.urlsafe_base64(32) ].each do |token|
      get "/api/v1/shared_kits/#{id}", headers: token ? bearer(token) : {}
      assert_response :not_found
      assert_nil response.parsed_body["kit"]
    end
    get "/api/v1/kits/#{@kit.id}/shares"
    assert_response :success
    refute_includes response.body, link.fetch("token")
    refute_includes response.body, "token_digest"
  end

  test "server links default to members and check live membership and installation without metadata" do
    @kit.update!(guild_id: "1001")
    with_members do
      sign_in_as(@owner)
      link = create_link(permission: "edit")
      assert_equal "members", link.dig("share", "audience")
      path = "/api/v1/shared_kits/#{link.fetch('share').fetch('id')}"
      visitor = open_session
      visitor.get path, headers: bearer(link.fetch("token"))
      assert_equal 401, visitor.response.status
      delete "/api/v1/auth/session"
      sign_in_as(@other)
      get path, headers: bearer(link.fetch("token"))
      assert_response :success
      assert_nil response.parsed_body.dig("kit", "guild_id")
      get "/api/v1/kits/#{@kit.id}"
      assert_equal false, response.parsed_body.dig("kit", "can_edit")
      put path, params: { kit: @data.merge(revision: @kit.reload.lock_version, name: "Member edit") }, headers: bearer(link.fetch("token")), as: :json
      assert_response :success
      get "/api/v1/kits/#{@kit.id}/shares", headers: bearer(link.fetch("token"))
      assert_response :not_found
      @membership = false
      get path, headers: bearer(link.fetch("token"))
      assert_response :not_found
      @membership = true
      @bot = false
      get path, headers: bearer(link.fetch("token"))
      assert_response :not_found
    end
  end

  test "public server links grant content access but never guild metadata or management" do
    @kit.update!(guild_id: "1001")
    with_members do
      sign_in_as(@owner)
      link = create_link(audience: "anyone", permission: "edit")
      visitor = open_session
      visitor.get "/api/v1/shared_kits/#{link.fetch('share').fetch('id')}", headers: bearer(link.fetch("token"))
      assert_equal 200, visitor.response.status
      assert_equal %w[arguments can_edit id message name placeholders revision], visitor.response.parsed_body.fetch("kit").keys.sort
      visitor.get "/api/v1/contexts/1001/metadata", headers: bearer(link.fetch("token"))
      assert_equal 401, visitor.response.status
      @bot = false
      travel 31.seconds do
        visitor.get "/api/v1/shared_kits/#{link.fetch('share').fetch('id')}", headers: bearer(link.fetch("token"))
        assert_equal 404, visitor.response.status
      end
      @bot = true
      @admin = true
      delete "/api/v1/auth/session"
      sign_in_as(@other)
      get "/api/v1/kits/#{@kit.id}/shares"
      assert_response :success
    end
  end

  test "temporary copies are independent bounded Kits with separate management capabilities" do
    created = temporary_copy
    kit_id = created.dig("kit", "id")
    id = created.dig("share", "id")
    assert_nil Kit.find(kit_id).discord_account_id
    assert_equal 24.hours.from_now.to_i, Time.parse(created.fetch("expires_at")).to_i
    assert_equal "view", created.dig("share", "permission")
    assert_equal "Event", @kit.reload.name
    manager = bearer(created.fetch("management_token"))
    token = bearer(created.fetch("token"))
    get "/api/v1/temporary_kits/#{kit_id}", headers: token
    assert_response :not_found
    get "/api/v1/temporary_kits/#{kit_id}/shares", headers: manager
    assert_response :success
    put "/api/v1/temporary_kits/#{kit_id}", params: { kit: @data.merge(name: "Copy edit", revision: 0) }, headers: manager, as: :json
    assert_response :success
    assert_equal "Event", @kit.reload.name
    get "/api/v1/shared_kits/#{id}", headers: token
    assert_equal "Copy edit", response.parsed_body.dig("kit", "name")
    get "/api/v1/shared_kits/#{id}", headers: manager
    assert_response :not_found
    delete "/api/v1/temporary_kits/#{kit_id}", headers: token
    assert_response :not_found
    delete "/api/v1/temporary_kits/#{kit_id}", headers: manager
    assert_response :no_content
    assert_not KitShare.exists?(id)
  end

  test "temporary editing is explicit and uses revision protection without escalating privileges" do
    copy = temporary_copy(permission: "edit", lifetime_hours: 1)
    path = "/api/v1/shared_kits/#{copy.dig('share', 'id')}"
    token = bearer(copy.fetch("token"))
    put path, params: { kit: @data.merge(revision: 0, name: "Guest edit") }, headers: token, as: :json
    assert_response :success
    put path, params: { kit: @data.merge(revision: 0, name: "Stale guest") }, headers: token, as: :json
    assert_response :conflict
    post "/api/v1/temporary_kits/#{copy.dig('kit', 'id')}/shares", params: { share: { permission: "edit" } }, headers: token, as: :json
    assert_response :not_found
    assert_equal "Guest edit", Kit.find(copy.dig("kit", "id")).name
    travel 2.hours do
      get path, headers: token
      assert_response :not_found
      get "/api/v1/temporary_kits/#{copy.dig('kit', 'id')}", headers: bearer(copy.fetch("management_token"))
      assert_response :not_found
      Kit.prune_temporary!
      assert_not Kit.exists?(copy.dig("kit", "id"))
      assert_not KitShare.exists?(copy.dig("share", "id"))
      assert Kit.exists?(@kit.id)
    end
  end

  test "temporary data rejects ownership fields malformed payloads and excessive lifetimes" do
    before = Kit.where.not(temporary_expires_at: nil).count
    [ @data.merge(guild_id: "1001"), @data.merge(creator_id: @owner.id), @data.merge(revision: 0) ].each do |data|
      post "/api/v1/temporary_kits", params: { kit: data }, as: :json
      assert_response :bad_request
    end
    post "/api/v1/temporary_kits", params: { kit: @data, lifetime_hours: 999 }, as: :json
    assert_response :bad_request
    post "/api/v1/temporary_kits", params: { kit: @data.merge(message: { content: "x" * 256.kilobytes }) }, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/temporary_kits", params: { kit: @data.merge(message: []) }, as: :json
    assert_response :unprocessable_entity
    assert_equal before, Kit.where.not(temporary_expires_at: nil).count
  end

  test "temporary links cannot outlive the copy and cannot restrict to a nonexistent server" do
    copy = temporary_copy(lifetime_hours: 1)
    path = "/api/v1/temporary_kits/#{copy.dig('kit', 'id')}/shares"
    manager = bearer(copy.fetch("management_token"))
    patch "#{path}/#{copy.dig('share', 'id')}", params: { share: { lifetime_hours: 0, permission: "edit" } }, headers: manager, as: :json
    assert_response :success
    assert_equal Time.parse(copy.fetch("expires_at")), Time.parse(response.parsed_body.dig("share", "expires_at"))
    post path, params: { share: { audience: "members" } }, headers: manager, as: :json
    assert_response :unprocessable_entity
  end

  test "anonymous mutations still require CSRF protection" do
    previous = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    post "/api/v1/temporary_kits", params: { kit: @data }, as: :json
    assert_response :unprocessable_entity
    get "/api/v1/csrf"
    csrf = response.parsed_body.fetch("token")
    post "/api/v1/temporary_kits", params: { kit: @data }, headers: { "X-CSRF-Token" => csrf }, as: :json
    assert_response :created
  ensure
    ActionController::Base.allow_forgery_protection = previous
  end

  test "temporary creation and repeated token guessing have server-side limits" do
    10.times { temporary_copy }
    assert_no_difference("Kit.count") do
      post "/api/v1/temporary_kits", params: { kit: @data }, as: :json
    end
    assert_response :too_many_requests
    assert_equal "3600", response.headers["Retry-After"]

    120.times { get "/api/v1/shared_kits/#{SecureRandom.uuid}", headers: bearer(SecureRandom.urlsafe_base64(32)) }
    get "/api/v1/shared_kits/#{SecureRandom.uuid}"
    assert_response :too_many_requests
    assert_equal "60", response.headers["Retry-After"]
    assert_nil response.parsed_body["kit"]
  end

  test "an account with expired guild consent cannot use a member link" do
    @kit.update!(guild_id: "1001")
    with_members do
      sign_in_as(@owner)
      @restricted_link = create_link
    end
    @owner.discord_authorization.destroy!
    get "/api/v1/shared_kits/#{@restricted_link.dig('share', 'id')}", headers: bearer(@restricted_link.fetch("token"))
    assert_response :unauthorized
    assert_equal "authorization_required", response.parsed_body["code"]
    assert_nil response.parsed_body["kit"]
  end

  private

  def bearer(token)
    { "Authorization" => "Bearer #{token}" }
  end

  def create_link(**settings)
    post "/api/v1/kits/#{@kit.id}/shares", params: { share: settings }, as: :json
    assert_response :created
    response.parsed_body
  end

  def temporary_copy(**settings)
    post "/api/v1/temporary_kits", params: { kit: @data, **settings }, as: :json
    assert_response :created
    response.parsed_body
  end

  def with_members
    original_member = DiscordContexts.method(:member!)
    original_admin = DiscordContexts.method(:guild_admin?)
    original_installed = DiscordContexts.method(:installed?)
    @membership = true
    @bot = true
    @admin = false
    controller_test = self
    DiscordContexts.define_singleton_method(:member!) do |account, guild_id|
      raise DiscordApi::NotFound unless guild_id == "1001" && controller_test.instance_variable_get(:@membership) && controller_test.instance_variable_get(:@bot)
      { "user" => { "id" => account.discord_id }, "roles" => [] }
    end
    DiscordContexts.define_singleton_method(:guild_admin?) { |*| controller_test.instance_variable_get(:@admin) }
    DiscordContexts.define_singleton_method(:installed?) { |_| controller_test.instance_variable_get(:@bot) }
    yield
  ensure
    DiscordContexts.define_singleton_method(:member!, original_member)
    DiscordContexts.define_singleton_method(:guild_admin?, original_admin)
    DiscordContexts.define_singleton_method(:installed?, original_installed)
  end
end
