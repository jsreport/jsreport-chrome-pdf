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

    const res = await reporter.render(request, {})
    res.content.toString().should.containEql('%PDF')
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

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.match(/hello world/)
  })
})

describe('single executable', () => {
  function createReporter () {
    return JsReport({
      tasks: {
        strategy: 'in-process'
      }
    })
      .use(require('../')({
        launchOptions: {
          args: ['--no-sandbox']
        }
      }))
  }

  it('should add zip file', async function () {
    this.timeout(60000)

    let reporter = createReporter()

    let pathToZip
    reporter.compilation = {
      resourceInTemp (name, path) {
        pathToZip = path
      }
    }

    await reporter.init()

    reporter = createReporter()
    reporter.execution = {
      resourceTempPath () {
        return pathToZip
      }
    }

    await reporter.init()

    const request = {
      template: { content: 'Foo', recipe: 'chrome-pdf', engine: 'none' }
    }

    const res = await reporter.render(request, {})
    res.content.toString().should.containEql('%PDF')
  })
})
