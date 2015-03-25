var assert = require('assert');
var chhaang = require('../core');

describe("chhaang exists", function() {
  it("exists", function() {
    assert(chhaang);
  });

  it("can be initialized", function(done) {
    chhaang({}, done);
  });
});
