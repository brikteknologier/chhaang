var Controller = require('controller');

var aptomaAuthHandler = require('node-aptoma-plugin-auth')(
  'brik-video',
  'DrPublish',
  function pluginUrl(req) {
    return 'https://' + (req.hostname || req.host) + req.path;
  }
);

module.exports = function(app) {
  var controller = Controller();
  controller.app = app;

  controller.define('drpublishIndex', function (req, res) {
    res.render('drpublish/index', app.settings);
  });
  
  controller.define('drpublishAuth', aptomaAuthHandler);

  controller.define('secretPage', [ 'auth' ], function(req, res, next) {
    app.kvass('/api/videos/mine', { headers: req.headers }, function(err, data) {
      if (err) return next(err);
      res.send(data);
    });
  });
  
  controller.get('/index', 'drpublishIndex');
  controller.get('/authenticate', 'drpublishAuth');
  controller.get('/secret', 'secretPage');

  return controller;
}
