var stoutmeal = require('stoutmeal');
var async = require('async');

module.exports = function (app, config) {
  function getRequireSitePassword(callback) {
    app.kvass('/site_settings', function(err, settings) {
      if (err) return callback(err);
      callback(null, settings['force_require_site_password'] 
                     || settings['require_site_password']);
    });
  }

  var smMiddleware = stoutmeal(config.stoutmeal).middleware;
  var requireUserId = smMiddleware.requireUserId('/auth/anonymous-login', true);

  return {
    getUser: function (req, res, next) {
      async.series([
        function getUserId(callback) {
          if (req.user && req.user.id != null) return callback();
          smMiddleware.getUserId(req, res, callback);
        },
        function fetchUser(callback) {
          if (!req.user || !req.user.id) return callback();
          app.kvass('/users/user/' + req.user.id, function(err, user) {
            if (err) return callback(err);
            req.user = user;
            callback();
          });
        },
        function setUserIdInLocals(callback) {
          if (req.user && req.user.id) res.locals.currentUser = req.user;
          callback();
        }
      ], next);
    },
    checkAuth: function(req, res, callback) {
      getRequireSitePassword(function(err, requirePassword) {
        if (err) return callback(err);
        if (requirePassword) requireUserId(req, res, callback);
        else callback();
      });
    }
  };
};
