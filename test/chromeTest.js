process.env.debug = 'jsreport'
const path = require('path')
const fs = require('fs')
const JsReport = require('jsreport-core')
require('should')
const parsePdf = require('parse-pdf')

describe('chrome pdf', () => {
  let reporter

  beforeEach(() => {
    reporter = JsReport({
      tasks: {
        strategy: 'in-process'
      }
    })

    reporter.use(require('jsreport-handlebars')())

    reporter.use(require('../')({
      launchOptions: {
        args: ['--no-sandbox']
      }
    }))

    return reporter.init()
  })

  afterEach(() => reporter.close())

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

  it('should render header/footer with helpers', async () => {
    const request = {
      template: {
        content: 'content',
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        chrome: { displayHeaderFooter: true, marginTop: '80px', marginBottom: '80px', headerTemplate: '{{printNumber 1}}<br/>', footerTemplate: '{{printNumber 2}}<br/>' },
        helpers: `function printNumber (num) { return num  }`
      }
    }

    const res = await reporter.render(request)
    const parsed = await parsePdf(res.content)

    parsed.pages[0].text.should.containEql('1')
    parsed.pages[0].text.should.containEql('2')
  })

  it('should merge chrome options from page\'s javascript', async () => {
    const request = {
      template: {
        content: `
          content
          <script>
            window.JSREPORT_CHROME_PDF_OPTIONS = {
              displayHeaderFooter: true,
              marginTop: '80px',
              headerTemplate: '{{foo}}'
            }
          </script>
        `,
        recipe: 'chrome-pdf',
        engine: 'handlebars'
      },
      data: {
        foo: '1'
      }
    }

    const res = await reporter.render(request)
    const parsed = await parsePdf(res.content)

    parsed.pages[0].text.should.containEql('content')
    parsed.pages[0].text.should.containEql('1')
  })

  it('should avoid merging sensitive options from page\'s javascript', async () => {
    const distPath = path.join(__dirname, '../testReport.pdf')

    const request = {
      template: {
        content: `
          content
          <script>
            window.JSREPORT_CHROME_PDF_OPTIONS = {
              path: '${distPath}',
              displayHeaderFooter: true,
              marginTop: '80px',
              headerTemplate: '{{foo}}'
            }
          </script>
        `,
        recipe: 'chrome-pdf',
        engine: 'handlebars'
      },
      data: {
        foo: '1'
      }
    }

    const res = await reporter.render(request)
    const parsed = await parsePdf(res.content)

    const exists = fs.existsSync(distPath)

    exists.should.be.False()
    parsed.pages[0].text.should.containEql('content')
    parsed.pages[0].text.should.containEql('1')
  })

  it('should default into media type print', async () => {
    const request = {
      template: {
        content: '<style>@media only print{ span { display: none } }</style>text<span>screen</span>',
        recipe: 'chrome-pdf',
        engine: 'none'
      }
    }

    const res = await reporter.render(request)
    const parsed = await parsePdf(res.content)

    parsed.pages[0].text.should.not.containEql('screen')
  })

  it('should propagate media type screen', async () => {
    const request = {
      template: {
        content: '<style>@media only screen{ span { display: none } }</style>text<span>print</span>',
        recipe: 'chrome-pdf',
        engine: 'none',
        chrome: {
          mediaType: 'screen'
        }
      }
    }

    const res = await reporter.render(request)
    const parsed = await parsePdf(res.content)

    parsed.pages[0].text.should.not.containEql('print')
  })

  it('should propagate media type print', async () => {
    const request = {
      template: {
        content: '<style>@media only print{ span { display: none } }</style>text<span>screen</span>',
        recipe: 'chrome-pdf',
        engine: 'none',
        chrome: {
          mediaType: 'print'
        }
      }
    }

    const res = await reporter.render(request)
    const parsed = await parsePdf(res.content)

    parsed.pages[0].text.should.not.containEql('screen')
  })
})

describe('chrome pdf with small timeout', () => {
  let reporter

  beforeEach(() => {
    reporter = JsReport()
    reporter.use(require('../')({
      timeout: 1
    }))

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should reject', async () => {
    const request = {
      template: { content: 'content', recipe: 'chrome-pdf', engine: 'none' }
    }

    return reporter.render(request).should.be.rejected()
  })
})

describe('chrome crashing', () => {
  let reporter
  let originalUrlFormat

  beforeEach(async () => {
    reporter = JsReport()
    reporter.use(require('../')())

    originalUrlFormat = require('url').format
    return reporter.init()
  })

  afterEach(() => {
    require('url').format = originalUrlFormat
    return reporter.close()
  })

  it('should reject with proper message', async () => {
    require('url').format = () => 'chrome://crash'

    const request = {
      template: { content: 'content', recipe: 'chrome-pdf', engine: 'none' }
    }

    return reporter.render(request).should.be.rejectedWith(/Page crashed/)
  })
})
