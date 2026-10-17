class RemoveRedundantAuditAccountIndex < ActiveRecord::Migration[8.1]
  def change
    remove_index :audit_events, :discord_account_id
  end
end
