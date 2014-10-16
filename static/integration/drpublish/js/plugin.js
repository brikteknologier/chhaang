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
        return fn();

      timeout = setTimeout(function() {
        timeout = null;
        fn();
      }, ms);
    }
  }

  function search() {
    var query = $('#searchInput').val();
    var url = '/api/videos/?';
    if (query != '')
      url = '/api/videos/search?q=' + encodeURIComponent(query) + '&';
    url += 'limit=20&order_by=created';
    $.getJSON(url, showSearchResults);
  }

  function showSearchResults(videos) {
    function createElement(video) {
      console.log(video);
      return $('<span>')
        .addClass('thumbnail')
        .append([
          $('<img>').attr('src', video.poster),
          $('<span>').addClass('title').html(video.title)
        ])
        .attr('title', video.title);
    }
    $('#searchResults').html('');
    $('#searchResults').append($.map(videos, createElement));
  }

  var staggeredSearch = staggerSearch(2000, search);
  $('#searchInput').on('keyup', staggeredSearch);

  $('#objectButton').click(function() {
    // insert an element at the current cursor position, adding required parameters to make it draggable and non-editable
    var height = window.APPSETTINGS.height;
    var width = window.APPSETTINGS.width;
    var background = window.APPSETTINGS.background;
    var element = $('<div style="width: ' + width + 'px; height: ' + height + 'px; background: ' + background + ';">');
    var videoFrame = $('<iframe width="' + width + '" height="' + height + '" src="http://johanna.brik.no/video/embed/e46ae1f3-023a-419b-a963-222c6222813c" frameborder="0"></iframe>');
    element.append(videoFrame);

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
