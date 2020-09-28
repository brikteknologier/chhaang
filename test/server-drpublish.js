var http = require('http');

var assert = require('assert');
var chhaang = require('../core');

var config = {
  DrPublish: {
    width: 600,
    height: 338,
    background: '#000',
  },
  //  log: [{"transport":"console"}] // UNCOMMENT IF DEBUGGING
};

describe('server with DrPublish enabled', function () {
  var server;
  var rootUrl;

  chhaang(config, function (err, createdServer) {
    server = createdServer;
    server.on('clientError', console.log);
    var location = server.address();
    rootUrl = 'http://' + location.address + ':' + location.port + '/integration';
  });

  beforeEach(function (done) {
    function areWeThereYet() {
      if (server) return done();
      setTimeout(areWeThereYet, 100);
    }
    areWeThereYet();
  });

  it('handles requests to root url', function (done) {
    this.slow(1000);
    http.get(rootUrl, function (res) {
      assert(res.statusCode >= 200 && res.statusCode < 400);
      done();
    });
  });

  it('does not have Feide enabled', function (done) {
    this.slow(1000);
    http.get(rootUrl + '/feide/', function (res) {
      assert(res.statusCode >= 400 && res.statusCode < 500);
      done();
    });
  });

  it('has DrPublish enabled', function (done) {
    this.slow(1000);
    http.get(rootUrl + '/drpublish/index', function (res) {
      assert(res.statusCode >= 200 && res.statusCode < 400);
      done();
    });
  });
});
