module Api
  module V1
    class CsrfController < ApplicationController
      def show
        render json: { token: form_authenticity_token }
      end
    end
  end
end
