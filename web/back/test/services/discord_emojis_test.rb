require "test_helper"

class DiscordEmojisTest < ActiveSupport::TestCase
  setup { Rails.cache.clear }

  test "keeps available emoji for matching roles and strips member information" do
    emojis = DiscordEmojis.capture([
      { "id" => "101", "name" => "wave", "roles" => [], "animated" => true, "user" => { "id" => "900" } },
      { "id" => "102", "name" => "staff", "roles" => [ "300" ] },
      { "id" => "103", "name" => "boost_lost", "roles" => [], "available" => false },
      { "id" => "104", "name" => "malformed", "roles" => "everyone" }
    ])
    assert_equal %w[101 102], DiscordEmojis.visible(emojis, [ "300" ]).pluck("id")
    assert_equal [ "101" ], DiscordEmojis.visible(emojis, []).pluck("id")
    assert_empty DiscordEmojis.visible(emojis, nil)
    refute emojis.to_s.include?("900")
    assert DiscordEmojis.visible(emojis, []).first["animated"]
  end

  test "public built-ins are cached and omit role-restricted emoji" do
    original = DiscordApi.method(:get)
    token = DiscordContexts.method(:bot_authorization)
    previous = ENV["DISCORD_EMOJI_GUILD_ID"]
    ENV["DISCORD_EMOJI_GUILD_ID"] = "1001"
    DiscordContexts.define_singleton_method(:bot_authorization) { "Bot test" }
    calls = []
    DiscordApi.define_singleton_method(:get) do |path, **|
      calls << path
      [ { "id" => "101", "name" => "wave", "animated" => true, "roles" => [] }, { "id" => "102", "name" => "private", "roles" => [ "300" ] } ]
    end
    3.times { assert_equal [ "101" ], DiscordEmojis.built_in.pluck("id") }
    assert_equal [ "/guilds/1001/emojis" ], calls
    travel 16.minutes do
      DiscordApi.define_singleton_method(:get) { |*, **| raise DiscordApi::RateLimited.new(retry_after: 120) }
      assert_empty DiscordEmojis.built_in
      DiscordApi.define_singleton_method(:get) { |*, **| flunk "Retried during Discord cooldown" }
      assert_empty DiscordEmojis.built_in
    end
  ensure
    ENV["DISCORD_EMOJI_GUILD_ID"] = previous
    DiscordApi.define_singleton_method(:get, original) if original
    DiscordContexts.define_singleton_method(:bot_authorization, token) if token
  end
end
