# Cucumber reporter

This application merges a Cucumber output report (from an automation suite) with a complete list of features and scenarios. It allows a tester to add the status for each scenario that is being tested manually.

## Installation

1. Clone the repo
2. Run `bundle install` to install the dependencies

## Set up Jenkins authentication

The script pulls files directly out of Jenkins. Jenkins needs a username/password to log in, so you need to tell the script which details to authenticate with. To set this up:

1. Log into Jenkins and click your username in the top right to view your profile
2. Click "Configure" in the left navigation
3. Under "API Token" click "Add new token" and give it a sensible description that describes this repo e.g. "Cucumber report generator"
4. Copy the generated token to your clipboard
5. Duplicate the file `.env.example` to `.env`
6. Paste your token as the value for `JENKINS_API_KEY`, and your Jenkins username (firstname.lastname) for `JENKINS_USERNAME`

## Usage

The script takes two input parameters:

1. The URL of a Cucumber report
2. The local path to your Gherkin feature files

To find the Cucumber report, navigate to the test run in Jenkins (e.g. https://jenkins2.tools.fridayengineering.net/view/Aetna/job/aetna-vhealth-web-auto-tests/491/) and click "Cucumber reports" in the left navigation. This gives you the HTML report, but this scrpt needs the report in JSON format. To get this, strip the URL back to the `/cucumber-html-reports` section, and add the following to the URL: `.cache/json/cucumber.json`. This should show you a JSON file in the browser.

Example:

    ruby ./report.rb https://jenkins2.tools.fridayengineering.net/view/Aetna/job/aetna-vhealth-web-auto-tests/lastCompletedBuild/cucumber-html-reports/.cache/json/cucumber.json ~/src/aetna-vhealth-auto-tests/features
