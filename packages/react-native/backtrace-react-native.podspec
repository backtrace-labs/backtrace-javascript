# backtrace-react-native.podspec

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "@backtrace/react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  backtrace-react-native
                   DESC
  s.homepage     = "https://github.com/backtrace-labs/backtrace-javascript"
  # brief license entry:
  s.license      = "MIT"
  # optional - use expanded license entry instead:
  s.license    = { :type => "MIT", :file => "LICENSE" }
  s.authors      = { "Your Name" => "team@backtrace.io" }
  s.platforms    = { :ios => "9.0" }
  s.source       = { :git => "https://github.com/backtrace-labs/backtrace-javascript.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,c,cc,cpp,m,mm,swift}"
  s.requires_arc = true

  s.dependency "React"
  # ...
  # s.dependency "..."
end

