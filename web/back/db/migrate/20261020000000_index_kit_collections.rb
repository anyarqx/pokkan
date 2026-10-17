class IndexKitCollections < ActiveRecord::Migration[8.1]
  def change
    add_index :kits, [ :discord_account_id, :guild_id, :updated_at ], name: "index_kits_on_account_collection"
    add_index :kits, [ :guild_id, :updated_at ], name: "index_kits_on_server_collection"
    remove_index :kits, :discord_account_id
    remove_index :kits, :guild_id
  end
end
