var _ = require('underscore');
var fs = require('fs');
module.exports = function(app) {
  function updateSiteSettings() {
    app.kvass('/api/site/public_site_settings', function(err, settings) {
      if (err) return app.log.error("Couldn't get site settings - " + err.toString());
      if (_.isEqual(app.locals.siteSettings, settings)) return;
      app.locals.siteSettings = settings;
    });
  };

  updateSiteSettings();
  setInterval(updateSiteSettings, 10000);
};
