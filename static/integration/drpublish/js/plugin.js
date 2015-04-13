this.DEBUG = true;
$(document).ready(function() {
  var currentlyEditing = null;
  var lastQuery = null;
  var searchLimit = 21;
  var searchSkip = 0;
  var videoSelected = false;
  var assumedChaptersWidth = 220;

  function initApp() {
    function getParameterByName(name) {
      name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
      return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    // register name of the app, sent as a paramter in the iframe url
    var name = getParameterByName('appName');
    PluginAPI.setAppName(name);
    // App already authenticated in index frame
    PluginAPI.authenticated = true;
  }

  function staggerThumbnailUpdate(ms, fn) {
    var timeout = null;
    return function() {
      if (timeout) return;
      
      timeout = setTimeout(function() {
        timeout = null;
        fn();
      }, ms);
    }
  }
    
  function staggerSearch(ms, fn) {
    var timeout = null;
    return function keyUp(evt) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      if (evt.keyCode == 13) { // Enter is shortcut to clear pagination and bypass stagger
        searchSkip = 0;
        return fn(true);
      }

      timeout = setTimeout(function() {
        timeout = null;
        fn();
      }, ms);
    }
  }

  function search(force) {
    var query = $('#searchInput').val();
    if (!force && query == lastQuery) return;
    if (query != lastQuery)
      searchSkip = 0;
    lastQuery = query;
    var url = '/integration/drpublish/search?q=' + encodeURIComponent(query) + '&';
    url += 'limit=' + searchLimit + '&order_by=created&order_dir=desc&skip=' + searchSkip;
    $.getJSON(url, showSearchResults).fail(function(jqXHR, textStatus, error) {
      if (jqXHR.status == 401) {
        var loginUrl = "/auth/login";
        var here = encodeURIComponent(window.location.href);
        window.location.href = loginUrl + "?redirect=" + here;
      }
    });
  }

  function updateThumbnail() {
    var widthSansChapters = parseInt($('#widthInput').val(), 10);
    if ($('#chaptersInput').prop('checked'))
      widthSansChapters -= assumedChaptersWidth;
    var ratio = widthSansChapters / parseInt($('#heightInput').val(), 10);
    var el = $('#videoSelected .video div');
    var thumbnailHeight = 180;
    setElementProps(
      el,
      Math.floor(thumbnailHeight * ratio),
      thumbnailHeight,
      false // Chapters do not scale - makes thumbnail distorted
    ); 
    console.log($('#chaptersInput').val());
    var videoContainer = $('#videoSelected .video');
    videoContainer.html('').append(el);
 }

  function clickThumbnail(video, element) {
    $('.result-element').removeClass('selected');
    $(element).addClass('selected');
    videoSelected = true;
    $('#videoSelected').show();

    var videoContainer = $('#videoSelected .video');
    var el = generateEmbedElement(video);
    videoContainer.html('').append(el);

    updateThumbnail();

    var collectedTags = $.map(video.tags || [], function(x){return x.tag}).join(', ');
    $('#videoSelected .title').text(video.title || '(untitled)');
  }

  function showSearchResults(videos) {
    function createElement(video, idx) {
      var element = $('<div>')
        .addClass('result-element')
        .append([
          $('<span>').addClass('poster').append(
            $('<img>').attr('src', video.poster)
          ),
          $('<div>').addClass('title').html(video.title),
          $('<div>').addClass('by-uploaded').append([
            $('<span>').addClass('label').html('Av:'),
            $('<span>').addClass('author').html(video.author.name),
            $('<span>').addClass('age').html(video.prettyAge)
          ]),
          $('<div>').addClass('description').html(video.desc)
        ])
        .attr('title', "Publisert i " + video.area.name)
        .click(function(evt) {
          clickThumbnail(video, evt.currentTarget);
        });
      if (!videoSelected)
        element.click();
      return element;
    }
    var sr = $('#searchResults');
    sr.html('');

    if (searchSkip) {
      var prevPageElement = $('<span>')
        .addClass('paginationButton')
        .text('previous page');
      prevPageElement.click(prevPage);
      sr.append(prevPageElement);
    }

    sr.append($.map(videos, createElement));

    if (videos.length >= searchLimit) {
      var nextPageElement = $('<span>')
        .addClass('paginationButton')
        .text('next page');
      nextPageElement.click(nextPage);
      sr.append(nextPageElement);
    }

    if (!videos.length && !searchSkip) {
      sr.text('No matching videos found.');
    }
  }

  function nextPage() {
    searchSkip += searchLimit;
    search(true);
  }

  function prevPage() {
    searchSkip -= searchLimit;
    if (searchSkip < 0)
      searchSkip = 0;
    search(true);
  }

  function setElementProps(element, width, height, enableChapters) {
    var ife = element.children('iframe');

    ife.attr('width', width);
    ife.attr('height', height);

    var src = ife.attr('src').replace(/\?chapters=on$/, '');
    if (enableChapters)
      src += "?chapters=on";
    ife.attr('src', src);

    element.attr('style',
                 'width: ' + width + 'px; ' +
                 'height: ' + height + 'px; ' +
                 'background: ' + STATIC_BACKGROUND + ';');
  }

  function getInsertionElement() {
    var elHtml = $('#videoSelected .video').html();
    var el = $(elHtml);
    setElementProps(
      el,
      $('#widthInput').val(),
      $('#heightInput').val(),
      $('#chaptersInput').prop('checked')
    );
    return el;
  }

  function generateEmbedElement(video) {
    var siteBase = /:\/\/([^\/]*)/.exec(window.location.href)[1];
    var urlBase = '//' + siteBase;
    
    // Dummy width, height.  Will be set properly on setElementProps.
    var element = $('<div style="width: 0px; height: 0px;">');
    var videoFrame = $('<iframe width="0" height="0" src="' + urlBase + '/video/embed/' + video.uuid + '" frameborder="0"></iframe>');
    element.append(videoFrame);

    return element;
  }

  function disableInsertion() {
    $('#insertButton')
      .addClass('disabled')
      .attr('title', 'Click a valid insert position in editor first.');
  }

  function enableInsertion() {
    $('#insertButton')
      .removeClass('disabled')
      .attr('title', '');
  }

  function checkEditorType() {
    PluginAPI.Editor.getEditorType(function(type) {
      if (type == null || type == 'text') {
        disableInsertion();
      } else {
        enableInsertion();
      }
    });
  }

  function chaptersCheckboxChanged() {
    var width = parseInt($('#widthInput').val(), 10);
    if ($('#chaptersInput').prop('checked'))
      width += assumedChaptersWidth;
    else
      width -= assumedChaptersWidth;
    $('#widthInput').val(width);
  }

  // --- init ---

  var staggeredSearch = staggerSearch(2000, search);
  $('#searchInput').on('keyup', staggeredSearch);
  // Search icon click emulate enter on #searchInput text field
  $('#searchIcon').on('click', function() { staggeredSearch({keyCode: 13}); });

  $('#insertButton').click(function() {
    if ($('#insertButton').hasClass('disabled'))
      return;
    var element = getInsertionElement();
    PluginAPI.Editor.insertElement(element);
  });

  $(".buttons input[type=number]").on('change', staggerThumbnailUpdate(1000, updateThumbnail));
  $(".buttons input[type=checkbox]").on('change', chaptersCheckboxChanged);

  initApp();

  PluginAPI.on('editorFocus', checkEditorType);
  PluginAPI.on('editorsLostFocus', disableInsertion);

  checkEditorType();
  search();
});
