var http = require('http');

var assert = require('assert');
var chhaang = require('../core');

var config = {
  "stoutmeal": {
    "store": {
      "type": "redis",
      "port": 6379,
      "host": "localhost"
    }
  },
  "Feide": {
    "saml": {
      "entryPoint": "https://idp.feide.no/simplesaml/saml2/idp/SSOService.php",
      "logoutUrl": "https://idp.feide.no/simplesaml/saml2/idp/SingleLogoutService.php",
      "issuer": "test.brik.no"
    }
  }
//  log: [{"transport":"console"}] // UNCOMMENT IF DEBUGGING
};

describe("server with Feide enabled", function() {
  var server;
  var rootUrl;
  
  chhaang(config, function(err, createdServer) {
    server = createdServer;
    server.on('clientError', console.log);
    var location = server.address();
    rootUrl = 'http://' + location.address + ':' + location.port + '/integration';
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
      assert(res.statusCode >= 200 && res.statusCode < 400, res.statusCode);
      done();
    });
  });

  it("has Feide enabled", function(done) {
    this.slow(1000);
    http.get(rootUrl + '/feide/', function(res) {
      assert(res.statusCode >= 200 && res.statusCode < 400, res.statusCode);
      done();
    });
  });

  it("does not have DrPublish enabled", function(done) {
    this.slow(1000);
    http.get(rootUrl + '/drpublish/index', function(res) {
      assert(res.statusCode >= 400 && res.statusCode < 500, res.statusCode);
      done();
    });
  });
});
