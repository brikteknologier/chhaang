var Controller = require('controller');
var stoutmeal = require('stoutmeal');
var stoutmealDefaults = require('stoutmeal/config');
var url = require('url');

module.exports = function(app, passport) {
  var log = app.log;
  var REDIRECT_COOKIE = 'redirectAfterLogin';

  var User = app.db.models.user;
  
  var sm = stoutmeal(stoutmealDefaults(app.config.stoutmeal));
  
  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function(req, res) {
    res.render('feide/index', app.settings);
  });

  var passportAuth = passport.authenticate('saml', {
    successRedirect: "/",
    failureRedirect: "/integration/feide/login",
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
  
  var passportAuthCallback = passport.authenticate('saml', {
    failureRedirect: "/integration/feide/login",
    failureFlash: true
  });
  controller.define('loginCallback', function(req, res) {
    function locallyAuthenticateFeideUser(idpUser) {
      app.log.info('Feide auth login callback success: ' + JSON.stringify(idpUser));
      // `eduPersonTargetedID` is available in an organization's Feide system.
      // `id` is available in Feide OpenIdP.
      var idpId = idpUser.eduPersonTargetedID || idpUser.id;
      var translatedUser = {
        // `displayName` is the user's preferred display name, but not always available
        // `givenName` and `sn` are first and last names, but not always available
        name: idpUser.displayName || idpUser.givenName + " " + idpUser.sn || idpId,
        // `mail` is available in an organization's Feide system
        // `email` is available in Feide OpenIdp.
        email: idpUser.mail || idpUser.email || ''
      };
      User.createOrUpdateFromIdentityProvider('feide', idpId, translatedUser, function(err, user) {
        app.log.info("User #" + user.id + " updated or created locally.");
        if (err) {
          app.log.error("Error creating or updating Feide user '" + idpId + "': " + JSON.stringify(err));
          return res.send(500, err);
        }
        sm.auth.createAuthEntry(user.id, function(err, authKey) {
          sm.cookie.set(res, user, authKey);
          var redirectTo = req.cookies[REDIRECT_COOKIE] || '/';
          res.clearCookie(REDIRECT_COOKIE);
          res.redirect(redirectTo);
        });
      });
    }

    passportAuthCallback(req, res, function onAuthCallbackSuccess() {
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
    // TODO: Send session invalidation request to Feide IP instead
    req.logout();
    res.redirect('/');
  });

  controller.define('profile', function(req, res) {
    if (req.isAuthenticated()) {
      res.render("feide/profile", {
        user: req.user,
        jason: JSON.stringify(req.user)
      });
    } else {
      res.redirect("../login");
    }
  });

  controller.get('/index', 'index');
  controller.get('/login', 'login');
  controller.post('/login/callback', 'loginCallback');
  controller.get('/logout', 'logout');
  controller.get('/profile', 'profile');

  return controller;
}
