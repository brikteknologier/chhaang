var configKeys = [ 'port', 'kvass', 'stoutmeal', 'neo4j' ];
var readConfig = require('general-hammond')('chhaang', configKeys);
var chhaang = require('./chhaang');

readConfig(chhaang);
