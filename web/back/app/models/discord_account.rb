class DiscordAccount < ApplicationRecord
  has_many :kits, dependent: :destroy
  has_many :audit_events, dependent: :delete_all
  has_one :discord_authorization, dependent: :destroy

  validates :discord_id, presence: true, uniqueness: true
end
