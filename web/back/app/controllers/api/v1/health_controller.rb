module Api
  module V1
    class HealthController < ApplicationController
      def show
        render json: {
          service: "pokkan-the-bot",
          status: "ok",
          time: Time.current.iso8601
        }
      end

      def ready
        ActiveRecord::Base.connection_pool.with_connection { |connection| connection.select_value("SELECT 1") }
        render json: { service: "pokkan-the-bot", status: "ready" }
      rescue ActiveRecord::ActiveRecordError
        render_error("The service is not ready.", code: "persistence_unavailable", status: :service_unavailable)
      end
    end
  end
end
