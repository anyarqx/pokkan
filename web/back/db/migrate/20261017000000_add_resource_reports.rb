class AddResourceReports < ActiveRecord::Migration[8.1]
  def change
    add_column :kits, :sharing_suspended_at, :datetime
    add_column :kits, :sharing_restriction_reason, :string, limit: 500

    create_table :resource_reports, id: :string, limit: 36 do |t|
      t.references :discord_account, foreign_key: { on_delete: :nullify }
      t.string :kit_id, limit: 36
      t.string :kind, null: false
      t.string :contact, limit: 254
      t.string :location, limit: 500
      t.text :details, null: false
      t.datetime :closed_at
      t.string :outcome, limit: 500
      t.string :handled_by, limit: 80
      t.timestamps
    end
    add_index :resource_reports, :kit_id
    add_index :resource_reports, :created_at
    add_foreign_key :resource_reports, :kits, on_delete: :nullify
  end
end
