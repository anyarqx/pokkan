require "test_helper"

class DiscordAuthorizationTest < ActiveSupport::TestCase
  test "stores renewable Discord credentials encrypted and refreshes an expired grant" do
    account = DiscordAccount.create!(discord_id: "9001", username: "author")
    authorization = account.build_discord_authorization
    authorization.assign_grant!(access_token: "first-access", refresh_token: "first-refresh", expires_at: 1.minute.ago, scopes: %w[identify guilds])
    authorization.save!

    refute_includes authorization.access_token_ciphertext, "first-access"
    refute_includes authorization.refresh_token_ciphertext, "first-refresh"
    original = DiscordOauth.method(:refresh!)
    DiscordOauth.define_singleton_method(:refresh!) do |token, scopes:|
      raise "wrong refresh token" unless token == "first-refresh" && scopes == %w[identify guilds]
      { access_token: "new-access", refresh_token: "new-refresh", expires_at: 1.hour.from_now, scopes: }
    end

    assert_equal "new-access", authorization.usable_access_token!
    assert_equal "new-refresh", authorization.reload.refresh_token
  ensure
    DiscordOauth.define_singleton_method(:refresh!, original) if original
  end
end
