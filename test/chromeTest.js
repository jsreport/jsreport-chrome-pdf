process.env.debug = 'jsreport'
const JsReport = require('jsreport-core')
require('should')

describe('chrome pdf', () => {
  let reporter

  beforeEach(() => {
    reporter = JsReport({
      tasks: {
        strategy: 'in-process'
      }
    })
    reporter.use(require('../')({
      launchOptions: {
        args: ['--no-sandbox']
      }
    }))

    return reporter.init()
  })

  it('should not fail when rendering', async () => {
    const request = {
      template: { content: 'Foo', recipe: 'chrome-pdf', engine: 'none' }
    }

    const res = await reporter.render(request)
    res.content.toString().should.containEql('%PDF')
  })

  it('should not fail when rendering header', async () => {
    const request = {
      template: { content: 'Heyx', recipe: 'chrome-pdf', engine: 'none', chrome: { header: 'Foo' } }
    }

    const res = await reporter.render(request)
    res.content.toString().should.containEql('%PDF')
  })

  it('should provide logs', async () => {
    const request = {
      template: { content: 'Heyx <script>console.log("hello world")</script>', recipe: 'chrome-pdf', engine: 'none' },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.match(/hello world/)
  })

  it('should provide logs', async () => {
    const request = {
      template: { content: 'Heyx <script>console.log("hello world")</script>', recipe: 'chrome-pdf', engine: 'none' },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.match(/hello world/)
  })

  it('should render headerTemplate', async () => {
    const request = {
      template: { content: 'content', recipe: 'chrome-pdf', engine: 'none', chrome: { headerTemplate: 'foo' } },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.match(/Executing recipe html/)
  })

  it('should render footerTemplate', async () => {
    const request = {
      template: { content: 'content', recipe: 'chrome-pdf', engine: 'none', chrome: { footerTemplate: 'foo' } },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.match(/Executing recipe html/)
  })
})
