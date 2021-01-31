var http = require('http');
var express = require('express');
var Controller = require('controller');
var imbibe = require('imbibe');
var stylus = require('stylus');
var _ = require('underscore');
var nib = require('nib')();
var SamlStrategy = require('passport-saml').Strategy;
import passport from 'passport';
import { Strategy as OpenIDStrategy, Issuer } from 'openid-client';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';

const packageJson = require('./package.json');

var server = (module.exports = http.createServer());

module.exports = async function init(config, callback) {
  console.log('le config', config);
  console.log('le callback', callback);
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

    /*
    Discovery document path: /.well-known/openid-configuration

Authority: https://login.microsoftonline.com/{tenant}/v2.0
*/

    const BRIK_CLIENT_ID = 'ffc4b888-227f-4730-9df0-754534fe4b43';
    const BRIK_TENANT_ID = '0ceb80d1-08c3-4e59-93c7-d029989b96bd';

    const microsoftOpenIDURL = `https://login.microsoftonline.com/${BRIK_TENANT_ID}/v2.0`;
    const microsoftDiscoveryURL = `https://login.microsoftonline.com/${BRIK_TENANT_ID}/v2.0/.well-known/openid-configuration`;

    try {
      const issuer = await Issuer.discover(microsoftDiscoveryURL);
      // todo: can we make this generic? Or maybe that defeats the purpose..
      // todo: to make it generic, provide a URL and a discovery URL? 🤔

      const client = new issuer.Client({
        client_id: BRIK_CLIENT_ID,
        redirect_uris: ['http://localhost:3000/cb'],
        response_types: ['id_token'],
        // id_token_signed_response_alg (default "RS256")
      });

      const strategy = new OpenIDStrategy(
        {
          client,
        },
        (tokenset, userInfo, next) => {
          app.log.info(JSON.stringify(tokenset));
          app.log.info(JSON.stringify(userInfo));
          next(null, userInfo);
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

    /* passport.serializeUser(function (user, done) {
      done(null, user.oid);
    });

    passport.deserializeUser(function (oid, done) {
      // todo: can we move this thang?
      findByOid(oid, function (err, user) {
        done(err, user);
      });
    }); */

    /* passport.use(
      new OpenIDStrategy(
        {
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
        function (iss, sub, profile, accessToken, refreshToken, done) {
          if (!profile.oid) {
            return done(new Error('No oid found'), null);
          }
          // asynchronous verification, for effect...
          process.nextTick(function () {
            findByOid(profile.oid, function (err, user) {
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
      )
    ); */
  }

  app.use(cookieParser());
  app.use(bodyParser.json());
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
