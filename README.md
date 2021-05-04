# chhaang

Chhaang is the integration interface of the videobase project. It
currently hosts an Aptoma DrPublish plugin for embedding videos.

## Developing

On pre-push, typescript will compile the typescript-files.

## running chhaang

```
node chhaang --config <config.json>
```

## configuration

- `kvass` (required) - the location of the kvass server
- `port` (required) - the port that chhaang should run on
- `stoutmeal` (required) - either a relative path to the stoutmeal config file
  or a stoutmeal config object. see the stoutmeal docs for more info
- `DrPublish` (optional) - a DrPublish plugin config object. if omitted,
  a DrPublish plugin will not be provided.
- `Feide` (optional) - a Feide SAML endpoint config object. If omitted,
  no Feide SAML endpoint will be available.

* `OpenID` (optional) - an Open ID config object. If omitted,
  no Open ID endpoint will be available.

## DrPublish configuration

- `width` (optional, default 600) - default width of embedded videos
- `height` (optional, default 338) - default height of embedded videos
- `background` (optional, default #000) - background color of embedded videos

## Feide configuration

- `saml` - SAML metadata config object
- `accessRequirement` (optional, default none) - user metadata requirements for access

## Open ID configuration

## Config format

The config object format recognized by stout:

```json
{
  "port": <stout server port>
  "neo4j": <neo4j server endpoint OR seraph db configuration object>
  "cookieDomain": <umbrella hostname for system - optional>
  "stoutmeal": <path to stoutmeal config file or stoutmeal config object>
  "colorscheme": <susebron colorscheme object or path to json file containing one>
  "log": <logginator config>
  "alternativeLogin": <URL to alternative login endpoint - e.g. for IdP integration>
  "alternativeLogout": <URL to alternative logout endpoint - e.g. for IdP integration>
}
```

      "clientSecret": "C97w6g_gSSpie_uf.as5Zlpnir3r64Oni-",
      "discoveryURL": "https://login.microsoftonline.com/0ceb80d1-08c3-4e59-93c7-d029989b96bd/v2.0/.well-known/openid-configuration",
      "host": "http://localhost:6006"

- `clientId` - The client ID
- `clientSecret` - The client secret
- `discoveryURL` - The Open ID discovery URL
- `host` - Host URL of Chaang. This is used to set callback URL

### saml

- `entryPoint` - Single Sign On URL. Example: "https://openidp.feide.no/simplesaml/saml2/idp/SSOService.php"
- `logoutUrl` - Single Sing Out URL. Example: "https://openidp.feide.no/simplesaml/saml2/idp/SingleLogoutService.php"
- `issuer` - The identity of this BRIK instance when registered as a service provider. Example: "brik-dummy-sp"

### accessRequirement

Object which keys are user metadata fields, and values are rule objects for those fields.

If a user's metadata does not match all rules, access will be rejected.

Rule object format:

- `type` (optional, default string) - How to interpret the metadata field's value. Can be `list` or `string`.
- `value` - Requirement on the user metadata field. If string, must have this value. If list, the value must be found in one of the list items.
