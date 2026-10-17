require "test_helper"

class Api::V1::CsrfControllerTest < ActionDispatch::IntegrationTest
  test "returns a session-bound token for credentialed API mutations" do
    get "/api/v1/csrf"

    assert_response :success
    assert_kind_of String, response.parsed_body.fetch("token")
    assert_predicate response.parsed_body.fetch("token"), :present?
  end
end
