class AddContextRetryAfterToDiscordAuthorizations < ActiveRecord::Migration[8.0]
  def change
    add_column :discord_authorizations, :contexts_retry_after_at, :datetime
  end
end
