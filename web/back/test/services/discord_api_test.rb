require "test_helper"

class DiscordApiTest < ActiveSupport::TestCase
  Response = Struct.new(:code, :body, :headers) do
    def [](name)
      headers[name]
    end
  end

  setup do
    freeze_time
    Rails.cache.clear
    @responses = []
    @calls = 0
    @original_http = Net::HTTP.method(:start)
    test = self
    http = Object.new
    http.define_singleton_method(:request) { |_| test.send(:next_response) }
    Net::HTTP.define_singleton_method(:start) { |*, **, &block| block.call(http) }
  end

  teardown { Net::HTTP.define_singleton_method(:start, @original_http) }

  test "an exhausted successful route waits for its advertised reset without sending another request" do
    @responses << Response.new("200", "[]", { "X-RateLimit-Remaining" => "0", "X-RateLimit-Reset-After" => "3.5" })
    assert_equal [], DiscordApi.get("/users/@me/guilds?limit=200", authorization: "Bearer test-user")
    error = assert_raises(DiscordApi::RateLimited) { DiscordApi.get("/users/@me/guilds?limit=200&after=1001", authorization: "Bearer test-user") }
    assert_in_delta 3.5, error.retry_after, 0.1
    assert_equal 1, @calls
    travel 4.seconds do
      @responses << Response.new("200", "[]", {})
      assert_equal [], DiscordApi.get("/users/@me/guilds?limit=200", authorization: "Bearer test-user")
    end
    assert_equal 2, @calls
  end

  test "a global retry deadline applies to the credential but not to another account" do
    @responses << Response.new("429", '{"retry_after":12.5,"global":true}', {})
    error = assert_raises(DiscordApi::RateLimited) { DiscordApi.get("/guilds/1001", authorization: "Bot test") }
    assert_equal 12.5, error.retry_after
    assert_raises(DiscordApi::RateLimited) { DiscordApi.get("/guilds/2002/channels", authorization: "Bot test") }
    assert_equal 1, @calls
    @responses << Response.new("200", "[]", {})
    assert_equal [], DiscordApi.get("/users/@me/guilds", authorization: "Bearer another-user")
    travel 13.seconds do
      @responses << Response.new("200", "{}", {})
      assert_equal({}, DiscordApi.get("/guilds/1001", authorization: "Bot test"))
    end
    assert_equal 3, @calls
  end

  test "a route retry uses Retry-After and does not block unrelated guild routes" do
    @responses << Response.new("429", '{"retry_after":99}', { "Retry-After" => "8.25" })
    error = assert_raises(DiscordApi::RateLimited) { DiscordApi.get("/guilds/1001/channels", authorization: "Bot test") }
    assert_equal 8.25, error.retry_after
    assert_raises(DiscordApi::RateLimited) { DiscordApi.get("/guilds/1001/channels", authorization: "Bot test") }
    @responses << Response.new("200", "[]", {})
    assert_equal [], DiscordApi.get("/guilds/2002/channels", authorization: "Bot test")
    assert_equal 2, @calls
  end

  private

  def next_response
    @calls += 1
    @responses.shift || raise("Unexpected Discord HTTP request")
  end
end
