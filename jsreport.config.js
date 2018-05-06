
const chromeSchema = {
  type: 'object',
  properties: {
    timeout: { type: 'number' },
    launchOptions: {
      type: 'object',
      properties: {
        args: {
          anyOf: [{
            type: 'string',
            '$jsreport-constantOrArray': []
          }, {
            type: 'array',
            items: { type: 'string' }
          }]
        }
      }
    }
  }
}

module.exports = {
  'name': 'chrome-pdf',
  'main': 'lib/chrome.js',
  'optionsSchema': {
    chrome: { ...chromeSchema },
    extensions: {
      'chrome-pdf': { ...chromeSchema }
    }
  },
  'dependencies': [ 'templates' ]
}
