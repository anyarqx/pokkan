class AddKitSharing < ActiveRecord::Migration[8.1]
  def change
    change_column_null :kits, :discord_account_id, true
    add_column :kits, :temporary_expires_at, :datetime
    add_column :kits, :management_token_digest, :string, limit: 64
    add_index :kits, :temporary_expires_at

    create_table :kit_shares, id: :string, limit: 36 do |t|
      t.string :kit_id, limit: 36, null: false
      t.string :token_digest, limit: 64, null: false
      t.string :permission, null: false, default: "view"
      t.string :audience, null: false, default: "anyone"
      t.datetime :expires_at
      t.timestamps
    end
    add_index :kit_shares, :token_digest, unique: true
    add_index :kit_shares, :kit_id
    add_index :kit_shares, :expires_at
    add_foreign_key :kit_shares, :kits
  end
end
