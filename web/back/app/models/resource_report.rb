class ResourceReport < ApplicationRecord
  belongs_to :discord_account, optional: true
  belongs_to :kit, optional: true
  before_validation(on: :create) { self.id ||= SecureRandom.uuid }
  validates :kind, inclusion: { in: %w[abuse privacy appeal] }
  validates :details, presence: true, length: { maximum: 5_000 }
  validates :contact, length: { maximum: 254 }, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validates :location, length: { maximum: 500 }
  validates :outcome, length: { maximum: 500 }
  validates :handled_by, length: { maximum: 80 }

  def self.prune_expired!
    where(created_at: ...180.days.ago).or(where(closed_at: ...90.days.ago)).in_batches(of: 100).delete_all
  end
end
