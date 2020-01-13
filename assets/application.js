function markdown(string) {
  function e(e) {
    return e.replace(RegExp("^" + (e.match(/^(\t| )+/) || "")[0], "gm"), "")
  }

  function n(e) {
    return (e + "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  function r(a) {
    function c(e) {
      var n = t[e.replace(/\*/g, "_")[1] || ""],
        r = i[i.length - 1] == e;
      return n ? n[1] ? (i[r ? "pop" : "push"](e), n[0 | r]) : n[0] : e
    }

    function o() {
      for (var e = ""; i.length;) e += c(i[i.length - 1]);
      return e
    }
    var l, g, s, p, u, m = /((?:^|\n+)(?:\n---+|\* \*(?: \*)+)\n)|(?:^```(\w*)\n([\s\S]*?)\n```$)|((?:(?:^|\n+)(?:\t|  {2,}).+)+\n*)|((?:(?:^|\n)([>*+-]|\d+\.)\s+.*)+)|(?:\!\[([^\]]*?)\]\(([^\)]+?)\))|(\[)|(\](?:\(([^\)]+?)\))?)|(?:(?:^|\n+)([^\s].*)\n(\-{3,}|={3,})(?:\n+|$))|(?:(?:^|\n+)(#{1,3})\s*(.+)(?:\n+|$))|(?:`([^`].*?)`)|(  \n\n*|\n{2,}|__|\*\*|[_*])/gm,
      i = [],
      h = "",
      f = 0,
      $ = {};
    for (a = a.replace(/^\[(.+?)\]:\s*(.+)$/gm, function (e, n, r) {
      return $[n.toLowerCase()] = r, ""
    }).replace(/^\n+|\n+$/g, ""); s = m.exec(a);) g = a.substring(f, s.index), f = m.lastIndex, l = s[0], g.match(/[^\\](\\\\)*\\$/) || (s[3] || s[4] ? l = '<pre class="code ' + (s[4] ? "poetry" : s[2].toLowerCase()) + '">' + e(n(s[3] || s[4]).replace(/^\n+|\n+$/g, "")) + "</pre>" : s[6] ? (u = s[6], u.match(/\./) && (s[5] = s[5].replace(/^\d+/gm, "")), p = r(e(s[5].replace(/^\s*[>*+.-]/gm, ""))), ">" === u ? u = "blockquote" : (u = u.match(/\./) ? "ol" : "ul", p = p.replace(/^(.*)(\n|$)/gm, "<li>$1</li>")), l = "<" + u + ">" + p + "</" + u + ">") : s[8] ? l = '<img src="' + n(s[8]) + '" alt="' + n(s[7]) + '">' : s[10] ? (h = h.replace("<a>", '<a href="' + n(s[11] || $[g.toLowerCase()]) + '">'), l = o() + "</a>") : s[9] ? l = "<a>" : s[12] || s[14] ? (u = "h" + (s[14] ? s[14].length : "=" === s[13][0] ? 1 : 2), l = "<" + u + ">" + r(s[12] || s[15]) + "</" + u + ">") : s[16] ? l = "<code>" + n(s[16]) + "</code>" : (s[17] || s[1]) && (l = c(s[17] || "--"))), h += g, h += l;
    return (h + a.substring(f) + o()).trim()
  }
  var t = {
    "": ["<em>", "</em>"],
    _: ["<strong>", "</strong>"],
    "\n": ["<br />"],
    " ": ["<br />"],
    "-": ["<hr />"]
  };

  return r(string);
}

function slugify(text) {
  return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

function saveHTML(e) {
  var note = document.getElementsByTagName('html')[0].outerHTML;
  note = note.replace(/&nbsp;/g, ' ');
  note = note.replace(/&amp;/g, '&');
  note = note.replace(/&lt;/g, '<');
  note = note.replace(/&gt;/g, '>');
  document.getElementsByClassName('save-report')[0].setAttribute('href', 'data:Content-Type:text/html, ' + escape(note));
  return false;
}

function handleFeatureSelectChange(e) {
  var select = $(e.target);
  var value = select.val();
  if (!value) return;
  var featureTable = select.parents('.feature').find('table')
  featureTable.find('select.scenario-status').val(value);
  select.val('');
  recalculateStatusTotals();
}

function handleScenarioSelectChange(e) {
  var select = $(e.target);
  var value = select.val();
  select.find('option:selected').attr('selected', 'selected');
  recalculateStatusTotals();
}

function handleTitleChange(e) {
  var input = $(e.target);
  var text = input.val();
  input.attr('value', text);
  $('.report-title-print').html(text);
  setFileName();
}

function handleDateChange(e) {
  var input = $(e.target);
  var text = input.val();
  input.attr('value', text);
  $('.report-date-print').html(text.trim());
  setFileName();
}

function handleDescriptionChange(e) {
  var input = $(e.target);
  var text = input.val();
  input.get(0).innerText = text;
  $('.report-description-print').html(markdown(text));
}

function handleRemoveFeatureClick(e) {
  e.preventDefault();
  $(e.target).parents('.feature:first').fadeOut(function () {
    $(this).remove();
    recalculateStatusTotals();
  });
}

function handleRemoveScenarioClick(e) {
  e.preventDefault();
  $(e.target).parents('tr').fadeOut(function () {
    $(this).remove();
    recalculateStatusTotals();
  });
}

function handlePrintStepsChange(e) {
  if ($(this).val() == 'yes') {
    $('body').addClass('print-scenario-steps');
  } else {
    $('body').removeClass('print-scenario-steps');
  }
}

function statusColour(status) {
  var statusTypeColours = ["", "secondary", "info", "success", "danger", "warning", "info"];
  var statusTypes = window.STATUS_TYPES;
  return statusTypeColours[statusTypes.indexOf(status)];
}

function recalculateStatusTotals() {
  var scenarios = $('.scenario');
  var statusTypes = window.STATUS_TYPES;
  var totalScenarios = scenarios.length;

  $.each(scenarios, function (i) {
    var rowStatus = $(this).find('input, select').val();
    $(this).find('.index').html(i + 1);
    $(this).find('.scenario-status-print').html(rowStatus).attr('class', 'scenario-status-print badge badge-' + statusColour(rowStatus));
    $(this).attr('class', 'scenario table-' + statusColour(rowStatus));
  });

  $('.total').text(totalScenarios);

  var results = $('#results').empty();
  $.each(statusTypes, function (i, status) {
    var count = 0;
    $(scenarios).each(function () {
      var rowStatus = $(this).find('input, select').val();
      if (status === rowStatus) count++;
    });
    results.append('<tr class=table-' + statusColour(status) + '><td><span class="badge badge-' + statusColour(status) + '">' + status + '</span></td><td>' + count + ' <span class="text-muted small">(' + ((count / totalScenarios) * 100).toFixed(1) + '%)</td></tr>');
  });
}

function setFileName() {
  var title = $('.report-title').val();
  var date = $('.report-date').val();
  $('.save-report').attr('download', 'test-report-' + slugify(title) + '-' + slugify(date) + '.html');
}

$(function () {
  $('select.feature-status').on('change', handleFeatureSelectChange);
  $('select.scenario-status').on('change', handleScenarioSelectChange);
  $('.report-title').on('change', handleTitleChange).trigger('change');
  $('.report-date').on('change', handleDateChange).trigger('change');
  $('.report-description').on('change', handleDescriptionChange).trigger('change');
  $('.remove-feature').on('click', handleRemoveFeatureClick);
  $('.remove-scenario').on('click', handleRemoveScenarioClick);
  $('#print-steps').on('change', handlePrintStepsChange);
  recalculateStatusTotals();
});
