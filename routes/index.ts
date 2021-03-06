module.exports = function (controller, passport) {
  var app = controller.app;
  controller.app.set('view engine', 'jade');

  controller.define('overview', function (req, res) {
    res.render('overview', app.settings);
  });

  controller.get('/integration', 'overview');

  if (app.settings.DrPublish) {
    var drPubController = require('./drpublish')(app);
    app.use('/integration/drpublish/', drPubController);
  } else {
    app.get('/integration/drpublish*', function (req, res) {
      res.send(404, 'DrPublish integration not enabled.');
    });
  }

  if (app.settings.Feide) {
    var feideController = require('./feide')(app, passport);
    app.use('/integration/feide/', feideController);
  } else {
    app.get('/integration/feide*', function (req, res) {
      res.status(404).send('Feide integration not enabled');
    });
  }

  if (app.settings.OpenIDEnabled) {
    var openIDfeideController = require('./open-id')(app, passport);
    app.use('/integration/open-id/', openIDfeideController);
  } else {
    app.get('/integration/open-id*', function (req, res) {
      res.send(404, 'Open ID integration not enabled');
    });
  }
};
