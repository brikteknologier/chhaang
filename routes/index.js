module.exports = function(controller) {
  var app = controller.app;
  controller.app.set('view engine', 'jade');

  controller.define('overview', function (req, res) {
    res.render('overview', app.settings);
  });

  controller.get('/integration', 'overview');

  if (app.settings.DrPublish) {
    var drPubController = require('./drpublish')(app.settings);
    app.use('/integration/drpublish/', drPubController);
  } else {
    app.get('/integration/drpublish*', function(req, res) {
      res.send(404, 'DrPublish integration not enabled.');
    });
  }

  if (app.settings.Feide) {
    var feideController = require('./feide')(app.settings);
    app.use('/integration/feide/', feideController);
  } else {
    app.get('/integration/feide*', function(req, res) {
      res.send(404, 'Feide integration not enabled');
    });
  }
}
