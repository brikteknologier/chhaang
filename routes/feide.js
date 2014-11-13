var Controller = require('controller');

module.exports = function(settings) {
  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function (req, res) {
    res.render('feide/index', settings);
  });

  controller.define('login', function (req, res) {
    res.send('NOT IMPLEMENTED login');
  });

  controller.define('login/callback', function (req, res) {
    res.send('NOT IMPLEMENTED login/callback');
  });

  controller.define('logout', function (req, res) {
    res.send('NOT IMPLEMENTED logout');
  });

  controller.define('profile', function (req, res) {
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
  controller.get('/login/callback', 'login/callback');
  controller.get('/logout', 'logout');
  controller.get('/profile', 'profile');

  return controller;
}
