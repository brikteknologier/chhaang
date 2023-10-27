var Controller = require('controller');
var stoutmeal = require('@brik/stoutmeal');
var stoutmealDefaults = require('@brik/stoutmeal/config');
var barleyInit = require('@brik/barley');
var url = require('url');
var async = require('async');
var seraphInit = require('seraph');
import { PassportStatic } from 'passport';

export interface IOpenIDUser {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean;
  picture: string;
  // custom properties per open id provider
  [key: string]: any;
}

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
  function accessDisallowed(openIDUser: IOpenIDUser) {
    // todo: check tid here for tenant id
    if (!openIDUser.sub) {
      return 'ID is required';
    }
    if (!openIDUser.email) {
      return 'Email is required';
    }
    return false;
  }

  function invalidateAuthKey(req, res) {

    let redirectURL = defaultRedirect;

    var authKey = sm.cookie.get(req);
    
    if(!authKey) {
      return res.redirect(redirectURL);
    }

    const authMethod = sm.cookie.getAuthMethod(req);
    if(authMethod && app.config.OpenIDProviders){
      const signOutURL = app.config.OpenIDProviders.find(provider => provider.type === authMethod)?.signOutURL
      if(signOutURL){
        redirectURL = app.config.openId[authMethod].signOutURL
        // todo: maybe set the redirect url here plz: ?post_logout_redirect_uri=${options.postLogoutRedirectUri}
      }
    }

    sm.auth.invalidateAuthKey(authKey, function (err) {
      if (err) {
        app.log.error("Could not invalidate user's auth key");
        app.log.error(err);
      } else {
        app.log.info('invalidated authKey ' + authKey);
      }
      res.redirect(redirectURL);
    });
  }

  const passportAuth = (provider) => {
    return passport.authenticate(`open-id-${provider}`, {
      failureRedirect: '/integration/open-id/failure',
      failureFlash: true,
    });
  };

  controller.define('login', function (req, res) {
    var reqUrl = url.parse(req.url, true);
    var redirect = reqUrl.query['redirect'];
    var provider = reqUrl.query['provider'];
    res.cookie(REDIRECT_COOKIE, redirect || '/', { maxAge: 60 * 60 * 1000 });
    
    passportAuth(provider)(req, res);
  });

  controller.define('loginCallback', function (req, res) {
    const reqUrl = url.parse(req.url, true);
    const provider = reqUrl.query['provider'];

    // *** To restrict tenant IDs: ***
    // todo: if(microsoft && allowedTenantIds is defined) req => accessToken, use accessToken to send a request to check tenant. Maybe check this endpoint: https://graph.microsoft.com/v1.0/me
    // https://stackoverflow.com/questions/50409668/how-to-get-the-organization-tenant-id-from-user-profile-using-the-microsoft-gr
    // todo: check if we can use the microsoft login screen to restrict the user. If not, show an error message
    // todo: use the tenantIds defined in the config file to restrict access. Add to config
    // "allowedTenantIds":["", ""]

    function locallyAuthenticateOpenIdUser(openIDUser: IOpenIDUser) {
      app.log.info(
        'Open ID auth login callback success: ' + openIDUser && openIDUser.sub
      );

      var reason = accessDisallowed(openIDUser);

      // todo: check if tenant id is allowed
      if (reason) {
        res.render('open-id/accessRequirementFailed', {
          reason: reason,
          userName: req.user.name || req.user.sub || 'Your Open ID user',
          json: {
            reason: JSON.stringify(reason),
            user: JSON.stringify(req.user),
          },
        });
        return;
      }

      const openIDUserId = openIDUser.sub;
      const translatedUser = {
        name: openIDUser.name || openIDUserId,
        email: (openIDUser.email || '').toLowerCase(),
      };

      async.waterfall(
        [
          initUserModel,
          function (User, cb) {
            User.createOrUpdateFromIdentityProvider(
              'open-id',
              openIDUserId,
              translatedUser,
              cb
            );
          },
        ],
        function (err, user) {
          if (err) {
            app.log.error(
              "Error creating or updating Open ID user '" +
                openIDUserId +
                "': " +
                JSON.stringify(err)
            );
            return res.send(500, err);
          }

          app.log.info('User #' + user.id + ' updated or created locally.');

          sm.auth.createAuthEntry(user.id, function (err, authKey) {
            sm.cookie.set(res, user, authKey, provider);
            var redirectTo = req.cookies[REDIRECT_COOKIE] || '/';
            res.clearCookie(REDIRECT_COOKIE);
            res.redirect(redirectTo);
          });
        }
      );
    }

    passportAuth(provider)(req, res, function onAuthCallbackSuccess() {
      if (!req.user) {
        app.log.error('onAuthCallbackSuccess() - No user found on response');
        res.send(500, 'User not found on response.');
      }

      try {
        locallyAuthenticateOpenIdUser(req.user);
      } catch (err) {
        app.log.error(err);
        res.send(500, 'Error handling authentication');
      }
    });
  });

  controller.define('logout', function (req, res) {
    return invalidateAuthKey(req, res);
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
