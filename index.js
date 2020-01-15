#!/usr/bin/env node

const args = require("yargs").argv;
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const gherkin = require("gherkin");
const escapeHtml = require("escape-html");
const colours = require("colors");
const jsdom = require("jsdom");
const shell = require("shelljs");

const { JSDOM } = jsdom;
const FEATURE_FILE_PATH = args.features;
const CUCUMBER_REPORT = args.cucumberjson;
const HTML_REPORT = args.reporthtml;
const OPEN_AFTER = args.open;
const TITLE = args.title;
const DATE = args.date;
const NOTES = args.notes;
const EXCLUDE_TAGS = args.exclude;
const OUTPUT_DIRECTORY = path.resolve("pumpkin", ".");
const OUTPUT_FILE = path.resolve(`${OUTPUT_DIRECTORY}/report.html`, ".");
const STATUS_TYPES = ["Not run", "Descoped", "In Progress", "Passed", "Failed", "Blocked"];

function printOkMessage(message) {
  console.log(message.green);
}

function printMessage(message) {
  console.log(message);
}

function exitWithError(message) {
  console.log(message.red);
  process.exit(1);
}

function loadCucumberJson() {
  if (!CUCUMBER_REPORT) return;
  if (!fs.existsSync(CUCUMBER_REPORT)) {
    exitWithError(`${CUCUMBER_REPORT} could not be found`);
  }
  return JSON.parse(fs.readFileSync(CUCUMBER_REPORT));
}

function featureScenarios(feature) {
  return feature.children.filter(c => c.type === "Scenario" || c.type === "ScenarioOutline");
}

function loadHtmlReport() {
  if (!HTML_REPORT) return;
  if (!fs.existsSync(HTML_REPORT)) {
    exitWithError(`${HTML_REPORT} could not be found`);
  }
  return new JSDOM(fs.readFileSync(HTML_REPORT).toString());
}

function loadFeatureFiles() {
  let files = glob.sync(`${FEATURE_FILE_PATH}/**/*.feature`);

  if (files.length === 0) {
    exitWithError(`No feature files found in ${FEATURE_FILE_PATH}`);
  }

  files = files.map((file, i) => {
    const featureFile = gherkinParser.parse(fs.readFileSync(file, "utf8"));
    const feature = featureFile.feature;
    let order = feature.tags.map(tag => tag.name).find(tag => tag.startsWith("@report-order-"));
    order = order ? parseInt(order.replace(/^@report-order-/, "")) : 999 + i;
    return {
      feature: feature,
      order: order
    };
  });

  return files
    .sort((a, b) => a.order - b.order)
    .map(f => {
      printMessage(
        `+ Found feature '${f.feature.name}' with ${featureScenarios(f.feature).length} scenarios`
      );
      return f.feature;
    });
}

function isExcludedByTag(tags) {
  if (!EXCLUDE_TAGS) return;
  return tags.map(tag => tag.name).filter(tag => EXCLUDE_TAGS.split(" ").includes(tag)).length;
}

function scenarioStatus(featureName, scenarioName) {
  let status = "";

  // attempt to get the status from a Cucumber test run
  if (cucumberReport) {
    cucumberReport.forEach(feature => {
      if (feature.name.trim() !== featureName.trim()) return;
      feature.elements.forEach(scenario => {
        if (scenario.name.trim() !== scenarioName.trim()) return;
        scenario.steps.forEach(step => {
          // if one previous step has already failed, the whole scenario has failed
          if (status === "failed") return;
          status = step.result.status;
        });
      });
    });
  }

  // attempt to get the status from an HTML report
  if (htmlReport) {
    if (status === "") {
      const selectedStatus = htmlReport.window.document.querySelector(
        `.scenario[data-scenario-name="${scenarioName.toLowerCase()}"] .scenario-status option:checked`
      );
      if (selectedStatus) status = selectedStatus.value;
    }
  }

  return status.toLowerCase();
}

function formatStatus(status) {
  return `<span class='scenario-status-print'></span>${scenarioStatusDropdown(status)}`;
}

function featureStatusDropdown() {
  return `<select class='feature-status custom-select' style='width:130px;'><option value=''>Change all</option>${STATUS_TYPES.map(
    s => `<option value="${s.toLowerCase()}">${s}</option>`
  ).join("")}</select>`;
}

function scenarioStatusDropdown(status) {
  return `<select class='scenario-status custom-select' style='width:130px;'>${STATUS_TYPES.map(
    s =>
      `<option value="${s.toLowerCase()}" ${
        s.toLowerCase() === status ? 'selected="selected"' : ""
      }>${s}</option>`
  ).join("")}</select>`;
}

function uppercaseFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatDataTable(table) {
  let html = '<table class="table table-sm text-muted">';
  table.rows.forEach(row => {
    if (row.type === "TableRow") {
      html += "<tr>";
      html += row.cells.map(c => `<td class="small">${c.value}</td>`).join("");
      html += "</tr>";
    }
  });
  html += "</table>";
  return html;
}

function formatExampleTable(table) {
  let html = '<div class="scenario-example">';
  html += '<table class="table table-sm text-muted">';
  if (table.description) {
    html += `<caption class="small text-muted">${table.description}</caption>`;
  }
  if (table.tableHeader) {
    html += "<tr>";
    html += table.tableHeader.cells.map(c => `<th class="small">${c.value}</th>`).join("");
    html += "</tr>";
  }
  if (table.tableBody) {
    table.tableBody.forEach(row => {
      html += "<tr>";
      html += row.cells.map(c => `<td class="small">${c.value}</td>`).join("");
      html += "</tr>";
    });
  }
  html += "</table>";
  html += "</div>";
  return html;
}

