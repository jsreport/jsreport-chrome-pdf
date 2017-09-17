# jsreport-chrome-pdf
[![NPM Version](http://img.shields.io/npm/v/jsreport-chrome-pdf.svg?style=flat-square)](https://npmjs.com/package/jsreport-chrome-pdf)
[![Build Status](https://travis-ci.org/jsreport/jsreport-chrome-pdf.png?branch=master)](https://travis-ci.org/jsreport/jsreport-chrome-pdf)

> jsreport recipe which is rendering pdf from html using headless chrome

See the docs https://jsreport.net/learn/chrome-pdf

## Installation

> **npm install jsreport-chrome-pdf**


## Usage
To use `recipe` in for template rendering set `template.recipe=chrome-pdf` in the rendering request.

```js
{
  template: { content: '...', recipe: 'chrome-pdf', engine: '...', chrome: { ... } }
}
```

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-chrome-pdf')())
```

