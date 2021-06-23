var http = require('http');
var Controller = require('controller');
var imbibe = require('imbibe');
var stylus = require('stylus');
var _ = require('underscore');
var nib = require('nib')();
var SamlStrategy = require('passport-saml').Strategy;
import express from 'express';
import passport from 'passport';
import {
  Strategy as OpenIDStrategy,
  Issuer,
  ClientMetadata,
} from 'openid-client';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';

const packageJson = require('./package.json');

var server = (module.exports = http.createServer());

module.exports = async function init(config, callback) {
  var controller = Controller();
  var app = controller.app;

  app.kvass = imbibe(config.kvass);
  server.on('request', app);

  _.extend(app.settings, { title: 'BRIK' }, config);
  app.config = config;

  process.title =
    (config.id || 'anonymous') + '-chhaang-' + packageJson.version;

  app.log = require('logginator')('chhaang', config.log);
  require('winston-tagged-http-logger')(
    server,
    app.log.createSublogger('http')
  );

  app.use(cookieParser());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  // passport & session
  if (config.Feide) {
    var strategy = new SamlStrategy(config.Feide.saml || {}, function (
      profile,
      next
    ) {
      next(null, profile);
    });
    passport.serializeUser(function (user, next) {
      next(null, user);
    });
    passport.deserializeUser(function (user, next) {
      next(null, user);
    });
    passport.use('saml', strategy);
  }
  // Open ID
  else if (config.OpenIDEnabled) {
    try {
      if (!config.OpenIDProviders && config.OpenIDProviders.length < 1) {
        throw new Error(
          'Open ID is enabled but no providers registered in config'
        );
      }

      for (let provider of config.OpenIDProviders) {
        const issuer = await Issuer.discover(provider.discoveryURL);

        const issuerOptions: ClientMetadata = {
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          redirect_uris: [
            `${
              config.url || 'http://localhost:6006'
            }/integration/open-id/login/callback?provider=${provider.type}`,
          ],
          scope: ['profile'],
          response_types: ['code'],
        };

        const client = new issuer.Client({
          ...issuerOptions,
        });

        // todo: when we need the access token etc to access third party APIs: https://github.com/panva/node-openid-client#authorization-code-flow
        const strategy = new OpenIDStrategy(
          {
            client,
          },
          (tokenset, userInfo, next) => {
            next(null, userInfo);
          }
        );

        app.log.info(
          `Using Open ID with the following issuer: ${JSON.stringify(
            issuer.metadata
          )}`
        );

        passport.use(`open-id-${provider.type}`, strategy);
      }
    } catch (err) {
      app.log.error('Failed to initialize Open ID', err);
      callback && callback(err);
      return;
    }

    passport.serializeUser(function (user, done) {
      done(null, user);
    });
    passport.deserializeUser(function (user, done) {
      done(null, user);
    });
  }

  app.use(
    session({
      secret: 'sudo apt-get install pants',
      // https://github.com/expressjs/session#resave
      resave: false,
      // https://github.com/expressjs/session#saveuninitialized
      saveUninitialized: true,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  // stylus
  app.use(
    stylus.middleware({
      src: __dirname + '/static',
      compile: function (str, path) {
        return stylus(str).set('filename', path).use(nib);
      },
    })
  );
  app.use(express.static(__dirname + '/static'));

  // authorization
  require('./site_settings')(app);
  function currentUser(req, res, next) {
    app.kvass(
      '/api/users/active',
      { headers: req.headers },
      function (err, user) {
        res.locals.currentUser = err ? null : user;
        next();
      }
    );
  }

  // routes
  require('./routes')(controller, passport);

  app.use(currentUser);

  // start
  server.listen(config.port, function listening() {
    callback && callback(null, server);
  });
};
