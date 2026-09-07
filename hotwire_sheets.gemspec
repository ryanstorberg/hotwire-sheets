require_relative "lib/hotwire_sheets/version"

Gem::Specification.new do |spec|
  spec.name = "hotwire_sheets"
  spec.version = HotwireSheets::VERSION
  spec.authors = ["Hotwire Sheets contributors"]
  spec.summary = "Swipeable sheets for Rails and Hotwire"
  spec.description = "A standalone gesture engine, Stimulus adapter, and accessible ERB helpers for sheets in Rails."
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.1"
  spec.files = Dir["{app,lib}/**/*", "README.md", "LICENSE", "docs/**/*.{md,json,txt}"].select { |path| File.file?(path) }
  spec.require_paths = ["lib"]
  spec.add_dependency "railties", ">= 7.1", "< 9"
  spec.add_dependency "actionview", ">= 7.1", "< 9"
end
