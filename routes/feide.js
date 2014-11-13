var Controller = require('controller');

module.exports = function(settings) {
  var controller = Controller();
  controller.app.set('view engine', 'jade');

  controller.define('index', function (req, res) {
    res.render('feide/index', settings);
  });

  controller.get('/index', 'index');

  return controller;
}
