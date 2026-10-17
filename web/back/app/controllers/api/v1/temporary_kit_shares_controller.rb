module Api
  module V1
    class TemporaryKitSharesController < KitSharesController
      skip_before_action :require_account!

      private

      def managed_kit
        kit = Kit.find(params[:temporary_kit_id])
        verify_management!(kit)
        kit
      end

      def verify_management!(kit)
        token = request.authorization.to_s.delete_prefix("Bearer ")
        raise ActiveRecord::RecordNotFound unless request.authorization.to_s.start_with?("Bearer ") && kit.managed_with?(token)
      end
    end
  end
end
