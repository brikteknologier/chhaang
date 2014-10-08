var express = require('express');

var aptomaAuthHandler = require('node-aptoma-plugin-auth')(
  'brik-video',
  'DrPublish'
);

module.exports = function(controller) {
  var app = controller.app;

  controller.define('overview', function (req, res) {
    res.render('overview');
  });

  controller.define('drpublishIndex', function (req, res) {
    res.render('drpublish/index');
  });

  controller.define('drpublishAuth', aptomaAuthHandler);

  controller.get('/integration', 'overview');
  controller.get('/integration/drpublish/index', 'drpublishIndex');
  controller.get('/integration/drpublish/authenticate', 'drpbublishAuth');
}
