var express = require('express');

module.exports = function(controller) {
  var app = controller.app;

  controller.define('overview', function (req, res) {
    res.render('overview', { title: app.locals.title || 'BRIK' });
  });

  controller.get('/', 'overview');
}
