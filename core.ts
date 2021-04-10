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
  console.log('le config', config);
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
    var strategy = new SamlStrategy(
      config.Feide.saml || {},
      function (profile, next) {
        next(null, profile);
      }
    );
    passport.serializeUser(function (user, next) {
      next(null, user);
    });
    passport.deserializeUser(function (user, next) {
      next(null, user);
    });
    passport.use('saml', strategy);
  }

  // todo: only allow either Feide or OpenID?

  if (config.OpenID) {
    // todo: maybe one per provider here?

    const BRIK_AD_CLIENT_ID = 'ffc4b888-227f-4730-9df0-754534fe4b43';
    const BRIK_AD_TENANT_ID = '0ceb80d1-08c3-4e59-93c7-d029989b96bd';
    const BRIK_AD_CLIENT_SECRET = 'C97w6g_gSSpie_uf.as5Zlpnir3r64Oni-';

    const BRIK_FEIDE_ID = 'd8d0f6d4-336f-43c9-af5c-7f434dda4c6a';
    const BRIK_FEIDE_CLIENT_SECRET = '539be99e-3609-467d-b9c0-0efb74b5ee07';

    const microsoftOpenIDURL = `https://login.microsoftonline.com/${BRIK_AD_TENANT_ID}/v2.0`;
    const microsoftDiscoveryURL = `https://login.microsoftonline.com/${BRIK_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`;

    const feideDiscoveryURL = `https://auth.dataporten.no/.well-known/openid-configuration`;

    try {
      // const issuer = await Issuer.discover(microsoftOpenIDURL);
      const issuer = await Issuer.discover(feideDiscoveryURL);
      // todo: can we make this generic? Or maybe that defeats the purpose..
      // todo: to make it generic, provide a URL and a discovery URL? 🤔

      const issuerOptions: ClientMetadata = {
        // client_id: BRIK_AD_CLIENT_ID,
        client_id: BRIK_FEIDE_ID,
        // client_secret: BRIK_AD_CLIENT_SECRET,
        client_secret: BRIK_FEIDE_CLIENT_SECRET,
        redirect_uris: [
          'http://localhost:6006/integration/open-id/login/callback',
        ],
        // scope:["profile"],
        response_types: ['code'],
        // id_token_signed_response_alg (default "RS256")
      };

      console.log(issuerOptions);
      /* const client = new issuer.Client({
        ...issuerOptions,
        registration_endpoint: `https://login.microsoftonline.com/${BRIK_TENANT_ID}/v2.0/clients`,
      }); */

      // TODO: Prøv uten passport....!
      const client = new issuer.Client({
        ...issuerOptions,
        // registration_endpoint: `https://login.microsoftonline.com/${BRIK_TENANT_ID}/v2.0/clients`,
      });
      // client.grant
      console.log(client.authorizationUrl());
      const strategy = new OpenIDStrategy(
        {
          client,
        },
        (tokenset, userInfo, next) => {
          // todo: do anything with userInfo here?
          console.log('tokenset', tokenset);
          console.log('userInfo', userInfo);
          /* app.log.info(JSON.stringify(tokenset));
          app.log.info(JSON.stringify(userInfo)); */
          next(null, tokenset.claims());
        }
      );

      app.log.info(
        `Using Open ID with the following issuer: ${JSON.stringify(
          issuer.metadata
        )}`
      );

      passport.use('open-id', strategy);
    } catch (err) {
      // todo: use proper logging here
      console.log('error in the system');
      console.log(err);
      app.log.error('Failed to initialize Open ID', err);
      callback && callback(err);
      return;
    }

    // todo: when we need the access token etc to access third party APIs: https://github.com/panva/node-openid-client#authorization-code-flow

    passport.serializeUser(function (user, done) {
      console.log('serializeUser', user);
      done(null, user);
    });
    passport.deserializeUser(function (user, done) {
      console.log('deserializeUser', user);
      done(null, user);
    });
  }

  // app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: 'sudo apt-get install pants',
      // https://github.com/expressjs/session#resave
      // resave: false,
      // https://github.com/expressjs/session#saveuninitialized
      // saveUninitialized: true,
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
