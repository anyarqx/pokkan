class DiscordGuildSnapshot < ApplicationRecord
  FORMAT_VERSION = 2
  FRESH_FOR = 15.minutes
  MANUAL_COOLDOWN = 60.seconds
  LEASE_FOR = 35.seconds

  validates :guild_id, presence: true, uniqueness: true

  def self.for_guild(guild_id)
    find_or_create_by!(guild_id:)
  rescue ActiveRecord::RecordNotUnique
    find_by!(guild_id:)
  end

  def stale?
    fetched_at.nil? || fetched_at < FRESH_FOR.ago || format_version != FORMAT_VERSION
  end

  def retry_in
    remaining = retry_after_at && (retry_after_at - Time.current).ceil
    [ remaining.to_i, 0 ].max
  end

  def manual_retry_in
    remaining = last_manual_at && (last_manual_at + MANUAL_COOLDOWN - Time.current).ceil
    [ remaining.to_i, 0 ].max
  end

  def updating?
    refresh_started_at.present? && refresh_started_at > LEASE_FOR.ago
  end

  def claim!(manual:)
    with_lock do
      return :cooldown if manual && manual_retry_in.positive?
      return :retry if retry_in.positive?
      return :updating if updating?
      return :fresh if !manual && !stale?

      self.last_manual_at = Time.current if manual
      self.last_attempted_at = Time.current
      self.refresh_started_at = Time.current
      self.refresh_id = SecureRandom.uuid
      save!
      refresh_id
    end
  end

  def finish!(id, payload: nil, error: nil, retry_after: nil)
    with_lock do
      return unless refresh_id == id

      if payload
        self.payload = payload
        self.format_version = FORMAT_VERSION
        self.fetched_at = Time.current
        self.last_error = nil
        self.retry_after_at = nil
      else
        self.last_error = error
        self.retry_after_at = Time.current + retry_after if retry_after
      end
      self.refresh_started_at = nil
      self.refresh_id = nil
      save!
    end
  end
end
