require "test_helper"

class AuditEventTest < ActiveSupport::TestCase
  test "records only the small set of security-relevant actions" do
    account = DiscordAccount.create!(discord_id: "audit-account", username: "author")
    event = AuditEvent.record!(
      account:,
      action: "kit.create",
      request_id: "request-123",
      target_type: "Kit",
      target_id: SecureRandom.uuid
    )

    assert_equal account, event.discord_account
    assert_equal "kit.create", event.action
    assert_equal "request-123", event.request_id
    assert_not AuditEvent.new(discord_account: account, action: "anything").valid?
  end

  test "prunes only events older than the retention boundary" do
    account = DiscordAccount.create!(discord_id: "audit-retention", username: "author")
    old = AuditEvent.record!(account:, action: "auth.login", request_id: "old")
    another_old = AuditEvent.record!(account:, action: "auth.login", request_id: "another-old")
    current = AuditEvent.record!(account:, action: "auth.logout", request_id: "current")
    old.update_column(:created_at, 181.days.ago)
    another_old.update_column(:created_at, 181.days.ago)

    assert_equal 2, AuditEvent.prune_expired!(batch_size: 1)
    assert_not AuditEvent.exists?(old.id)
    assert_not AuditEvent.exists?(another_old.id)
    assert AuditEvent.exists?(current.id)
  end
end
