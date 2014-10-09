var aptomaAuthHandler = require('node-aptoma-plugin-auth')(
  'brik-video',
  'DrPublish'
);

module.exports = function(controller) {
  var app = controller.app;

  controller.define('drpublishIndex', function (req, res) {
    res.render('drpublish/index', app.settings);
  });
  
  controller.define('drpublishAuth', aptomaAuthHandler);
  
  controller.get('/integration/drpublish/index', 'drpublishIndex');
  controller.get('/integration/drpublish/authenticate', 'drpbublishAuth');
}
