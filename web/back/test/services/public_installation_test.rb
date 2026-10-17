require "test_helper"

class PublicInstallationTest < ActiveSupport::TestCase
  setup { Rails.cache.clear }

  test "public links reuse a bounded installation check and observe removal after expiry" do
    checks = 0
    installed = true
    original = DiscordContexts.method(:installed?)
    DiscordContexts.define_singleton_method(:installed?) { |_| checks += 1; installed }
    3.times { assert DiscordContexts.public_installed?("1001") }
    assert_equal 1, checks
    installed = false
    travel 31.seconds do
      assert_not DiscordContexts.public_installed?("1001")
      assert_equal 2, checks
    end
  ensure
    DiscordContexts.define_singleton_method(:installed?, original)
  end

  test "overlapping public reads make only one Discord installation request" do
    entered = Queue.new
    release = Queue.new
    original = DiscordContexts.method(:installed?)
    DiscordContexts.define_singleton_method(:installed?) { |_| entered << true; release.pop; true }
    first = Thread.new { DiscordContexts.public_installed?("1002") }
    entered.pop
    assert_raises(DiscordApi::Unavailable) { DiscordContexts.public_installed?("1002") }
    release << true
    assert first.value
    assert DiscordContexts.public_installed?("1002")
  ensure
    release << true if first&.alive?
    first&.join
    DiscordContexts.define_singleton_method(:installed?, original)
  end

  test "rate limited installation checks retain Discord retry information and fail closed" do
    checks = 0
    original = DiscordContexts.method(:installed?)
    DiscordContexts.define_singleton_method(:installed?) { |_| checks += 1; raise DiscordApi::RateLimited.new(retry_after: 17) }
    assert_raises(DiscordApi::RateLimited) { DiscordContexts.public_installed?("1001") }
    error = assert_raises(DiscordApi::RateLimited) { DiscordContexts.public_installed?("1001") }
    assert_in_delta 17, error.retry_after, 1
    assert_equal 1, checks
    travel 18.seconds do
      assert_raises(DiscordApi::RateLimited) { DiscordContexts.public_installed?("1001") }
      assert_equal 2, checks
    end
  ensure
    DiscordContexts.define_singleton_method(:installed?, original)
  end
end
