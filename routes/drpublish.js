var url = require('url');
var Controller = require('controller');

var aptomaAuthHandler = require('node-aptoma-plugin-auth')(
  'brik-video',
  'DrPublish',
  function pluginUrl(req) {
    return 'https://' + (req.hostname || req.host) + req.path;
  }
);

module.exports = function (app) {
  var settings = app.settings;
  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function (req, res) {
    res.render('drpublish/index', settings);
  });

  controller.define('plugin', function (req, res) {
    res.render('drpublish/plugin', settings);
  });

  controller.define('search', function (req, res, next) {
    app.kvass('/api/users/active', { headers: req.headers }, function (err, user) {
      if (err || !user) return res.send(401, 'not logged in');

      var urlBase = '/api/videos/search';
      if (!req.query.q || !req.query.q.length) urlBase = '/api/videos/';

      var searchUrl = urlBase + url.parse(req.url).search;
      app.log.info('querying kvass at ' + searchUrl);

      app.kvass(searchUrl, { headers: req.headers }, function (err, data) {
        if (err) {
          if (err.statusCode < 400) return res.status(err.statusCode).send(err.statusCode);
          return next(err);
        }
        res.setHeader('content-type', 'application/json');
        res.send(data);
      });
    });
  });

  controller.define('auth', aptomaAuthHandler);

  controller.get('/index', 'index');
  controller.get('/search', 'search');
  controller.get('/plugin', 'plugin');
  controller.get('/authenticate', 'auth');

  return controller;
};
