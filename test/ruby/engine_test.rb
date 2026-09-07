require "minitest/autorun"
require "open3"
require "rbconfig"

class EngineTest < Minitest::Test
  def test_engine_renders_erb_and_serves_assets_in_a_real_rails_app
    output, status = Open3.capture2e(RbConfig.ruby, "-Ilib", "test/support/rails_smoke.rb", chdir: File.expand_path("../..", __dir__))
    assert status.success?, output
    assert_includes output, "Rails integration passed"
  end
end
