module.exports = function(controller) {
  var app = controller.app;

  controller.define('overview', function (req, res) {
    res.render('overview', app.settings);
  });

  controller.get('/integration', 'overview');

  if (app.settings.DrPublish) {
    var drPubController = require('./drpublish')(app);
    app.use('/integration/drpublish/', drPubController);
  } else {
    app.get('/integration/drpublish*', function(req, res) {
      res.send(404, 'DrPublish integration not enabled.');
    });
  }
}
