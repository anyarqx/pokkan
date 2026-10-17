class DiscordAuthorization < ApplicationRecord
  belongs_to :discord_account

  validates :access_token_ciphertext, :refresh_token_ciphertext, :expires_at, presence: true

  def access_token
    encryptor.decrypt_and_verify(access_token_ciphertext)
  end

  def refresh_token
    encryptor.decrypt_and_verify(refresh_token_ciphertext)
  end

  def assign_grant!(grant)
    self.access_token_ciphertext = encryptor.encrypt_and_sign(grant.fetch(:access_token))
    self.refresh_token_ciphertext = encryptor.encrypt_and_sign(grant.fetch(:refresh_token))
    self.expires_at = grant.fetch(:expires_at)
    self.scopes = grant.fetch(:scopes).join(" ")
  end

  def guilds_authorized?
    scopes.split.include?("guilds")
  end

  def usable_access_token!
    with_lock do
      if expires_at <= 1.minute.from_now
        refreshed = DiscordOauth.refresh!(refresh_token, scopes: scopes.split)
        assign_grant!(refreshed)
        save!
      end
      access_token
    end
  rescue OAuth2::Error => error
    response = error.response
    if response&.status.to_i == 400 && response.parsed.is_a?(Hash) && response.parsed["error"] == "invalid_grant"
      destroy!
      raise DiscordOauth::ConsentRequired, "Discord authorization expired or was revoked."
    end
    raise DiscordApi::Unavailable, "Discord authorization could not be refreshed right now."
  rescue Faraday::Error
    raise DiscordApi::Unavailable, "Discord authorization could not be refreshed right now."
  end

  private

  def encryptor
    key = Rails.application.key_generator.generate_key("pokkan-discord-user-authorization-v1", 32)
    ActiveSupport::MessageEncryptor.new(key)
  end
end
