require "test_helper"

class Api::V1::KitCapacityTest < ActionDispatch::IntegrationTest
  self.use_transactional_tests = false

  [ false, true ].each do |server|
    test "concurrent #{server ? 'server' : 'personal'} saves cannot take the same last slot" do
      accounts = Array.new(2) { DiscordAccount.create!(discord_id: SecureRandom.random_number(10**18).to_s) }
      guild_id = server ? SecureRandom.random_number(10**18).to_s : nil
      data = { name: "Event", arguments: [], placeholders: [], message: { content: "Welcome" } }
      14.times { accounts.first.kits.create!(data.merge(guild_id:)) }
      clients = accounts.map do |account|
        reset!
        sign_in_as(server ? account : accounts.first)
        cookie = cookies.for(URI("http://www.example.com/"))
        [ ActionDispatch::Integration::Session.new(Rails.application), cookie ]
      end
      original = DiscordContexts.method(:access!)
      DiscordContexts.define_singleton_method(:access!) { |*, **| { "id" => guild_id, "permissions" => "32" } } if server
      ready = Queue.new
      start = Queue.new
      threads = clients.map do |client, cookie|
        Thread.new do
          ActiveRecord::Base.connection_pool.with_connection do
            ready << true
            start.pop
            client.put "/api/v1/kits/#{SecureRandom.uuid}", params: { kit: server ? data.merge(guild_id:) : data }, headers: { "Cookie" => cookie }, as: :json
            client.response.status
          end
        end
      end
      2.times { ready.pop }
      2.times { start << true }
      statuses = threads.map(&:value)
      assert_equal 1, statuses.count(200), statuses.inspect
      assert statuses.all? { |status| [ 200, 422, 503 ].include?(status) }, statuses.inspect
      collection = server ? Kit.where(guild_id:) : accounts.first.kits.where(guild_id: nil)
      assert_equal 15, collection.count
    ensure
      threads&.each(&:join)
      DiscordContexts.define_singleton_method(:access!, original) if original
      accounts&.each(&:destroy!)
    end
  end
end
