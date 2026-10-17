module Api
  module V1
    class SharedKitsController < KitsController
      skip_before_action :require_account!
      before_action :prune_expired_copies
      rate_limit to: 120, within: 1.minute, by: -> { request.remote_ip }, name: "shared_access", with: :sharing_rate_limited

      def show
        with_shared_kit do |kit, share|
          render json: { kit: shared_representation(kit, edit: share.permission == "edit"), share: share.as_json(only: %i[audience permission expires_at]) }
        end
      end

      def update
        with_shared_kit(edit: true) do |kit, _share|
          update_shared_content!(kit)
          render json: { kit: shared_representation(kit, edit: true) }
        end
      rescue ActiveRecord::RecordInvalid
        render_error("The Kit data is invalid.", code: "kit_invalid", status: :unprocessable_entity)
      end

      private

      def bearer_token
        value = request.authorization.to_s
        value.delete_prefix("Bearer ") if value.start_with?("Bearer ")
      end

      def with_shared_kit(edit: false)
        share = KitShare.includes(:kit).find(params[:id])
        token = bearer_token
        raise ActiveRecord::RecordNotFound unless share.permits?(token, edit:)

        member_guild = nil
        if share.audience == "members"
          return render_error("Authentication is required.", code: "authentication_required", status: :unauthorized) unless current_account

          DiscordContexts.member!(current_account, share.kit.guild_id)
          member_guild = share.kit.guild_id
        elsif share.kit.guild_id
          raise ActiveRecord::RecordNotFound unless DiscordContexts.public_installed?(share.kit.guild_id)
        end
        share.kit.with_lock do
          share.reload
          raise ActiveRecord::RecordNotFound unless share.permits?(token, edit:)
          return render_error("Sharing is restricted for this Kit. Contact support if you need help.", code: "sharing_restricted", status: :forbidden) if share.kit.sharing_suspended_at
          raise ActiveRecord::RecordNotFound if share.audience == "members" && member_guild != share.kit.guild_id

          yield share.kit, share
        end
      end

      def shared_representation(kit, edit:)
        # No server, creator, account or metadata grant travels through a link.
        kit.as_json(only: %i[id name arguments message placeholders]).merge("revision" => kit.lock_version, "can_edit" => edit)
      end

      def update_shared_content!(kit)
        data = kit_payload
        raise ActionController::BadRequest if data.key?("guild_id")
        raise RevisionConflict unless data["revision"].is_a?(Integer) && data["revision"] == kit.lock_version

        assign_content(kit, data)
        kit.save!
      end

      def prune_expired_copies
        Kit.prune_temporary! if Rails.cache.write("temporary-kit-maintenance", true, expires_in: 1.minute, unless_exist: true)
      end

      def sharing_rate_limited
        response.set_header("Retry-After", "60")
        render_error("Too many sharing requests. Try again shortly.", code: "share_rate_limited", status: :too_many_requests)
      end
    end
  end
end
