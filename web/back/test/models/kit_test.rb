require "test_helper"

class KitTest < ActiveSupport::TestCase
  setup { @account = DiscordAccount.create!(discord_id: "author") }

  test "stores editable messages without requiring a valid Discord send request" do
    kit = @account.kits.create!(name: "Draft", message: {}, arguments: [], placeholders: [])
    assert_match(/\A[0-9a-f-]{36}\z/, kit.id)
    assert_equal({}, kit.reload.message)
    @account.destroy!
    assert_not Kit.exists?(kit.id)
  end

  test "bounds stored JSON and rejects malformed argument and placeholder definitions" do
    kit = @account.kits.new(name: "Draft", message: { "content" => "x" * 256.kilobytes }, arguments: [], placeholders: [])
    assert_not kit.valid?
    assert kit.errors[:message].any?
    kit.message = {}
    kit.arguments = [ { name: "x", type: "string", required: true, default: "conflict" } ]
    assert_not kit.valid?
    kit.arguments = []
    kit.placeholders = [ { key: "missing fields" } ]
    assert_not kit.valid?
  end
end
