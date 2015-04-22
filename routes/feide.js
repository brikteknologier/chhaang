var Controller = require('controller');
var stoutmeal = require('stoutmeal');
var stoutmealDefaults = require('stoutmeal/config');
var barleyInit = require('barley');
var url = require('url');
var async = require('async');
var seraphInit = require('seraph');

module.exports = function(app, passport) {
  var log = app.log;
  var REDIRECT_COOKIE = 'redirectAfterLogin';
  var defaultRedirect = '/';

  var User = null; // Will be set by initUserModel
  
  var sm = stoutmeal(stoutmealDefaults(app.config.stoutmeal));
  
  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function(req, res) {
    res.render('feide/index', app.settings);
  });

  function initUserModel(done) {
    if (User) return done(null, User);
    var seraph = seraphInit(app.config.neo4j);
    barleyInit(seraph, {}, function(err, models) {
      if (err) {
        app.log.error("failed to initiale models. error follows:");
        app.log.error(err.message);
        app.log.error(err);
        return done('Feide plugin failed to initialize User model.');
      }
      User = models.user;
      done(null, User);
    });
  }

  // Return falsy if access allowed, or error string if disallowed
  function accessDisallowed(idpUser) {
    function checkString(field, requiredValue) {
      if (idpUser[field] != requiredValue)
        return field + '="' + idpUser[field] + '", but must be "' + requiredValue + '"';
    }

    function checkList(field, requiredValue) {
      var error = field + '="' + idpUser[field] + '", is missing "' + requiredValue + '"';
      (idpUser[field] || "").split(',').forEach(function(value) {
        if (value == requiredValue)
          error = null;
      });
      return error;
    }

    var ar = app.config.Feide.accessRequirement || {};
    app.log.info('checking against access rules: ' + JSON.stringify(ar));
    for (var field in ar) {
      var requirement = ar[field];

      var error = null;

      if (requirement.type == 'list')
        error = checkList(field, requirement.value);
      else
        error = checkString(field, requirement.value);

      if (error) {
        app.log.info('access rules check failed: ' + error);
        return error;
      }
    }
  }

  function invalidateAuthKey(req, res) {
    var authKey = sm.cookie.get(req);
    if (authKey) {
      sm.auth.invalidateAuthKey(authKey, function(err) {
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

  var passportAuth = passport.authenticate('saml', {
    failureRedirect: "/integration/feide/login",
    failureFlash: true
  });

  var passportAuthLogout = passport.authenticate('saml', {
    samlFallback: "logout-request"
  });

  controller.define('login', function(req, res) {
    var reqUrl = url.parse(req.url, true);
    var redirect = reqUrl.query['redirect'];
    res.cookie(
      REDIRECT_COOKIE,
      redirect || '/',
      { maxAge: 60 * 60 * 1000 }
    );
    passportAuth(req, res);
  });
  
  controller.define('loginCallback', function(req, res) {
    function locallyAuthenticateFeideUser(idpUser) {
      app.log.info('Feide auth login callback success: ' + JSON.stringify(idpUser));

      var reason = accessDisallowed(idpUser);
      if (reason) {
        res.render("feide/accessRequirementFailed", {
          reason: reason,
          userName: req.user.displayName || (req.user.givenName + " " + req.user.sn) || "Your Feide user",
          json: { reason: JSON.stringify(reason),
                  user: JSON.stringify(req.user) }
        });
        return;
      }

      // `eduPersonTargetedID` is available in an organization's Feide system.
      // `uid` is available in Feide OpenIdP.
      var idpId = idpUser.eduPersonTargetedID || idpUser.uid;
      var translatedUser = {
        // `displayName` is the user's preferred display name, but not always available
        // `givenName` and `sn` are first and last names, but not always available
        // `cn` is the user's local username, but not always available
        name: idpUser.displayName
          || idpUser.givenName + " " + idpUser.sn
          || idpUser.cn
          || idpId,
        // `mail` is available in an organization's Feide system
        // `email` is available in Feide OpenIdp.
        email: idpUser.mail || idpUser.email || ''
      };

      async.waterfall([
        initUserModel,
        function(User, cb) {
          User.createOrUpdateFromIdentityProvider('feide', idpId, translatedUser, cb);
        }
      ], function(err, user) {
        if (err) {
          app.log.error("Error creating or updating Feide user '" + idpId + "': " + JSON.stringify(err));
          return res.send(500, err);
        }

        app.log.info("User #" + user.id + " updated or created locally.");

        sm.auth.createAuthEntry(user.id, function(err, authKey) {
          sm.cookie.set(res, user, authKey);
          var redirectTo = req.cookies[REDIRECT_COOKIE] || '/';
          res.clearCookie(REDIRECT_COOKIE);
          res.redirect(redirectTo);
        });
      });
    }

    passportAuth(req, res, function onAuthCallbackSuccess() {
      if (!req.user)
        return; // passport.authenticate for SAML gives multiple callbacks, some without data.
      // passport.authenticate for SAML also swallows exceptions
      try {
        locallyAuthenticateFeideUser(req.user);
      } catch (e) {
        app.log.error(e);
        res.send(500, "error handling authentication");
      }
    });
  });

  controller.define('logout', function(req, res) {
    if (!req.user) // Not logged in via Feide, just invalidate authKey if present
      return invalidateAuthKey(req, res);

    passportAuthLogout(req, res, function onLogoutDone() {
      app.log.info('SAML logout processed');
      res.redirect('/');
    });
  });

  controller.define('logoutCallback', invalidateAuthKey);

  controller.define('profile', function(req, res) {
    if (req.isAuthenticated()) {
      res.render("feide/profile", {
        user: req.user,
        userJson: JSON.stringify(req.user)
      });
    } else {
      res.redirect("../login");
    }
  });

  controller.get('/', 'index');
  controller.get('/login', 'login');
  controller.post('/login/callback', 'loginCallback');
  controller.get('/logout', 'logout');
  controller.get('/logout/callback', 'logoutCallback');
  controller.get('/profile', 'profile');

  return controller;
}
