var Controller = require('controller');

module.exports = function(app) {
  var controller = Controller();
  controller.app = app;

  controller.define('index', function (req, res) {
    res.render('feide/index', app.settings);
  });
  
  controller.get('/index', 'index');

  return controller;
}
