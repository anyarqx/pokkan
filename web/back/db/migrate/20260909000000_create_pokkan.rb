class CreatePokkan < ActiveRecord::Migration[8.1]
  def change
    create_table :discord_accounts do |t|
      t.string :discord_id, null: false
      t.string :username
      t.string :global_name
      t.string :avatar
      t.datetime :last_signed_in_at
      t.timestamps
      t.index :discord_id, unique: true
    end

    create_table :kits, id: :string, limit: 36 do |t|
      t.references :discord_account, null: false, foreign_key: true
      t.string :name, null: false
      t.json :arguments, null: false
      t.json :message, null: false
      t.json :placeholders, null: false
      t.timestamps
    end

    create_table :audit_events do |t|
      t.references :discord_account, null: false, foreign_key: true
      t.string :action, null: false
      t.string :request_id, null: false
      t.string :target_type
      t.string :target_id
      t.timestamps
      t.index [ :discord_account_id, :created_at ]
      t.index :created_at
    end
  end
end
