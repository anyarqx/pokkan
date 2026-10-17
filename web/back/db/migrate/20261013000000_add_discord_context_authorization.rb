class AddDiscordContextAuthorization < ActiveRecord::Migration[8.1]
  def change
    add_column :discord_accounts, :banner, :string

    create_table :discord_authorizations do |t|
      t.references :discord_account, null: false, foreign_key: true, index: { unique: true }
      t.text :access_token_ciphertext, null: false
      t.text :refresh_token_ciphertext, null: false
      t.string :scopes, null: false
      t.datetime :expires_at, null: false
      t.timestamps
    end
  end
end
