require 'dotenv/load'
require 'cuke_modeler'
require 'net/http'

CUCUMBER_REPORT_URL = ARGV[0]
FEATURE_FILE_PATH = ARGV[1]

def load_cucumber_json
  uri = URI(CUCUMBER_REPORT_URL)
  uri.user = ENV['JENKINS_USERNAME']
  uri.password = ENV['JENKINS_API_KEY']
  `curl -X GET #{uri.to_s}`
end

def load_feature_files
  Dir.glob("#{FEATURE_FILE_PATH}/**/*.feature").map{|file| CukeModeler::FeatureFile.new(file) }
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
  if status == 'passed'
    return "<span class='label label-success'>Passed</span><input type='hidden' value='Passed' />"
  elsif status == 'failed'
    return "<p class='label label-danger'>Failed</p><input type='hidden' value='Failed' />"
  # elsif status == 'skipped'
  #   return "<span class='label label-default'>Skipped</span>"
  else
    return "<select>#{@status_types.map{|status| "<option>#{status}</option>"}}</select>"
  end
end

def javascript
  <<~EOF
  <script>
  function recalculateStatusTotals() {
    var scenarios = $('.scenario');
    var results = $('#results').empty();;
    var statusTypes = #{@status_types.to_json};
    var statusTypeColours = #{@status_types_colours.to_json};
    $.each(statusTypes, function(i, status) {
      var count = 0;
      $(scenarios).each(function() {
        var rowStatus = $(this).find('input, select').val();
        if (status === rowStatus) count++;
      });
      results.append('<tr class='+statusTypeColours[i]+'><td>'+status+'</td><td>'+count+'</td></tr>')
    });

  }
  $(function() {
    recalculateStatusTotals();
    $('select').on('change', recalculateStatusTotals);
  });
  </script>
  EOF
end

@report = JSON.parse(load_cucumber_json)
@feature_files = load_feature_files
@status_types = ["Not run","Descoped", "In Progress", "Passed", "Failed", "Blocked"]
@status_types_colours = ["", "", "info", "success", "danger", "warning", "info"]

open('report.html', 'w') { |f|
  f << "<html>"
  f << "<head>"
  f << '<link rel="stylesheet" href="assets/bootstrap.min.css">'
  f << '<script src="assets/jquery.js"></script>'
  f << javascript
  f << "</head>"
  f << "<body>"
  f << "<div class='container'>"
  f << "<h1><input type='text' placeholder='Add your title here' style='border:0;width:100%;'/></h1>"
  @feature_files.each do |feature_file|
    feature_name = feature_file.feature.name
    f << "<h3>Feature: #{feature_name}</h3>"
    f << "<table class='table table-striped table-condensed'>"
    f << "<thead><th colspan='2'>Scenario</th><th style='width:1px'>Status</th></thead>"
    f << "<tbody>"
    feature_file.feature.scenarios.each_with_index do |scenario, i|
      scenario_name = scenario.name
      scenario_status = scenario_status(feature_name, scenario_name)
      f << "<tr class='scenario'><td style='width:1px' class='text-muted'>#{i+1}</td><td>#{scenario_name.capitalize}</td><td style='width:1px'>#{format_status(scenario_status)}</td></tr>"
    end
    f << "</tbody>"
    f << "</table>"
  end

  f << "<h2>Results</h2>"
  f << "<table class='table'>"
  f << "<thead><tr><th>Status</th><th>Total</th></tr></thead>"
  f << "<tbody id='results'></tbody>"
  f << "</table>"

  f << "</div>"
  f << "</body>"
  f << "</html>"
}
