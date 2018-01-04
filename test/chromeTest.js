const JsReport = require('jsreport-core')
require('should')

describe('chrome pdf', () => {
  var reporter

  beforeEach(() => {
    reporter = JsReport({
      tasks: {
        strategy: 'in-process'
      }
    })
    reporter.use(require('../')())
    reporter.use(require('jsreport-debug')())

    return reporter.init()
  })

  it('should not fail when rendering', async () => {
    const request = {
      template: { content: 'Foo', recipe: 'chrome-pdf', engine: 'none' }
    }

    const res = await reporter.render(request, {})
    res.content.toString().should.containEql('%PDF')
    require('fs').writeFileSync('ccontent.pdf', res.content)
  })

  it('should not fail when rendering header', async () => {
    const request = {
      template: { content: 'Heyx', recipe: 'chrome-pdf', engine: 'none', chrome: { header: 'Foo' } }
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
