const path = require('path')
const Reporter = require('jsreport-core').Reporter

require('should')

describe('chrome pdf', () => {
  var reporter

  beforeEach(() => {
    reporter = new Reporter({
      rootDirectory: path.join(__dirname, '../')
    })

    return reporter.init()
  })

  it('should not fail when rendering', async () => {
    const request = {
      template: { content: 'Heyx', recipe: 'chrome-pdf', engine: 'none' }
    }

    const res = await reporter.render(request, {})
    res.content.toString().should.containEql('%PDF')
  })

  it('should provide logs', async () => {
    const request = {
      template: { content: 'Heyx <script>console.log("hello world")</script>', recipe: 'chrome-pdf', engine: 'none' },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request, {})
    res.headers['Debug-Logs'].should.match(/hello world/)
  })
})
