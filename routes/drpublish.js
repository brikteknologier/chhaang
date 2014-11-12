var Controller = require('controller');

var aptomaAuthHandler = require('node-aptoma-plugin-auth')(
  'brik-video',
  'DrPublish',
  function pluginUrl(req) {
    return 'https://' + (req.hostname || req.host) + req.path;
  }
);

module.exports = function(settings) {
  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function (req, res) {
    res.render('drpublish/index', settings);
  });
  
  controller.define('plugin', function (req, res) {
    res.render('drpublish/plugin', settings);
  });
  
  controller.define('auth', aptomaAuthHandler);

  controller.define('secretPage', [ 'auth' ], function(req, res, next) {
    app.kvass('/api/videos/mine', { headers: req.headers }, function(err, data) {
      if (err) return next(err);
      res.send(data);
    });
  });
  
  controller.get('/index', 'index');
  controller.get('/plugin', 'plugin');
  controller.get('/authenticate', 'auth');
  controller.get('/secret', 'secretPage');

  return controller;
}
