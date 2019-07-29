#!/usr/bin/env ruby

require 'cuke_modeler'
require 'slop'
require 'colored'
require 'cgi'
require 'nokogiri'

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
  o.string '-r', '--reporthtml', 'path to a previous HTML report file'
  o.string '-c', '--cucumberjson', 'path to cucumber JSON report'
  o.boolean '-o', '--open', 'open the HTML report in your browser when the script completes', default: false
end

FEATURE_FILE_PATH = opts[:features]
CUCUMBER_REPORT = opts[:cucumberjson]
HTML_REPORT = opts[:reporthtml]
OPEN_AFTER = opts[:open]
OUTPUT_DIRECTORY = 'output'
OUTPUT_FILENAME = 'pumpkin-report.html'

def load_cucumber_json
  return nil if CUCUMBER_REPORT.nil?
  exit_with_error("#{CUCUMBER_REPORT} could not be found") unless File.exist?(CUCUMBER_REPORT)

  JSON.parse(File.read(CUCUMBER_REPORT))
end

def load_html_report
  return nil if HTML_REPORT.nil?
  exit_with_error("#{HTML_REPORT} could not be found") unless File.exist?(HTML_REPORT)

  File.open(HTML_REPORT) { |f| Nokogiri::HTML(f) }
end

def load_feature_files
  files = Dir.glob("#{FEATURE_FILE_PATH}/**/*.feature").sort.map{|feature_file|
    feature = CukeModeler::FeatureFile.new(feature_file)
    order = feature.feature.tags.select{|tag| tag.to_s.start_with?('@report-order-')}.first.to_s.gsub(/[^0-9]/, '').to_i
    order = 999 if order == 0
    {
      feature: feature,
      order: order
    }
  }
  exit_with_error("No feature files found in #{FEATURE_FILE_PATH}") if files.count == 0
  files.sort_by{|f| f[:order]}.map{|f|
    print_message("Found feature '#{f[:feature].feature.name}' with #{f[:feature].feature.scenarios.count} scenarios")
    f[:feature]
  }
end

def scenario_status feature_name, scenario_name
  status = ''

  # attempt to get the status from a Cucumber test run
  if @cucumber_report
    @cucumber_report.each do |feature|
      next unless feature["name"].strip == feature_name.strip
      feature['elements'].each do |scenario|
        next unless scenario["name"].strip == scenario_name.strip
        scenario["steps"].each do |step|
          status = step["result"]["status"].downcase
        end
      end
    end
  end

  # attempt to get the status from an HTML report
  if @html_report
    if status == ''
      scenario_cell = @html_report.xpath("//p[contains(text(), \"#{scenario_name}\")]").first
      status = scenario_cell.parent.parent.css("option[selected]").text.downcase unless scenario_cell.nil?
    end
  end

  status
end

def format_status status
  return "<span class='scenario-status-print'></span>#{scenario_status_dropdown(status)}"
end

def feature_status_dropdown
  return "<select class='feature-status custom-select' style='width:130px;'><option value=''>Change all</option>#{@status_types.map{|s| "<option value='#{s.downcase}'>#{s}</option>"}.join('')}</select>"
end

def scenario_status_dropdown status
  return "<select class='scenario-status custom-select' style='width:130px;'>#{@status_types.map{|s| "<option value='#{s.downcase}' #{'selected="selected"' if s.downcase == status}>#{s}</option>"}.join('')}</select>"
end

def format_steps scenario
  html = '<p class="scenario-steps small text-muted">'
  html += scenario.steps.map{|step| CGI.escapeHTML("#{step.keyword} #{step.text}")}.join('<br>')
  html += '</p>'
  if scenario.respond_to? :examples
    html += '<pre class="small text-muted">' + scenario.examples[0].to_s + '</pre>'
  end
  html
end

def format_scenarios feature_name, items
  html = ''
  items.each_with_index do |scenario, i|
    scenario_name = scenario.name
    scenario_status = scenario_status(feature_name, scenario_name)
    html += "<tr class='scenario'><td style='width:1px' class='text-muted index'></td><td><button class='btn btn-outline-secondary btn-sm float-right remove-scenario' tabindex='-1'>Remove scenario</button><p>#{scenario_name.capitalize}</p>#{format_steps(scenario)}</td><td style='width:1px'>#{format_status(scenario_status)}</td></tr>"
  end
  html
end

@cucumber_report = load_cucumber_json
@html_report = load_html_report
@feature_files = load_feature_files
@status_types = ["Not run","Descoped", "In Progress", "Passed", "Failed", "Blocked"]

open("#{OUTPUT_DIRECTORY}/#{OUTPUT_FILENAME}", 'w') { |f|
  f << "<html>"
  f << "<head>"
  f << "<meta charset='utf-8'/>"
  f << "<style type='text/css'>#{File.read('assets/bootstrap.min.css')}</style>"
  f << "<style type='text/css'>#{File.read('assets/application.css')}</style>"
  f << "<script>window.STATUS_TYPES = #{@status_types.map{|s| s.downcase}.to_json};</script>"
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
  f << "<a target='iframe' download='pumpkin-report.html' href='#' onclick='saveHTML();' class='btn btn-primary save-report'>Save HTML</a>"
  f << "<h3>Summary</h3>"
  f << "<p class='report-description-print'></p>"
  f << "<table class='table'>"
  f << "<thead><tr><th>Status</th><th>Total <span class='text-muted'>(<span class='total'></span>)</span></th></tr></thead>"
  f << "<tbody id='results'></tbody>"
  f << "</table>"
  @feature_files.each do |feature_file|
    feature_name = feature_file.feature.name
    f << "<div class='feature'>"
    f << "<h3>Feature: #{feature_name} <div class='float-right feature-actions'><button class='btn btn-outline-secondary btn-sm remove-feature'>Remove feature</button><div class='float-right'>#{feature_status_dropdown}</div></div></h3>"
    f << "<table class='table table-condensed'>"
    f << "<thead><th colspan='2'>Scenario</th><th style='width:1px'>Status</th></thead>"
    f << "<tbody>"
    f << format_scenarios(feature_name, feature_file.feature.scenarios)
    f << format_scenarios(feature_name, feature_file.feature.outlines)
    f << "</tbody>"
    f << "</table>"
    f << "</div>"
  end

  f << "</div>"
  f << "</body>"
  f << "</html>"
}

print_ok_message("Report generated at #{OUTPUT_DIRECTORY}/#{OUTPUT_FILENAME}")
`open #{OUTPUT_DIRECTORY}/#{OUTPUT_FILENAME}` if OPEN_AFTER
