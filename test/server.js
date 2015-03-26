var http = require('http');

var assert = require('assert');
var chhaang = require('../core');

var config = {
//  log: [{"transport":"console"}] // UNCOMMENT IF DEBUGGING
};

describe("server with no extensions enabled", function() {
  var server;
  var rootUrl;
  
  chhaang(config, function(err, createdServer) {
    server = createdServer;
    server.on('clientError', console.log);
    var location = server.address();
    rootUrl = 'http://' + location.address + ':' + location.port + '/integration/';
  });

  beforeEach(function(done) {
    function areWeThereYet() {
      if (server) return done();
      setTimeout(areWeThereYet, 100);
    }
    areWeThereYet();
  });

  it("handles requests to root url", function(done) {
    this.slow(1000);
    http.get(rootUrl, function(res) {
      assert(res.statusCode >= 200 && res.statusCode < 400);
      done();
    });
  });
});
