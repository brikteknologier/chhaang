this.DEBUG = true;
$(document).ready(function() {
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

  function staggerSearch(ms, fn) {
    var timeout = null;
    return function keyUp(evt) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      if (evt.keyCode == 13) // Enter is shortcut
        return fn(true);

      timeout = setTimeout(function() {
        timeout = null;
        fn();
      }, ms);
    }
  }

  var lastQuery = null;
  function search(force) {
    var query = $('#searchInput').val();
    if (!force && query == lastQuery) return;
    lastQuery = query;
    var url = '/api/videos/?';
    if (query != '')
      url = '/api/videos/search?q=' + encodeURIComponent(query) + '&';
    url += 'limit=20&order_by=created';
    $.getJSON(url, showSearchResults).fail(function(jqXHR, textStatus, error) {
      if (jqXHR.status == 401) {
        var loginUrl = "/auth/login";
        var here = encodeURIComponent(window.location.href);
        window.location.href = loginUrl + "?redirect=" + here;
      }
    });
  }

  function clickThumbnail(video) {
    $('#videoSelected').show();
    var el = generateEmbedElement(video);
    setElementProps(
      el,
      300,
      169,
      $('#backgroundInput').val()
    );
    var videoContainer = $('#videoSelected .video');
    videoContainer.html('').append(el);
  }

  function showSearchResults(videos) {
    function createElement(video, idx) {
      return $('<span>')
        .addClass('thumbnail')
        .append([
          $('<div>').addClass('poster').append(
            $('<img>').attr('src', video.poster)
          ),
          $('<span>').addClass('title').html(video.title)
        ])
        .attr('title', video.title)
        .click(function() {
          clickThumbnail(video);
        });
    }
    $('#searchResults').html('');
    $('#searchResults').append($.map(videos, createElement));
    // DEBUG
    clickThumbnail(videos[0]);
  }

  $('#searchInput').on('keyup', staggerSearch(2000, search));

  function setElementProps(element, width, height, background) {
    if (!/^#[0-9a-fA-F]{3,6}$/.test(background))
      background = '#000';
    element.children('iframe')
      .attr('width', width)
      .attr('height', height)
      .attr('background', background);
    element.attr('style',
                 'width: ' + width + 'px; ' +
                 'height: ' + height + 'px; ' +
                 'background: ' + background + ';');
  }

  function getInsertionElement() {
    var elHtml = $('#videoSelected .video').html();
    var el = $(elHtml);
    setElementProps(
      el,
      $('#widthInput').val(),
      $('#heightInput').val(),
      $('#backgroundInput').val()
    );
    return el;
  }

  function generateEmbedElement(video) {
    var siteBase = /:\/\/([^\/]*)/.exec(window.location.href)[1];
    var urlBase = 'http://' + siteBase;
    
    // Dummy width, height, background.  Will be set properly on setEditorPreview.
    var element = $('<div style="width: 0px; height: 0px; background: #000;">');
    var videoFrame = $('<iframe width="0" height="0" src="' + urlBase + '/video/embed/' + video.uuid + '" frameborder="0"></iframe>');
    element.append(videoFrame);

    return element;
  }

  $('#insertButton').click(function() {
    var element = getInsertionElement();
    AppAPI.Editor.insertElement(element);
  });

  AppAPI.addListeners({
    // triggers each time an element from this app is selected
    pluginElementSelected: function(data) {
      AppAPI.Editor.getHTMLById(data.id, function(element) {
        $('#title').html('Last selected element: ' + $(element).text());
      });
    }
  });

  search();
});
