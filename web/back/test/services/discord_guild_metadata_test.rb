require "test_helper"

class DiscordGuildMetadataTest < ActiveSupport::TestCase
  setup do
    @account = DiscordAccount.create!(discord_id: "7001", username: "author")
    @guild = { "id" => "1001", "name" => "Test server", "owner_id" => "9000", "features" => [] }
    @channels = [
      channel("2001", "general"),
      channel("2002", "private", [ { "id" => "1001", "type" => 0, "allow" => "0", "deny" => (1 << 10).to_s } ]),
      channel("2003", "staff", [ { "id" => "3001", "type" => 0, "allow" => (1 << 10).to_s, "deny" => "0" } ])
    ]
    @roles = [
      { "id" => "1001", "name" => "@everyone", "permissions" => (1 << 10).to_s, "position" => 0 },
      { "id" => "3001", "name" => "Staff", "permissions" => "0", "position" => 1 }
    ]
  end

  test "first read saves complete metadata and later read uses the snapshot" do
    calls = []
    with_discord(calls:) do
      first = DiscordGuildMetadata.read(@account, "1001")
      assert_equal "current", first[:status]
      assert_equal %w[general staff], first[:channels].map { |channel| channel.fetch("name") }
      assert_equal %w[@everyone Staff], first[:roles].map { |role| role.fetch("name") }
      assert_equal [ "/guilds/1001", "/guilds/1001/channels" ], calls
      assert_equal 2, DiscordGuildSnapshot.find_by!(guild_id: "1001").format_version

      calls.clear
      assert_equal "current", DiscordGuildMetadata.read(@account, "1001")[:status]
      assert_empty calls
    end
  end

  test "stale snapshot is refreshed and a partial failure keeps the last complete copy" do
    calls = []
    with_discord(calls:) do
      DiscordGuildMetadata.read(@account, "1001")
      snapshot = DiscordGuildSnapshot.find_by!(guild_id: "1001")
      original = snapshot.payload.deep_dup
      snapshot.update!(fetched_at: 20.minutes.ago)
      DiscordGuildMetadata.read(@account, "1001")
      assert_equal "current", snapshot.reload.stale? ? "stale" : "current"
      snapshot.update!(fetched_at: 20.minutes.ago)

      failing = DiscordApi.method(:get)
      DiscordApi.define_singleton_method(:get) do |path, authorization:|
        raise DiscordApi::Unavailable if path.end_with?("/channels")

        failing.call(path, authorization:)
      end
      result = DiscordGuildMetadata.read(@account, "1001")
      assert_equal "stale", result[:status]
      assert_equal "unavailable", result[:error]
      assert_empty result[:channels]
      assert_equal original, snapshot.reload.payload
      assert snapshot.retry_in.positive?
    ensure
      DiscordApi.define_singleton_method(:get, failing) if failing
    end
  end

  test "cached guild emoji are filtered against current member roles" do
    @guild["emojis"] = [
      { "id" => "101", "name" => "wave", "roles" => [], "animated" => true },
      { "id" => "102", "name" => "staff", "roles" => [ "3001" ] },
      { "id" => "103", "name" => "unavailable", "roles" => [], "available" => false }
    ]
    calls = []
    with_discord(calls:) do
      assert_equal %w[101 102], DiscordGuildMetadata.read(@account, "1001")[:emojis].pluck("id")
    end
    calls.clear
    with_discord(calls:, roles: []) do
      result = DiscordGuildMetadata.read(@account, "1001")
      assert_equal [ "101" ], result[:emojis].pluck("id")
      assert result[:emojis].first["animated"]
      assert_empty calls
    end
  end

  test "manual refresh has a durable cooldown and rate limits preserve the snapshot" do
    member_calls = []
    with_discord(member_calls:) do
      DiscordGuildMetadata.read(@account, "1001")
      DiscordGuildMetadata.read(@account, "1001", manual: true)
      member_calls.clear
      result = DiscordGuildMetadata.read(@account, "1001", manual: true)
      assert result[:cooldown]
      assert result[:retry_after].positive?
      assert_empty member_calls

      snapshot = DiscordGuildSnapshot.find_by!(guild_id: "1001")
      snapshot.update!(last_manual_at: 2.minutes.ago)
      before = snapshot.payload.deep_dup
      original = DiscordApi.method(:get)
      DiscordApi.define_singleton_method(:get) do |path, authorization:|
        raise DiscordApi::RateLimited.new(retry_after: 12) if path.end_with?("/channels")

        original.call(path, authorization:)
      end
      result = DiscordGuildMetadata.read(@account, "1001", manual: true)
      assert_equal "rate_limited", result[:error]
      assert_operator result[:retry_after], :>=, 12
      assert_equal before, snapshot.reload.payload
    ensure
      DiscordApi.define_singleton_method(:get, original) if original
    end
  end

  test "overlapping claims do not start two Discord synchronizations" do
    snapshot = DiscordGuildSnapshot.for_guild("1001")
    claim = snapshot.claim!(manual: false)
    assert_kind_of String, claim
    assert_equal :updating, snapshot.claim!(manual: false)
    snapshot.finish!(claim, payload: { "guild" => @guild, "channels" => @channels, "roles" => @roles })
    assert_equal :fresh, snapshot.claim!(manual: false)
  end

  test "waiting for the first snapshot does not repeat Discord permission requests without a catalog to return" do
    snapshot = DiscordGuildSnapshot.for_guild("1001")
    snapshot.claim!(manual: false)
    calls = []
    member_calls = []
    with_discord(calls:, member_calls:) do
      3.times do
        result = DiscordGuildMetadata.read(@account, "1001")
        assert_equal "updating", result[:status]
        refute result.key?(:channels)
      end
      assert_empty calls
      assert_empty member_calls
    end
  end

  test "simultaneous requests claim only one synchronization lease" do
    DiscordGuildSnapshot.for_guild("1001")
    start = Queue.new
    threads = 2.times.map do
      Thread.new do
        start.pop
        DiscordGuildSnapshot.find_by!(guild_id: "1001").claim!(manual: false)
      end
    end
    2.times { start << true }
    results = threads.map(&:value)
    assert_equal 1, results.count { |value| value.is_a?(String) }
    assert_equal 1, results.count(:updating)
  end

  test "unknown roles fail closed and a permitted role can expose a channel" do
    with_discord(roles: [ "3001" ]) do
      result = DiscordGuildMetadata.read(@account, "1001")
      assert_equal %w[general staff], result[:channels].map { |channel| channel.fetch("name") }
    end
    DiscordGuildSnapshot.find_by!(guild_id: "1001").update!(fetched_at: 20.minutes.ago)
    with_discord(roles: [ "9999" ]) do
      assert_empty DiscordGuildMetadata.read(@account, "1001")[:channels]
    end
  end

  test "member overwrite can restore a channel denied to everyone" do
    @channels[1]["permission_overwrites"] << { "id" => "7001", "type" => 1, "allow" => "1024", "deny" => "0" }
    with_discord(roles: []) do
      names = DiscordGuildMetadata.read(@account, "1001")[:channels].map { |channel| channel.fetch("name") }
      assert_includes names, "private"
    end
  end

  test "role overwrites combine denies and allows before member overwrites" do
    @roles << { "id" => "3002", "name" => "Readers", "permissions" => "0", "position" => 2 }
    @channels << channel("2004", "mixed", [
      { "id" => "3001", "type" => 0, "allow" => "0", "deny" => "1024" },
      { "id" => "3002", "type" => 0, "allow" => "1024", "deny" => "0" }
    ])
    with_discord(roles: %w[3001 3002]) do
      names = DiscordGuildMetadata.read(@account, "1001")[:channels].pluck("name")
      assert_includes names, "mixed"
    end
    @channels.last["permission_overwrites"] << { "id" => "7001", "type" => 1, "allow" => "0", "deny" => "1024" }
    DiscordGuildSnapshot.find_by!(guild_id: "1001").update!(fetched_at: 20.minutes.ago)
    with_discord(roles: %w[3001 3002]) do
      refute_includes DiscordGuildMetadata.read(@account, "1001")[:channels].pluck("name"), "mixed"
    end
  end

  test "fresh membership changes immediately filter a cached channel snapshot" do
    @channels.last["permission_overwrites"].unshift({ "id" => "1001", "type" => 0, "allow" => "0", "deny" => "1024" })
    with_discord(roles: [ "3001" ]) do
      assert_includes DiscordGuildMetadata.read(@account, "1001")[:channels].pluck("name"), "staff"
    end
    with_discord(roles: []) do
      refute_includes DiscordGuildMetadata.read(@account, "1001")[:channels].pluck("name"), "staff"
    end
  end

  test "guild owner and administrator can view channels despite overwrites" do
    @channels << channel("2004", "locked", [ { "id" => "1001", "type" => 0, "allow" => "0", "deny" => "1024" } ])
    @guild["owner_id"] = "7001"
    with_discord(roles: []) do
      assert_includes DiscordGuildMetadata.read(@account, "1001")[:channels].pluck("name"), "locked"
    end
    @guild["owner_id"] = "9000"
    @roles.first["permissions"] = (1 << 3).to_s
    DiscordGuildSnapshot.find_by!(guild_id: "1001").update!(fetched_at: 20.minutes.ago)
    with_discord(roles: []) do
      assert_includes DiscordGuildMetadata.read(@account, "1001")[:channels].pluck("name"), "locked"
    end
  end

  test "incomplete permission data does not publish private channel names" do
    @channels.first["permission_overwrites"] = [ { "id" => "1001", "type" => 0, "allow" => "1024" } ]
    with_discord(roles: []) do
      refute_includes DiscordGuildMetadata.read(@account, "1001")[:channels].pluck("name"), "general"
    end
  end

  test "late synchronization cannot overwrite a newer snapshot" do
    snapshot = DiscordGuildSnapshot.for_guild("1001")
    old_id = snapshot.claim!(manual: false)
    snapshot.update!(refresh_started_at: 40.seconds.ago)
    new_id = snapshot.claim!(manual: false)
    refute_equal old_id, new_id
    newer = { "guild" => @guild.merge("name" => "New"), "channels" => @channels, "roles" => @roles }
    snapshot.finish!(new_id, payload: newer)
    snapshot.finish!(old_id, payload: newer.merge("guild" => @guild.merge("name" => "Old")))
    assert_equal "New", snapshot.reload.payload.dig("guild", "name")
  end

  test "a successful refresh replaces deleted channels and roles atomically" do
    with_discord do
      DiscordGuildMetadata.read(@account, "1001")
    end
    snapshot = DiscordGuildSnapshot.find_by!(guild_id: "1001")
    snapshot.update!(fetched_at: 20.minutes.ago)
    @channels = [ channel("2001", "general") ]
    @roles = [ @roles.first ]
    with_discord(roles: []) do
      result = DiscordGuildMetadata.read(@account, "1001")
      assert_equal [ "general" ], result[:channels].map { |channel| channel.fetch("name") }
      assert_equal [ "@everyone" ], result[:roles].map { |role| role.fetch("name") }
      assert_equal 1, snapshot.reload.payload.fetch("channels").length
    end
  end

  test "bot credential failures withhold catalogs without deleting a valid snapshot" do
    with_discord do
      DiscordGuildMetadata.read(@account, "1001")
      [ DiscordApi::Unauthorized, DiscordContexts::BotNotConfigured ].each do |failure|
        DiscordContexts.define_singleton_method(:member!) { |*, **| raise failure }
        result = DiscordGuildMetadata.read(@account, "1001")
        assert_equal "unavailable", result[:status]
        assert_equal "unavailable", result[:error]
        assert_empty result[:channels]
        assert_empty result[:roles]
        assert_empty result[:emojis]
        assert DiscordGuildSnapshot.find_by!(guild_id: "1001").payload.present?
      end
    end
  end

  private

  def channel(id, name, overwrites = [])
    { "id" => id, "name" => name, "type" => 0, "parent_id" => nil, "position" => id.to_i, "permission_overwrites" => overwrites }
  end

  def with_discord(calls: nil, roles: [ "3001" ], member_calls: nil)
    original_access = DiscordContexts.method(:access!)
    DiscordContexts.define_singleton_method(:access!) { |*, **| { "id" => "1001" } }
    original_member = DiscordContexts.method(:member!)
    original_bot = DiscordContexts.method(:bot_authorization)
    original_get = DiscordApi.method(:get)
    guild = @guild
    channels = @channels
    guild_roles = @roles
    DiscordContexts.define_singleton_method(:member!) do |_, _|
      member_calls << true if member_calls
      { "user" => { "id" => "7001" }, "roles" => roles }
    end
    DiscordContexts.define_singleton_method(:bot_authorization) { "Bot test" }
    DiscordApi.define_singleton_method(:get) do |path, authorization:|
      calls << path if calls
      case path
      when "/guilds/1001" then guild.merge("roles" => guild_roles, "emojis" => guild.fetch("emojis", []))
      when "/guilds/1001/channels" then channels
      else raise "unexpected path: #{path}"
      end
    end
    yield
  ensure
    DiscordContexts.define_singleton_method(:access!, original_access) if original_access
    DiscordContexts.define_singleton_method(:member!, original_member) if original_member
    DiscordContexts.define_singleton_method(:bot_authorization, original_bot) if original_bot
    DiscordApi.define_singleton_method(:get, original_get) if original_get
  end
end
