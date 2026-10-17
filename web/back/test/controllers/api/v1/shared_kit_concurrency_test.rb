require "test_helper"

class Api::V1::SharedKitConcurrencyTest < ActionDispatch::IntegrationTest
  self.use_transactional_tests = false

  test "two simultaneous shared saves cannot silently overwrite each other" do
    kit = Kit.create!(name: "Concurrent copy", message: { content: "Original" }, arguments: [], placeholders: [],
      temporary_expires_at: 1.hour.from_now, management_token_digest: KitShare.digest(SecureRandom.urlsafe_base64(32)))
    share = kit.kit_shares.build(permission: "edit", audience: "anyone", expires_at: kit.temporary_expires_at)
    token = share.rotate_token!
    share.save!
    put "/api/v1/shared_kits/#{share.id}", params: { kit: { name: kit.name, message: kit.message, arguments: [], placeholders: [], revision: -1 } }, headers: { "Authorization" => "Bearer #{token}" }, as: :json
    assert_response :conflict
    start = Queue.new
    ready = Queue.new
    threads = 2.times.map do |index|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          client = ActionDispatch::Integration::Session.new(Rails.application)
          ready << true
          start.pop
          client.put "/api/v1/shared_kits/#{share.id}", params: { kit: { name: "Writer #{index}", message: { content: index.to_s }, arguments: [], placeholders: [], revision: 0 } }, headers: { "Authorization" => "Bearer #{token}" }, as: :json
          client.response.status
        end
      end
    end
    2.times { ready.pop }
    2.times { start << true }
    assert_equal [ 200, 409 ], threads.map(&:value).sort
    assert_equal 1, kit.reload.lock_version
    assert_includes %w[0 1], kit.message["content"]
  ensure
    threads&.each(&:join)
    Kit.find_by(id: kit&.id)&.destroy!
  end
end
