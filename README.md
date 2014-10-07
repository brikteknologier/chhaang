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

## DrPublish configuration

* `width` (optional, default 600) - default width of embedded videos
* `height` (optional, default 338) - default height of embedded videos
* `background` (optional, default #000) - background color of embedded videos
