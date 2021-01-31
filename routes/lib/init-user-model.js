var User = null; // Will be set by initUserModel

// todo: typescript maybe?

module.exports = (neo4jSettings) => (done) => {
  if (User) return done(null, User);
  var seraph = seraphInit(app.config.neo4j);
  barleyInit(seraph, {}, function (err, models) {
    if (err) {
      app.log.error("failed to initiale models. error follows:");
      app.log.error(err.message);
      app.log.error(err);
      return done("Feide plugin failed to initialize User model.");
    }
    User = models.user;
    done(null, User);
  });
};
