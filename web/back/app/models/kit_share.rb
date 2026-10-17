class KitShare < ApplicationRecord
  belongs_to :kit

  before_validation(on: :create) { self.id ||= SecureRandom.uuid }
  validates :permission, inclusion: { in: %w[view edit] }
  validates :audience, inclusion: { in: %w[anyone members] }
  validates :token_digest, format: { with: /\A[0-9a-f]{64}\z/ }, uniqueness: true
  validate do
    errors.add(:audience, "requires a server Kit") if audience == "members" && kit&.guild_id.nil?
    if kit&.temporary_expires_at && (expires_at.nil? || expires_at > kit.temporary_expires_at)
      errors.add(:expires_at, "cannot outlive its temporary Kit")
    end
  end

  def self.digest(token)
    Digest::SHA256.hexdigest(token)
  end

  def rotate_token!
    token = SecureRandom.urlsafe_base64(32)
    self.token_digest = self.class.digest(token)
    token
  end

  def permits?(token, edit: false)
    token.is_a?(String) && token.match?(/\A[A-Za-z0-9_-]{43}\z/) &&
      ActiveSupport::SecurityUtils.secure_compare(token_digest, self.class.digest(token)) &&
      (expires_at.nil? || expires_at > Time.current) && kit.available? &&
      (!edit || permission == "edit")
  end
end
