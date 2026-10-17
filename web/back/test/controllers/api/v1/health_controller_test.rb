require "test_helper"

class Api::V1::HealthControllerTest < ActionDispatch::IntegrationTest
  test "reports the API as healthy" do
    get "/api/v1/health"

    assert_response :success
    assert_equal "ok", response.parsed_body.fetch("status")
    assert_equal "pokkan-the-bot", response.parsed_body.fetch("service")
  end

  test "reports ready only after persistence can answer a query" do
    get "/api/v1/ready"

    assert_response :success
    assert_equal "ready", response.parsed_body.fetch("status")
  end

  test "permits the configured development frontend origin" do
    get "/api/v1/health", headers: { "Origin" => "http://localhost:5173" }

    assert_response :success
    assert_equal "http://localhost:5173", response.headers["Access-Control-Allow-Origin"]
    assert_equal "true", response.headers["Access-Control-Allow-Credentials"]
  end

  test "does not grant credentialed CORS access to an unknown origin" do
    get "/api/v1/health", headers: { "Origin" => "https://untrusted.example" }

    assert_response :success
    assert_nil response.headers["Access-Control-Allow-Origin"]
  end

  test "answers a credentialed mutation preflight only for a configured origin" do
    options "/api/v1/kits", headers: {
      "Origin" => "http://localhost:5173",
      "Access-Control-Request-Method" => "PUT",
      "Access-Control-Request-Headers" => "Content-Type, X-CSRF-Token"
    }

    assert_response :success
    assert_equal "http://localhost:5173", response.headers["Access-Control-Allow-Origin"]
    assert_equal "true", response.headers["Access-Control-Allow-Credentials"]
  end
end
