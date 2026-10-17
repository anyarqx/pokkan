class AddDiscordGuildSnapshots < ActiveRecord::Migration[8.1]
  def change
    create_table :discord_guild_snapshots do |t|
      t.string :guild_id, null: false
      t.integer :format_version, null: false, default: 1
      t.json :payload
      t.datetime :fetched_at
      t.datetime :last_attempted_at
      t.datetime :last_manual_at
      t.datetime :retry_after_at
      t.datetime :refresh_started_at
      t.string :refresh_id
      t.string :last_error
      t.timestamps
    end
    add_index :discord_guild_snapshots, :guild_id, unique: true
    add_column :discord_authorizations, :contexts_refreshed_at, :datetime
  end
end
