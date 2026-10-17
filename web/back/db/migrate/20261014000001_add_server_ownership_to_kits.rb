class AddServerOwnershipToKits < ActiveRecord::Migration[8.1]
  def change
    add_column :kits, :guild_id, :string
    add_column :kits, :lock_version, :integer, null: false, default: 0
    add_index :kits, :guild_id
  end
end
