var assert = require('assert');
var chhaang = require('../core');

describe("server with no extensions enabled", function() {
  var server;
  
  beforeEach(function(done) {
    chhaang({}, function(err, createdServer) {
      server = createdServer;
      done(err);
    });
  });

  it("has a test", function() {
    assert(server);
  });
});
