require "rails"
require "rails/engine"

module HotwireSheets
  class Engine < ::Rails::Engine
    initializer "hotwire_sheets.helpers" do
      ActiveSupport.on_load(:action_view) do
        include HotwireSheets::SheetHelper
      end
    end

    initializer "hotwire_sheets.assets" do |app|
      if app.config.respond_to?(:assets) && app.config.assets.respond_to?(:precompile)
        app.config.assets.precompile += %w[hotwire_sheets.js hotwire_sheets_stimulus.js hotwire_sheets.css hotwire_sheets_layered.css]
      end
    end
  end
end
