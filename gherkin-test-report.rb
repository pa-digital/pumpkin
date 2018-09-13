#!/usr/bin/env ruby

require 'cuke_modeler'
require 'slop'
require 'colored'

def print_ok_message(message)
  print ' ✔ '.green
  puts message
end

def print_message(message)
  puts message
end

def exit_with_error(message)
  print ' ✘ '.red
  puts message
  exit 1
end

opts = Slop.parse do |o|
  o.string '-f', '--features', 'path to your feature files', required: true
  o.string '-c', '--cucumberjson', 'path to cucumber JSON report'
  o.boolean '-o', '--open', 'open the HTML report in your browser when the script completes', default: false
end

FEATURE_FILE_PATH = opts[:features]
CUCUMBER_REPORT = opts[:cucumberjson]
OPEN_AFTER = opts[:open]
FILENAME = 'output/report.html'

def load_cucumber_json
  return {} if CUCUMBER_REPORT.nil?
  exit_with_error("#{CUCUMBER_REPORT} could not be found") unless File.exist?(CUCUMBER_REPORT)

  JSON.parse(File.read(CUCUMBER_REPORT))
end

def load_feature_files
  files = Dir.glob("#{FEATURE_FILE_PATH}/**/*.feature").map{|feature_file|
    feature = CukeModeler::FeatureFile.new(feature_file)
    print_message("Found feature '#{feature.feature.name}' with #{feature.feature.scenarios.count} scenarios")
    feature
  }
  exit_with_error("No feature files found in #{FEATURE_FILE_PATH}") if files.count == 0
  files
end

def scenario_status feature_name, scenario_name
  status = ''
  @report.each do |feature|
    next unless feature["name"] == feature_name
    feature['elements'].each do |scenario|
      next unless scenario["name"] == scenario_name
      scenario["steps"].each do |step|
        status = step["result"]["status"]
      end
    end
  end
  status
end

def format_status status
  return "<span class='scenario-status-print'></span><select class='scenario-status custom-select' style='width:130px;'>#{@status_types.map{|s| "<option #{'selected="selected"' if s.downcase == status}>#{s}</option>"}}</select>"
end

def format_steps scenario
  html = '<p class="scenario-steps small text-muted">'
  html += scenario.steps.map{|step| "#{step.keyword} #{step.text}"}.join('<br>')
  html += '</p>'
  html
end

@report = load_cucumber_json
@feature_files = load_feature_files
@status_types = ["Not run","Descoped", "In Progress", "Passed", "Failed", "Blocked"]

open('output/report.html', 'w') { |f|
  f << "<html>"
  f << "<head>"
  f << "<style type='text/css'>#{File.read('assets/bootstrap.min.css')}</style>"
  f << "<style type='text/css'>#{File.read('assets/application.css')}</style>"
  f << "<script>window.STATUS_TYPES = #{@status_types.to_json};</script>"
  f << "<script>#{File.read('assets/jquery.js')}</script>"
  f << "<script>#{File.read('assets/application.js')}</script>"
  f << "</head>"
  f << "<body>"
  f << "<iframe id='iframe' style='display:none;'></iframe>"
  f << "<div class='container'>"
  f << "<span class='logo'></span>"
  f << "<h1>Test Report<br><span class='report-title-print text-muted'></span> <span class='report-date-print text-muted'></span></h1>"
  f << "<div class='form-group'><input type='text' placeholder='Project Name' class='form-control report-title'/></div>"
  f << "<div class='form-group'><input type='text' placeholder='Date' class='form-control report-date' value='#{Time.now.strftime("%d/%m/%Y")}'/></div>"
  f << "<div class='form-group'><textarea class='form-control report-description' placeholder='Notes'></textarea></div>"
  f << "<div class='form-group'><div class='form-check'><input class='form-check-input' type='checkbox' value='yes' id='print-steps'><label class='form-check-label' for='print-steps'>Print scenario steps</label></div></div>"
  f << "<a target='iframe' download='report.html' href='#' onclick='saveHTML();' class='btn btn-primary save-report'>Save HTML</a>"
  f << "<h3>Summary</h3>"
  f << "<p class='report-description-print'></p>"
  f << "<table class='table'>"
  f << "<thead><tr><th>Status</th><th>Total <span class='text-muted'>(<span class='total'></span>)</span></th></tr></thead>"
  f << "<tbody id='results'></tbody>"
  f << "</table>"
  @feature_files.each do |feature_file|
    feature_name = feature_file.feature.name
    f << "<div class='feature'>"
    f << "<h3>Feature: #{feature_name} <button class='btn btn-outline-secondary btn-sm float-right remove-feature'>Remove feature</button></h3>"
    f << "<table class='table table-condensed'>"
    f << "<thead><th colspan='2'>Scenario</th><th style='width:1px'>Status</th></thead>"
    f << "<tbody>"
    feature_file.feature.scenarios.each_with_index do |scenario, i|
      scenario_name = scenario.name
      scenario_status = scenario_status(feature_name, scenario_name)
      f << "<tr class='scenario'><td style='width:1px' class='text-muted index'></td><td><button class='btn btn-outline-secondary btn-sm float-right remove-scenario' tabindex='-1'>Remove scenario</button><p>#{scenario_name.capitalize}</p>#{format_steps(scenario)}</td><td style='width:1px'>#{format_status(scenario_status)}</td></tr>"
    end
    f << "</tbody>"
    f << "</table>"
    f << "</div>"
  end

  f << "</div>"
  f << "</body>"
  f << "</html>"
}

print_ok_message("Report generated at #{FILENAME}")
`open #{FILENAME}` if OPEN_AFTER
