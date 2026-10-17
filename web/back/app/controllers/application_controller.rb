class ApplicationController < ActionController::Base
  before_action do
    response.set_header("Cache-Control", "private, no-store")
    response.set_header("Referrer-Policy", "no-referrer")
  end
  rescue_from ActionController::InvalidAuthenticityToken do
    render_error("Your secure session expired. Reload and try again.", code: "csrf_invalid", status: :unprocessable_entity)
  end

  rescue_from ActiveRecord::RecordNotFound do
    render_error("The requested resource was not found.", code: "not_found", status: :not_found)
  end

  rescue_from ActionController::ParameterMissing do
    render_error("The request is incomplete.", code: "parameter_missing", status: :unprocessable_entity)
  end

  private

  def current_account
    return @current_account if defined?(@current_account)

    token = session[:login_token]
    @current_account = if token.is_a?(String) && token.match?(/\A[A-Za-z0-9_-]{43}\z/)
      LoginSession.where("expires_at > ?", Time.current).find_by(id: Digest::SHA256.hexdigest(token), discord_account_id: session[:discord_account_id])&.discord_account
    end
  end

  def require_account!
    return if current_account

    render_error("Authentication is required.", code: "authentication_required", status: :unauthorized)
  end

  def render_error(message, code:, status:)
    render json: { error: message, code:, request_id: request.request_id }.compact, status:
  end

  # Rails' default origin check only accepts request.base_url. Pokkan's SPA is
  # intentionally on a separate origin, so retain the session-bound Rails CSRF
  # token while extending the origin check to the same exact list used by CORS.
  def valid_request_origin?
    return true unless forgery_protection_origin_check
    raise ActionController::InvalidAuthenticityToken, "The request Origin header is null." if request.origin == "null"

    request.origin.nil? ||
      request.origin == request.base_url ||
      Rails.configuration.x.frontend_origins.include?(request.origin.delete_suffix("/"))
  end

  def record_audit!(account:, action:, target_type: nil, target_id: nil)
    AuditEvent.record!(
      account:,
      action:,
      target_type:,
      target_id:,
      request_id: request.request_id
    )
  end
end
