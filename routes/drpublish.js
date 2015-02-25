var Controller = require('controller');

var aptomaAuthHandler = require('node-aptoma-plugin-auth')(
  'brik-video',
  'DrPublish',
  function pluginUrl(req) {
    return 'https://' + (req.hostname || req.host) + req.path;
  }
);

module.exports = function(app) {
  var settings = app.settings;
  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function (req, res) {
    res.render('drpublish/index', settings);
  });

  controller.define('plugin', function (req, res) {
    res.render('drpublish/plugin', settings);
  });

  controller.define('auth', aptomaAuthHandler);

  controller.get('/index', 'index');
  controller.get('/plugin', 'plugin');
  controller.get('/authenticate', 'auth');

  return controller;
}
