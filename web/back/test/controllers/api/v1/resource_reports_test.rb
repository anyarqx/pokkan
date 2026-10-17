require "test_helper"
require "rake"

class Api::V1::ResourceReportsTest < ActionDispatch::IntegrationTest
  setup do
    @owner = DiscordAccount.create!(discord_id: "report-owner", username: "Owner")
    @reporter = DiscordAccount.create!(discord_id: "report-requester", username: "Reporter")
    @kit = @owner.kits.create!(name: "Original", message: { content: "Example" }, arguments: [], placeholders: [])
    @share = @kit.kit_shares.build
    @token = @share.rotate_token!
    @share.save!
    @data = { kind: "abuse", details: "Please review this example of misuse.", share_id: @share.id, location: "https://pokkan.net/en/shared/#{@share.id}##{@token}" }
  end

  test "reports require an account and never reveal their content or grant resource access" do
    post "/api/v1/reports", params: { report: @data }, headers: bearer, as: :json
    assert_response :unauthorized
    sign_in_as(@reporter)
    post "/api/v1/reports", params: { report: @data.merge(contact: "reply@example.invalid") }, headers: bearer, as: :json
    assert_response :created
    assert_equal [ "reference" ], response.parsed_body.keys
    report = ResourceReport.find(response.parsed_body["reference"])
    assert_equal @kit.id, report.kit_id
    assert_equal @reporter.id, report.discord_account_id
    refute_includes report.location, @token
    get "/api/v1/reports/#{report.id}"
    assert_response :not_found
    get "/api/v1/kits/#{@kit.id}", headers: bearer
    assert_response :not_found
    post "/api/v1/reports", params: { report: @data.merge(sharing_suspended_at: Time.current) }, headers: bearer, as: :json
    assert_response :bad_request
    assert_nil @kit.reload.sharing_suspended_at
    get "/api/v1/auth/session"
    assert_equal "private, no-store", response.headers["Cache-Control"]
  end

  test "an operator restriction survives link rotation and leaves ownership and unrelated Kits intact" do
    sign_in_as(@owner)
    report = ResourceReport.create!(discord_account: @owner, kit: @kit, kind: "abuse", details: "Operator review of a reported link")
    operator_action("restrict", report)
    get "/api/v1/shared_kits/#{@share.id}", headers: bearer
    assert_response :forbidden
    assert_equal "sharing_restricted", response.parsed_body["code"]
    get "/api/v1/kits/#{@kit.id}"
    assert_response :success
    assert_equal "Original", response.parsed_body.dig("kit", "name")
    assert_equal "Reviewed restriction", response.parsed_body.dig("kit", "sharing_restriction_reason")
    post "/api/v1/kits/#{@kit.id}/shares/#{@share.id}/regenerate", as: :json
    assert_response :forbidden
    post "/api/v1/kits/#{@kit.id}/shares", as: :json
    assert_response :forbidden
    fresh_token = @share.rotate_token!
    @share.save!
    get "/api/v1/shared_kits/#{@share.id}", headers: { "Authorization" => "Bearer #{fresh_token}" }
    assert_response :forbidden
    assert_equal @owner.id, @kit.reload.discord_account_id
    assert_equal "Example", @kit.message["content"]
    other = @owner.kits.create!(name: "Unrelated", arguments: [], placeholders: [], message: { content: "Safe" })
    get "/api/v1/kits/#{other.id}"
    assert_response :success
    operator_action("restore", report)
    get "/api/v1/shared_kits/#{@share.id}", headers: { "Authorization" => "Bearer #{fresh_token}" }
    assert_response :success
    assert_equal "release-test", report.reload.handled_by
  end

  test "report throttling and retention bound storage without retaining copied capabilities" do
    sign_in_as(@reporter)
    5.times do
      post "/api/v1/reports", params: { report: @data.merge(details: "Review https://pokkan.net/en/shared/#{@share.id}##{@token}") }, headers: bearer, as: :json
      assert_response :created
    end
    post "/api/v1/reports", params: { report: @data }, headers: bearer, as: :json
    assert_response :too_many_requests
    assert_equal "3600", response.headers["Retry-After"]
    refute_includes ResourceReport.where(discord_account: @reporter).pluck(:details).join, @token
    expired = ResourceReport.create!(kind: "privacy", details: "Expired request", created_at: 181.days.ago)
    closed = ResourceReport.create!(kind: "abuse", details: "Resolved request", closed_at: 91.days.ago)
    ResourceReport.prune_expired!
    assert_not ResourceReport.exists?(expired.id)
    assert_not ResourceReport.exists?(closed.id)
    assert_equal 5, ResourceReport.where(discord_account: @reporter).count
  end

  test "oversized requests are rejected before Kit parsing or anonymous storage" do
    post "/api/v1/temporary_kits", params: '{"kit":' + " " * 800.kilobytes + "}", headers: { "Content-Type" => "application/json" }
    assert_response :content_too_large
    assert_equal "payload_too_large", response.parsed_body["code"]
    assert_equal 1, Kit.where(discord_account: @owner).count
  end

  test "request limits reject unknown-length bodies and retain CORS for the allowed frontend" do
    oversized = StringIO.new(" " * (RequestBodyLimit::LIMIT + 1))
    middleware = RequestBodyLimit.new(->(_) { flunk "Oversized body reached the application" })
    status, = middleware.call("PATH_INFO" => "/api/v1/temporary_kits", "REQUEST_METHOD" => "POST", "rack.input" => oversized)
    assert_equal 413, status
    post "/api/v1/temporary_kits", params: " " * 800.kilobytes, headers: { "Origin" => "http://localhost:5173", "Content-Type" => "application/json" }
    assert_response :content_too_large
    assert_equal "http://localhost:5173", response.headers["Access-Control-Allow-Origin"]
  end

  private

  def bearer
    { "Authorization" => "Bearer #{@token}" }
  end

  def operator_action(action, report)
    Rails.application.load_tasks unless Rake::Task.task_defined?("reports:#{action}")
    previous = ENV.values_at("OPERATOR", "REASON")
    ENV["OPERATOR"] = "release-test"
    ENV["REASON"] = "Reviewed restriction"
    task = Rake::Task["reports:#{action}"]
    task.reenable
    task.invoke(report.id)
  ensure
    %w[OPERATOR REASON].zip(previous || []).each { |key, value| value ? ENV[key] = value : ENV.delete(key) }
  end
end
