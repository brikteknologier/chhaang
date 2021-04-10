var Controller = require('controller');
var stoutmeal = require('@brik/stoutmeal');
var stoutmealDefaults = require('@brik/stoutmeal/config');
var barleyInit = require('@brik/barley');
var url = require('url');
var async = require('async');
var seraphInit = require('seraph');
import { PassportStatic } from 'passport';

module.exports = function (app, passport: PassportStatic) {
  var REDIRECT_COOKIE = 'redirectAfterLogin';
  var defaultRedirect = '/';

  var User = null; // Will be set by initUserModel

  var sm = stoutmeal(stoutmealDefaults(app.config.stoutmeal));

  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function (req, res) {
    res.render('open-id/index', app.settings);
  });

  controller.define('success', function (req, res) {
    res.send(200, 'Successfully logged in');
  });

  function initUserModel(done) {
    if (User) return done(null, User);
    var seraph = seraphInit(app.config.neo4j);
    barleyInit(seraph, {}, function (err, models) {
      if (err) {
        app.log.error('failed to initiale models. error follows:');
        app.log.error(err.message);
        app.log.error(err);
        return done('Open id plugin failed to initialize User model.');
      }
      User = models.user;
      done(null, User);
    });
  }

  // Return falsy if access allowed, or error string if disallowed
  function accessDisallowed(idpUser) {
    return false;
    // todo: implement
    /* function checkString(field, requiredValue) {
      if (idpUser[field] != requiredValue)
        return (
          field +
          '="' +
          idpUser[field] +
          '", but must be "' +
          requiredValue +
          '"'
        );
    } */
    /* function checkList(field, requiredValue) {
      var error =
        field + '="' + idpUser[field] + '", is missing "' + requiredValue + '"';
      (idpUser[field] || '').split(',').forEach(function (value) {
        if (value == requiredValue) error = null;
      });
      return error;
    } */
    /* var ar = app.config.Feide.accessRequirement || {};
    app.log.info('checking against access rules: ' + JSON.stringify(ar));
    for (var field in ar) {
      var requirement = ar[field];

      var error = null;

      if (requirement.type == 'list')
        error = checkList(field, requirement.value);
      else error = checkString(field, requirement.value);

      if (error) {
        app.log.info('access rules check failed: ' + error);
        return error;
      }
    } */
  }

  function invalidateAuthKey(req, res) {
    var authKey = sm.cookie.get(req);
    if (authKey) {
      sm.auth.invalidateAuthKey(authKey, function (err) {
        if (err) {
          app.log.error("Could not invalidate user's auth key");
          app.log.error(err);
        } else {
          app.log.info('invalidated authKey ' + authKey);
        }
        logoutCompleted(res);
      });
    } else {
      logoutCompleted(res);
    }
  }

  function logoutCompleted(res) {
    res.redirect(defaultRedirect);
  }

  const passportAuth = passport.authenticate('open-id', {
    failureRedirect: '/integration/open-id/failure',
    successRedirect: '/integration/open-id/success',
    failureFlash: true,
  });

  // todo: separate passport auth logout?
  /* var passportAuthLogout = passport('saml', {
    samlFallback: 'logout-request',
  }); */


  /* todo: feide info hier:
  https://repl.it/@afell/javascript-login-example
  https://github.com/jhellan/example3

  For de/oss som bruker C# (.NET Core), kan OpenID konfigueres slik:

        .AddOpenIdConnect("oidc", options =>{
                options.RequireHttpsMetadata = false;
                options.MetadataAddress = "https://auth.dataporten.no/.well-known/openid-configuration";
                options.ClientId = "xxxxxxx";
                options.ClientSecret = "xxxxxxxxx";
                options.ResponseType = "code";
                options.SignedOutRedirectUri = "/home";
                options.SaveTokens = true;
                options.GetClaimsFromUserInfoEndpoint = true;
                options.Scope.Add("profile");
                options.Scope.Add("openid");
        }




  */

  controller.define('login', function (req, res) {
    var reqUrl = url.parse(req.url, true);
    var redirect = reqUrl.query['redirect'];
    res.cookie(REDIRECT_COOKIE, redirect || '/', { maxAge: 60 * 60 * 1000 });

    passportAuth(req, res);
  });

  controller.define('loginCallback', function (req, res) {
    console.log('loginCallback req.query', req.query);
    console.log('loginCallback req.body', req.body);
    function locallyAuthenticateOpenIdUser(idpUser) {
      // todo: remove this log, because we don't wanna log this result?
      console.log('locallyAuthenticateOpenIdUser()');
      app.log.info(
        'Open ID auth login callback success: ' + JSON.stringify(idpUser)
      );

      var reason = accessDisallowed(idpUser);
      if (reason) {
        res.render('open-id/accessRequirementFailed', {
          reason: reason,
          userName:
            req.user.displayName ||
            req.user.givenName + ' ' + req.user.sn ||
            'Your Open ID user',
          json: {
            reason: JSON.stringify(reason),
            user: JSON.stringify(req.user),
          },
        });
        return;
      }
      console.log('idp-user', idpUser);

      // `eduPersonTargetedID` is available in an organization's Feide system.
      // `uid` is available in Feide OpenIdP.
      var idpId = idpUser.eduPersonTargetedID || idpUser.uid;
      var translatedUser = {
        // `displayName` is the user's preferred display name, but not always available
        // `givenName` and `sn` are first and last names, but not always available
        // `cn` is the user's local username, but not always available
        name:
          idpUser.displayName ||
          idpUser.givenName + ' ' + idpUser.sn ||
          idpUser.cn ||
          idpId,
        // `mail` is available in an organization's Feide system
        // `email` is available in Feide OpenIdp.
        email: idpUser.mail || idpUser.email || '',
      };

      async.waterfall(
        [
          initUserModel,
          function (User, cb) {
            User.createOrUpdateFromIdentityProvider(
              'open-id',
              idpId,
              translatedUser,
              cb
            );
          },
        ],
        function (err, user) {
          if (err) {
            app.log.error(
              "Error creating or updating Open ID user '" +
                idpId +
                "': " +
                JSON.stringify(err)
            );
            return res.send(500, err);
          }

          app.log.info('User #' + user.id + ' updated or created locally.');

          sm.auth.createAuthEntry(user.id, function (err, authKey) {
            sm.cookie.set(res, user, authKey);
            var redirectTo = req.cookies[REDIRECT_COOKIE] || '/';
            res.clearCookie(REDIRECT_COOKIE);
            res.redirect(redirectTo);
          });
        }
      );
    }

    passportAuth(req, res, function onAuthCallbackSuccess() {
      console.log('callback???');
      if (!req.user) {
        app.log.error('onAuthCallbackSuccess() - No user found on response');
        res.send(500, 'User not found on response.');
      }
      // todo: wat? 👇

      try {
        console.log('trying to locally authenticate open id user')
        locallyAuthenticateOpenIdUser(req.user);
        console.log('finished trying to locally authenticate open id user')
      } catch (err) {
        app.log.error(err);
        res.send(500, 'Error handling authentication');
      }
    });
  });

  controller.define('logout', function (req, res) {
    if (!req.user) {
      // Not logged in via Feide, just invalidate authKey if present
      return invalidateAuthKey(req, res);
    }

    // todo: sign out of open-id?
    /* passportAuthLogout(req, res, function onLogoutDone() {
      app.log.info('SAML logout processed');
      res.redirect('/');
    }); */
  });

  controller.define('logoutCallback', invalidateAuthKey);

  controller.define('profile', function (req, res) {
    if (req.isAuthenticated()) {
      res.render('open-id/profile', {
        user: req.user,
        userJson: JSON.stringify(req.user),
      });
    } else {
      res.redirect('../login');
    }
  });

  controller.get('/', 'index');
  controller.get('/login', 'login');
  controller.get('/login/callback', 'loginCallback');
  controller.get('/logout', 'logout');
  controller.get('/logout/callback', 'logoutCallback');
  controller.get('/profile', 'profile');
  controller.get('/success', 'success');

  return controller;
};
