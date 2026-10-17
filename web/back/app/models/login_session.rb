class LoginSession < ApplicationRecord
  belongs_to :discord_account

  def self.register!(account)
    where(expires_at: ..Time.current).limit(100).delete_all
    token = SecureRandom.urlsafe_base64(32)
    create!(id: Digest::SHA256.hexdigest(token), discord_account: account, expires_at: 14.days.from_now)
    token
  end
end
