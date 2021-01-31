var http = require('http');
var express = require('express');
var Controller = require('controller');
var imbibe = require('imbibe');
var stylus = require('stylus');
var _ = require('underscore');
var nib = require('nib')();
var passport = require('passport');
var SamlStrategy = require('passport-saml').Strategy;
var package = require('./package.json');

var server = module.exports = http.createServer();

module.exports = function init(config, callback) {
  var controller = Controller();
  var app = controller.app;

  app.kvass = imbibe(config.kvass);
  server.on('request', app);

  _.extend(app.settings, { title: 'BRIK' }, config);
  app.config = config;

  process.title = (config.id || "anonymous") + "-chhaang-" + package.version;

  app.log = require('logginator')('chhaang', config.log);
  require('winston-tagged-http-logger')(server, app.log.createSublogger('http'));

  // passport & session
  if (config.Feide) {
    var strategy = new SamlStrategy(
      config.Feide.saml || {},
      function(profile, next) { next(null, profile); });
    passport.serializeUser(function(user, next) { next(null, user); });
    passport.deserializeUser(function(user, next) { next(null, user); });
    passport.use(strategy);
  }
  if(config.ad){
    passport.serializeUser(function(user, done) {
      done(null, user.oid);
    });

    passport.deserializeUser(function(oid, done) {
      // todo: can we move this thang?
      findByOid(oid, function (err, user) {
        done(err, user);
      });
    });

    passport.use(new OIDCStrategy({
      identityMetadata: config.creds.identityMetadata,
      clientID: config.creds.clientID,
      clientSecret: config.creds.clientSecret,
      redirectUrl: config.creds.redirectUrl,
      responseType: config.creds.responseType,
      responseMode: config.creds.responseMode,
      allowHttpForRedirectUrl: config.creds.allowHttpForRedirectUrl,
      // validateIssuer: config.creds.validateIssuer,
      // isB2C: config.creds.isB2C,
      // issuer: config.creds.issuer,
      // passReqToCallback: config.creds.passReqToCallback,
      //scope: config.creds.scope,
      // loggingLevel: config.creds.loggingLevel, // debug maybe?
      useCookieInsteadOfSession: true, // maybe?
    },
    function(iss, sub, profile, accessToken, refreshToken, done) {
      if (!profile.oid) {
        return done(new Error("No oid found"), null);
      }
      // asynchronous verification, for effect...
      process.nextTick(function () {
        findByOid(profile.oid, function(err, user) {
          if (err) {
            return done(err);
          }
          if (!user) {
            // "Auto-registration"
            users.push(profile);
            return done(null, profile);
          }
          return done(null, user);
        });
      });
    }
  ));
  }
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

  // routes
  require('./routes')(controller, passport);

  app.use(currentUser);

  // start
  server.listen(config.port, function listening() {
    callback && callback(null, server);
  });
};
