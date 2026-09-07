require "bundler/setup"
require "action_controller/railtie"
require "propshaft"
require "hotwire_sheets"
require "rack/mock"
require "tmpdir"

class SheetsTestApplication < Rails::Application
  config.root = File.expand_path("../dummy", __dir__)
  config.eager_load = false
  config.secret_key_base = "test-only-" * 8
  config.hosts = ["example.org"]
  config.logger = Logger.new($stdout)
  config.cache_store = :memory_store
  config.action_dispatch.show_exceptions = :none
end

class SheetsTestController < ActionController::Base
  def index
    render inline: <<~ERB
      <%= stylesheet_link_tag "hotwire_sheets" %>
      <%= hotwire_sheet(id: "rails-smoke", detents: ["content", 1]) do |sheet| %>
        <%= sheet.trigger "Open Rails sheet" %>
        <%= sheet.content do %>
          <%= sheet.handle %>
          <%= sheet.title "Rendered by Rails" %>
          <%= sheet.body do %><p>It works.</p><% end %>
          <%= sheet.close %>
        <% end %>
      <% end %>
    ERB
  end
end

Rails.application.initialize!
Rails.application.routes.draw { get "/", to: "sheets_test#index" }
request = Rack::MockRequest.new(Rails.application)
response = request.get("/", "HTTP_HOST" => "example.org")
raise "View failed: #{response.status}: #{response.body}" unless response.status == 200
raise "Helper missing" unless response.body.include?("data-sheet-options-value") && response.body.include?("Rendered by Rails")
stylesheet = Nokogiri::HTML(response.body).at_css("link")["href"]
css = request.get(stylesheet, "HTTP_HOST" => "example.org")
raise "CSS asset failed: #{css.status}" unless css.status == 200 && css.body.include?("data-sheet-content")
js_path = ActionController::Base.helpers.asset_path("hotwire_sheets_stimulus.js")
js = request.get(js_path, "HTTP_HOST" => "example.org")
raise "Stimulus asset failed" unless js.status == 200 && js.body.include?('from "hotwire-sheets"')
puts "Rails integration passed"
