this.DEBUG = true;
$(document).ready(function() {
  var currentlyEditing = null;
  var lastQuery = null;
  var searchLimit = 20;
  var searchSkip = 0;
  var videoSelected = false;

  function initApp() {
    function getParameterByName(name) {
      name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
      return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    // register name of the app, sent as a paramter in the iframe url
    var name = getParameterByName('appName');
    AppAPI.setAppName(name);
    // App already authenticated in index frame
    AppAPI.authenticated = true;
  }
    
  function staggerSearch(ms, fn) {
    var timeout = null;
    return function keyUp(evt) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      if (evt.keyCode == 13) { // Enter is shortcut
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
    var url = '/api/videos/?';
    if (query != '')
      url = '/api/videos/search?q=' + encodeURIComponent(query) + '&';
    url += 'limit=' + searchLimit + '&order_by=created&skip=' + searchSkip;
    $.getJSON(url, showSearchResults).fail(function(jqXHR, textStatus, error) {
      if (jqXHR.status == 401) {
        var loginUrl = "/auth/login";
        var here = encodeURIComponent(window.location.href);
        window.location.href = loginUrl + "?redirect=" + here;
      }
    });
  }

  function clickThumbnail(video, element) {
    $('.thumbnail').removeClass('selected');
    $(element).addClass('selected');
    videoSelected = true;
    $('#videoSelected').show();
    var el = generateEmbedElement(video);
    setElementProps(
      el,
      300,
      169
    );
    var videoContainer = $('#videoSelected .video');
    $('#videoSelected .title').text(video.title);
    videoContainer.html('').append(el);
  }

  function showSearchResults(videos) {
    function createElement(video, idx) {
      var thumbnailElement = $('<span>')
        .addClass('thumbnail')
        .append([
          $('<div>').addClass('poster').append(
            $('<img>').attr('src', video.poster)
          ),
          $('<span>').addClass('title').html(video.title)
        ])
        .attr('title', video.title)
        .click(function(evt) {
          clickThumbnail(video, evt.currentTarget);
        });
      if (!videoSelected)
        thumbnailElement.click();
      return thumbnailElement;
    }
    var sr = $('#searchResults');
    sr.html('');

    if (searchSkip) {
      var prevPageElement = $('<span>')
        .addClass('paginationButton')
        .text('Previous page');
      prevPageElement.click(prevPage);
      sr.append(prevPageElement);
    }

    sr.append($.map(videos, createElement));

    if (videos.length >= searchLimit) {
      var nextPageElement = $('<span>')
        .addClass('paginationButton')
        .text('Next page');
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

  function setElementProps(element, width, height) {
    element.children('iframe')
      .attr('width', width)
      .attr('height', height);
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
      $('#heightInput').val()
    );
    return el;
  }

  function generateEmbedElement(video) {
    var siteBase = /:\/\/([^\/]*)/.exec(window.location.href)[1];
    var urlBase = 'http://' + siteBase;
    
    // Dummy width, height.  Will be set properly on setEditorPreview.
    var element = $('<div style="width: 0px; height: 0px;">');
    var videoFrame = $('<iframe width="0" height="0" src="' + urlBase + '/video/embed/' + video.uuid + '" frameborder="0"></iframe>');
    element.append(videoFrame);

    return element;
  }

  // --- init ---

  $('#searchInput').on('keyup', staggerSearch(2000, search));

  $('#insertButton').click(function() {
    var element = getInsertionElement();
    AppAPI.Editor.insertElement(element);
  });

  initApp();

  search();
});