function formatSteps(scenario) {
  let html = '<p class="scenario-steps small text-muted">';
  scenario.steps.forEach(step => {
    html += `<span class="scenario-step">${step.keyword} ${escapeHtml(step.text)}</span>`;
    if (step.argument) {
      if (step.argument.type === "DocString") {
        html += `<span class="scenario-doc-string">${step.argument.content}</span>`;
      } else if (step.argument.type === "DataTable") {
        html += formatDataTable(step.argument);
      }
    }
  });
  html += "</p>";
  if (scenario.examples) {
    html += scenario.examples.map(example => formatExampleTable(example));
  }
  return html;
}

function formatScenarios(featureName, items) {
  let html = "";
  items.forEach((scenario, i) => {
    if (isExcludedByTag(scenario.tags)) {
      printMessage(`- Excluding scenario '${scenario.name}' based on tag`);
      return;
    }
    const status = scenarioStatus(featureName, scenario.name);
    html += `<tr class='scenario' data-scenario-name="${scenario.name.toLowerCase()}">
      <td style='width:1px' class='text-muted index'></td>
      <td>
        <button class='btn btn-outline-secondary btn-sm float-right remove-scenario' tabindex='-1'>Remove scenario</button>
        <p class="scenario-title">${uppercaseFirst(scenario.name)}</p>
        ${formatTags(scenario.tags, "dark")}
        ${formatSteps(scenario)}
      </td>
      <td style='width:1px'>${formatStatus(status)}</td>
    </tr>`;
  });
  return html;
}

function formatTags(tags, type = "primary") {
  if (!tags.length) return "";
  return `<div class="tags">${tags
    .map(tag => `<span class='badge badge-${type}'>${tag.name}</span>`)
    .join("")}</div>`;
}

const gherkinParser = new gherkin.Parser();
const cucumberReport = loadCucumberJson();
const htmlReport = loadHtmlReport();
const featureFiles = loadFeatureFiles();

const now = `${new Date().getDate()}/${new Date().getMonth() +
  1}/${new Date().getFullYear()} ${new Date().getHours()}:${new Date().getMinutes()}`;

let report = `
<html>
<head>
  <meta charset='utf-8'/>
  <style type='text/css'>${fs.readFileSync(
    path.join(__dirname, "assets/bootstrap.min.css")
  )}</style>
  <style type='text/css'>${fs.readFileSync(path.join(__dirname, "assets/application.css"))}</style>
  <script>window.STATUS_TYPES = ${JSON.stringify(STATUS_TYPES.map(s => s.toLowerCase()))};</script>
  <script>${fs.readFileSync(path.join(__dirname, "assets/jquery.js"))}</script>
  <script>${fs.readFileSync(path.join(__dirname, "assets/application.js"))}</script>
</head>
<body>
  <iframe id='iframe' style='display:none;'></iframe>
  <div class='container'>
    <span class='logo'></span>
    <h1>Test Report<br><span class='report-title-print text-muted'></span><span class='report-date-print text-muted'></span></h1>
    <div class='form-group'><input type='text' placeholder='Project Name' class='form-control report-title' value='${
      TITLE ? TITLE : ""
    }'/></div>
    <div class='form-group'><input type='text' placeholder='Date' class='form-control report-date' value='${
      DATE ? DATE : now
    }'/></div>
    <div class='form-group'><textarea class='form-control report-description' placeholder='Notes'>${
      NOTES ? NOTES.split("\n").join("<br>") : ""
    }</textarea></div>
    <div class='form-group'><div class='form-check'><input class='form-check-input' type='checkbox' value='yes' id='print-steps'><label class='form-check-label' for='print-steps'>Print scenario steps</label></div></div>
    <div class='form-group'><a target='iframe' download='pumpkin-report.html' href='#' onclick='saveHTML();' class='btn btn-primary save-report'>Save HTML</a></div>
    <h3>Summary</h3>
    <p class='report-description-print'></p>
    <table class='table'>
      <thead><tr><th>Status</th><th>Total <span class='text-muted'>(<span class='total'></span>)</span></th></tr></thead>
      <tbody id='results'></tbody>
    </table>`;

featureFiles.forEach(featureFile => {
  if (isExcludedByTag(featureFile.tags)) {
    printMessage(`- Excluding feature '${featureFile.name}' based on tag`);
    return;
  }
  report += `<div class='feature'>
    <div class='feature-header'>
      <div class='float-left'>
        <h3>Feature: ${featureFile.name}</h3>
        ${formatTags(featureFile.tags)}
      </div>
      <div class='float-right feature-actions'>
        <button class='btn btn-outline-secondary btn-sm remove-feature'>Remove feature</button>
        <div class='float-right'>${featureStatusDropdown()}</div>
      </div>
    </div>
    <table class='table table-condensed'>
      <thead><th colspan='2'>Scenario</th><th style='width:1px'>Status</th></thead>
      <tbody>${formatScenarios(featureFile.name, featureScenarios(featureFile))}</tbody>
    </table>
  </div>`;
});

report += `</div></body></html>`;

// create the output directory if it doesn't exist
fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

// write the report file
fs.writeFileSync(OUTPUT_FILE, report, "utf8");

printOkMessage(`Report generated at ${OUTPUT_FILE}`);

if (OPEN_AFTER) shell.exec(`open ${OUTPUT_FILE}`);
