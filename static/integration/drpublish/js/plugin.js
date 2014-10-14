this.DEBUG = true;
$(document).ready(function() {
  function getValue() {
    return $('#textInput').val();
  }

  $('#textButton').click(function() {
    value = getValue();
    if (value === null) {
      AppAPI.showInfoMsg('I shall not insert an empty thing, that would just be silly');
      return false;
    }
    // insert a string at the current cursor position
    AppAPI.Editor.insertString(value);
  });

  $('#objectButton').click(function() {
    // insert an element at the current cursor position, adding required parameters to make it draggable and non-editable
    height = this.APPSETTINGS.height;
    width = this.APPSETTINGS.width;
    background = this.APPSETTINGS.background;
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
});
