module Api
  module V1
    class EmojisController < ApplicationController
      def index
        render json: { emojis: DiscordEmojis.built_in }
      end
    end
  end
end
