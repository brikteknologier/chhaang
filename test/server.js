var http = require('http');

var assert = require('assert');
var chhaang = require('../core');

var config = {
  // log: [{"transport":"console"}]},
};

describe("server with no extensions enabled", function() {
  var server;
  var rootUrl;
  
  beforeEach(function(done) {
    chhaang(config, function(err, createdServer) {
      server = createdServer;
      var location = server.address();
      rootUrl = 'http://' + location.address + ':' + location.port + '/integration/';
      done(err);
    });
  });

  afterEach(function() {
    server.close();
    server = null;
    rootUrl = null;
  });

  it("handles requests to root url", function(done) {
    assert(server);
    http.get(rootUrl, function(res) {
      assert(res.statusCode >= 200 && res.statusCode < 400);
      done();
    });
  });
});
