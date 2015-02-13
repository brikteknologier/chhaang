# chhaang

Chhaang is the integration interface of the videobase project.  It
currently hosts an Aptoma DrPublish plugin for embedding videos.

## running chhaang

```
node chhaang --config <config.json>
```

## configuration

* `kvass` (required) - the location of the kvass server
* `port` (required) - the port that chhaang should run on
* `stoutmeal` (required) - either a relative path to the stoutmeal config file
  or a stoutmeal config object. see the stoutmeal docs for more info
* `DrPublish` (optional) - a DrPublish plugin config object. if omitted,
  a DrPublish plugin will not be provided.
* `Feide` (optional) - a Feide SAML endpoint config object.  If omitted,
  no Feide SAML endpoint will be available.

## DrPublish configuration

* `width` (optional, default 600) - default width of embedded videos
* `height` (optional, default 338) - default height of embedded videos
* `background` (optional, default #000) - background color of embedded videos

## Feide configuration

* `saml` - SAML metadata config object

### SAML metadata config object

* `entryPoint` - Single Sign On URL.  Example: "https://openidp.feide.no/simplesaml/saml2/idp/SSOService.php"
* `logoutUrl` - Single Sing Out URL.  Example: "https://openidp.feide.no/simplesaml/saml2/idp/SingleLogoutService.php"
* `issuer` - The identity of this BRIK instance when registered as a service provider.  Example: "brik-dummy-sp"
