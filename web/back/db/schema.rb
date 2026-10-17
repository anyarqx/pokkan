# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_17_000001) do
  create_table "audit_events", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "action", null: false
    t.datetime "created_at", null: false
    t.bigint "discord_account_id", null: false
    t.string "request_id", null: false
    t.string "target_id"
    t.string "target_type"
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_audit_events_on_created_at"
    t.index ["discord_account_id", "created_at"], name: "index_audit_events_on_discord_account_id_and_created_at"
    t.index ["discord_account_id"], name: "index_audit_events_on_discord_account_id"
  end

  create_table "discord_accounts", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "avatar"
    t.string "banner"
    t.datetime "created_at", null: false
    t.string "discord_id", null: false
    t.string "global_name"
    t.datetime "last_signed_in_at"
    t.datetime "updated_at", null: false
    t.string "username"
    t.index ["discord_id"], name: "index_discord_accounts_on_discord_id", unique: true
  end

  create_table "discord_authorizations", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.text "access_token_ciphertext", null: false
    t.datetime "contexts_refreshed_at"
    t.datetime "contexts_retry_after_at"
    t.datetime "created_at", null: false
    t.bigint "discord_account_id", null: false
    t.datetime "expires_at", null: false
    t.text "refresh_token_ciphertext", null: false
    t.string "scopes", null: false
    t.datetime "updated_at", null: false
    t.index ["discord_account_id"], name: "index_discord_authorizations_on_discord_account_id", unique: true
  end

  create_table "discord_guild_snapshots", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "fetched_at"
    t.integer "format_version", default: 1, null: false
    t.string "guild_id", null: false
    t.datetime "last_attempted_at"
    t.string "last_error"
    t.datetime "last_manual_at"
    t.json "payload"
    t.string "refresh_id"
    t.datetime "refresh_started_at"
    t.datetime "retry_after_at"
    t.datetime "updated_at", null: false
    t.index ["guild_id"], name: "index_discord_guild_snapshots_on_guild_id", unique: true
  end

  create_table "kit_shares", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "audience", default: "anyone", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at"
    t.string "kit_id", limit: 36, null: false
    t.string "permission", default: "view", null: false
    t.string "token_digest", limit: 64, null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_kit_shares_on_expires_at"
    t.index ["kit_id"], name: "index_kit_shares_on_kit_id"
    t.index ["token_digest"], name: "index_kit_shares_on_token_digest", unique: true
  end

  create_table "kits", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.json "arguments", null: false
    t.datetime "created_at", null: false
    t.bigint "discord_account_id"
    t.string "guild_id"
    t.integer "lock_version", default: 0, null: false
    t.string "management_token_digest", limit: 64
    t.json "message", null: false
    t.string "name", null: false
    t.json "placeholders", null: false
    t.string "sharing_restriction_reason", limit: 500
    t.datetime "sharing_suspended_at"
    t.datetime "temporary_expires_at"
    t.datetime "updated_at", null: false
    t.index ["discord_account_id"], name: "index_kits_on_discord_account_id"
    t.index ["guild_id"], name: "index_kits_on_guild_id"
    t.index ["temporary_expires_at"], name: "index_kits_on_temporary_expires_at"
  end

  create_table "login_sessions", id: { type: :string, limit: 64 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "discord_account_id", null: false
    t.datetime "expires_at", null: false
    t.index ["discord_account_id"], name: "index_login_sessions_on_discord_account_id"
    t.index ["expires_at"], name: "index_login_sessions_on_expires_at"
  end

  create_table "resource_reports", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.datetime "closed_at"
    t.string "contact", limit: 254
    t.datetime "created_at", null: false
    t.text "details", null: false
    t.bigint "discord_account_id"
    t.string "handled_by", limit: 80
    t.string "kind", null: false
    t.string "kit_id", limit: 36
    t.string "location", limit: 500
    t.string "outcome", limit: 500
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_resource_reports_on_created_at"
    t.index ["discord_account_id"], name: "index_resource_reports_on_discord_account_id"
    t.index ["kit_id"], name: "index_resource_reports_on_kit_id"
  end

  add_foreign_key "audit_events", "discord_accounts"
  add_foreign_key "discord_authorizations", "discord_accounts"
  add_foreign_key "kit_shares", "kits"
  add_foreign_key "kits", "discord_accounts"
  add_foreign_key "login_sessions", "discord_accounts", on_delete: :cascade
  add_foreign_key "resource_reports", "discord_accounts", on_delete: :nullify
  add_foreign_key "resource_reports", "kits", on_delete: :nullify
end
