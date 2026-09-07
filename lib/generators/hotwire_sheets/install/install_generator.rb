require "rails/generators"

module HotwireSheets
  module Generators
    class InstallGenerator < Rails::Generators::Base
      desc "Configure Hotwire Sheets in a Rails app with Stimulus."

      def install
        if File.exist?("config/importmap.rb")
          append_once "config/importmap.rb", '\npin "hotwire-sheets", to: "hotwire_sheets.js"\npin "hotwire-sheets/stimulus", to: "hotwire_sheets_stimulus.js"\n'.gsub('\\n', "\n")
        else
          say 'Install the JS package: npm install hotwire-sheets @hotwired/stimulus', :yellow
          say 'For local development, use npm install /path/to/hotwire-sheets instead.', :yellow
        end
        if File.exist?("app/javascript/controllers/index.js")
          append_once "app/javascript/controllers/index.js", "\nimport { registerSheets } from \"hotwire-sheets/stimulus\"\nregisterSheets(application)\n"
        else
          say 'Add import { registerSheets } from "hotwire-sheets/stimulus" and registerSheets(application) after starting Stimulus.', :yellow
        end
        layout = "app/views/layouts/application.html.erb"
        if File.exist?(layout) && !File.read(layout).include?('stylesheet_link_tag "hotwire_sheets"')
          inject_into_file layout, "    <%= stylesheet_link_tag \"hotwire_sheets\", \"data-turbo-track\": \"reload\" %>\n", before: /\s*<\/head>/
        else
          say 'Ensure the layout includes stylesheet_link_tag "hotwire_sheets".', :yellow
        end
      end

      private

      def append_once(path, content)
        append_to_file(path, content) unless File.read(path).include?(content.strip)
      end
    end
  end
end
