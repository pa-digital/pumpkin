# Gherkin Test Report

This application generates a test report directly from your gherkin feature files, so that your scenarios can be used as tests without the need for automation with Cucumber. If you have already automated some of your scenarios, the script accepts a Cucumber report (JSON) and it will pre-selet the pass/fail status of those implemented scenarios so that you can fill in the rest manually.

## Installation

1. Clone the repo
2. Run `bundle install` to install the dependencies

## Usage

Run the script as follows:

    $ ruby gherkin-test-report.rb --features /path/to/your/features/directory

The script accepts the following arguments:

* `--features` (or `-f`) is the path to a local directory of gherkin feature files
* `--cucumberjson` (or `-c`) is the path to a local JSON file containing a Cucumber test report (optional)
* `--open` (or `-o`) to open the HTML report in your browser after the script completes

## Example

![Example report](screenshot.png)
