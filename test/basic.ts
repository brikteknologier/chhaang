var assert = require('assert');
var chhaang = require('../core');

describe("chhaang exists", function() {
  it("exists", function() {
    assert(chhaang);
  });

  it("can be initialized", function(done) {
    this.slow(1000);
    chhaang({}, done);
  });

  it("returns a server after init", function(done) {
    this.slow(1000);
    chhaang({}, function(err, server) {
      assert(!err);
      assert(server);
      done();
    });
  });
});
