var Controller = require('controller');
var stoutmeal = require('stoutmeal');
var stoutmealDefaults = require('stoutmeal/config');

module.exports = function(app, passport) {
  var settings = app.settings;
  var log = app.log;
  
  var sm = stoutmeal(stoutmealDefaults(settings.stoutmeal));
  
  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function(req, res) {
    res.render('feide/index', settings);
  });

  controller.define('login', passport.authenticate('saml', {
    successRedirect: "/",
    failureRedirect: "/integration/feide/login"
  }));
  
  var passportAuthCallback = passport.authenticate('saml', {
    failureRedirect: "/integration/feide/login",
    failureFlash: true
  });
  controller.define('loginCallback', function(req, res) {
    passportAuthCallback(req, res, function onAuthCallbackSuccess() {
      log.info('Feide login succeeded at callback: ' + req.user && JSON.stringify(req.user));
      res.redirect("/integration/feide/index");
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
