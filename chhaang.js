var http = require('http');

var express = require('express');
var Controller = require('controller');
var imbibe = require('imbibe');
var stylus = require('stylus');
var _ = require('underscore');
var nib = require('nib')();

var configKeys = [ 'port', 'kvass', 'DrPublish' ];
var readConfig = require('general-hammond')('chhaang', configKeys);
var server = module.exports = http.createServer();

readConfig(function(config) {
  var controller = Controller();
  var app = controller.app;
  app.kvass = imbibe(config.kvass);
  server.on('request', app);
  _.extend(app.settings, config);

  app.log = require('logginator')(config.log);
  require('winston-tagged-http-logger')(server, app.log.createSublogger('http'));
  app.use(express.cookieParser());

  // stylus
  app.use(stylus.middleware({
    src: __dirname + '/public',
    compile: function(str, path) {
      return stylus(str).set('filename', path).use(nib);
    }
  }));
  app.use(express.static(__dirname + "/public"));

  // jade
  app.set('view engine', 'jade');
  app.locals({ 
    title: config.title
  });

  // authorization
  var auth = require('./authorization')(app, config);
  controller.use(auth.getUser);
  controller.use('auth', auth.checkAuth);

  require('./routes')(controller);

  server.listen(config.port);
});
