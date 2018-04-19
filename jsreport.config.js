
module.exports = {
  'name': 'chrome-pdf',
  'main': 'lib/chrome.js',
  'optionsSchema': {
    extensions: {
      'chrome-pdf': {
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
    }
  },
  'dependencies': [ 'templates' ]
}
