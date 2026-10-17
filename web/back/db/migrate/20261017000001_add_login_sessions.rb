class AddLoginSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :login_sessions, id: :string, limit: 64 do |t|
      t.references :discord_account, null: false, foreign_key: { on_delete: :cascade }
      t.datetime :expires_at, null: false
    end
    add_index :login_sessions, :expires_at
  end
end
