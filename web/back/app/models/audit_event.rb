class AuditEvent < ApplicationRecord
  RETENTION = 180.days

  ACTIONS = %w[
    auth.login
    auth.install_authorized
    auth.logout
    kit.create
    kit.update
    kit.delete
    kit.share
    report.create
  ].freeze

  belongs_to :discord_account

  validates :action, inclusion: { in: ACTIONS }
  validates :request_id, presence: true, length: { maximum: 255 }
  validates :target_type, :target_id, length: { maximum: 255 }, allow_nil: true

  def self.record!(account:, action:, request_id:, target_type: nil, target_id: nil)
    create!(
      discord_account: account,
      action:,
      request_id:,
      target_type:,
      target_id:
    )
  end

  def self.prune_expired!(before: RETENTION.ago, batch_size: 1_000)
    where(created_at: ...before).in_batches(of: batch_size).delete_all
  end
end
