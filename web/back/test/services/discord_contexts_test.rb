require "test_helper"

class DiscordContextsTest < ActiveSupport::TestCase
  setup { Rails.cache.clear }

  test "concurrent cold installation checks share one Discord request" do
    original_api = DiscordApi.method(:get)
    original_bot = DiscordContexts.method(:bot_authorization)
    DiscordContexts.define_singleton_method(:bot_authorization) { "Bot test" }
    started = Queue.new
    release = Queue.new
    calls = 0
    DiscordApi.define_singleton_method(:get) do |*, **|
      calls += 1
      started << true
      release.pop
      { "id" => "1001" }
    end
    first = Thread.new { DiscordContexts.installed?("1001", fresh: false) }
    started.pop
    second = Thread.new { DiscordContexts.installed?("1001", fresh: false) }
    Timeout.timeout(2) { Thread.pass until second.status == "sleep" }
    2.times { release << true }
    assert first.value
    assert second.value
    assert_equal 1, calls
  ensure
    2.times { release << true } if release
    first&.join
    second&.join
    DiscordApi.define_singleton_method(:get, original_api) if original_api
    DiscordContexts.define_singleton_method(:bot_authorization, original_bot) if original_bot
  end
end
