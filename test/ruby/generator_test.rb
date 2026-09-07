require "minitest/autorun"
require "tmpdir"
require "fileutils"
require_relative "../../lib/generators/hotwire_sheets/install/install_generator"

class GeneratorTest < Minitest::Test
  def test_install_is_idempotent
    Dir.mktmpdir do |dir|
      Dir.chdir(dir) do
        FileUtils.mkdir_p(["config", "app/javascript/controllers", "app/views/layouts"])
        File.write("config/importmap.rb", "pin 'application'\n")
        File.write("app/javascript/controllers/index.js", 'import { application } from "controllers/application"')
        File.write("app/views/layouts/application.html.erb", "<html><head>\n</head><body></body></html>")
        2.times { HotwireSheets::Generators::InstallGenerator.start([], destination_root: dir) }
        assert_equal 1, File.read("config/importmap.rb").scan('pin "hotwire-sheets",').length
        assert_equal 1, File.read("app/javascript/controllers/index.js").scan("registerSheets(application)").length
        assert_equal 1, File.read("app/views/layouts/application.html.erb").scan('stylesheet_link_tag "hotwire_sheets"').length
        assert File.read("config/importmap.rb").include?("\npin ")
      end
    end
  end
end
