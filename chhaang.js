var http = require('http');

var express = require('express');
var Controller = require('controller');
var imbibe = require('imbibe');
var stylus = require('stylus');
var _ = require('underscore');
var nib = require('nib')();
var passport = require('passport');
var SamlStrategy = require('passport-saml').Strategy;
var seraphInit = require('seraph');
var barleyInit = require('barley');

var configKeys = [ 'port', 'kvass', 'stoutmeal', 'neo4j' ];
var readConfig = require('general-hammond')('chhaang', configKeys);
var server = module.exports = http.createServer();

readConfig(function(config) {
  var controller = Controller();
  var app = controller.app;

  app.kvass = imbibe(config.kvass);
  server.on('request', app);

  _.extend(app.settings, { title: 'BRIK' }, config);
  app.config = config;

  app.log = require('logginator')('chhaang', config.log);
  require('winston-tagged-http-logger')(server, app.log.createSublogger('http'));
  app.use(express.cookieParser());

  // passport & session
  var strategy = new SamlStrategy(
    config.Feide.saml,
    function(profile, next) { next(null, profile); });
  passport.serializeUser(function(user, next) { next(null, user); });
  passport.deserializeUser(function(user, next) { next(null, user); });
  passport.use(strategy);
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'sudo apt-get install pants' }));
  app.use(passport.initialize());
  app.use(passport.session());

  // stylus
  app.use(stylus.middleware({
    src: __dirname + '/static',
    compile: function(str, path) {
      return stylus(str).set('filename', path).use(nib);
    }
  }));
  app.use(express.static(__dirname + "/static"));

  // authorization
  require('./site_settings')(app);
  function currentUser(req, res, next) {
    app.kvass("/api/users/active", { headers: req.headers }, function(err, user) {
      res.locals.currentUser = err ? null : user;
      next();
    });
  }

  function handleError(err, req, res, next) {
    if (err && err.statusCode == 401) {
      var url = '//' + req.headers.host + req.originalUrl;
      app.log.info("Missing login for " + url);
      var loginUrl = "/auth/login";
      if (app.locals.siteSettings.has_site_password)
        loginUrl = "/auth/anonymous-login";
      return res.redirect(loginUrl + "?redirect=" + url);
    } else {
      res.send(err.statusCode || 500, err.message || err);
    }
  }

  var seraph = seraphInit(config.neo4j);
  barleyInit(seraph, {}, function(err, models) {
    if (err) {
      app.log.error("failed to initiale models. error follows");
      app.log.error(err.message);
      app.log.error(err);
      process.exit(1);
    }
    app.db = seraph;
    app.db.models = models;

    // routes
    require('./routes')(controller, passport);

    app.use(currentUser);
    app.use(handleError);

    // start
    server.listen(config.port);
  });
});
