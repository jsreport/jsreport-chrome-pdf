process.env.debug = 'jsreport'
const path = require('path')
const fs = require('fs')
const JsReport = require('jsreport-core')
require('should')
const parsePdf = require('parse-pdf')

describe('chrome pdf', () => {
  describe('dedicated-process strategy', () => {
    common('dedicated-process')

    describe('chrome pdf with small timeout', () => {
      commonTimeout('dedicated-process')
    })

    describe('chrome crashing', () => {
      commonCrashing('dedicated-process')
    })
  })

  describe('chrome-pool strategy', () => {
    common('chrome-pool')

    describe('chrome pdf with small timeout', () => {
      commonTimeout('chrome-pool')
    })

    describe('chrome crashing', () => {
      commonCrashing('chrome-pool')
    })
  })

  describe('chrome-page-pool strategy', () => {
    common('chrome-page-pool')

    describe('chrome pdf with small timeout', () => {
      commonTimeout('chrome-page-pool')
    })

    describe('chrome crashing', () => {
      commonCrashing('chrome-page-pool')
    })
  })
})

describe('chrome image', () => {
  describe('dedicated-process strategy', () => {
    common('dedicated-process', true)

    describe('chrome pdf with small timeout', () => {
      commonTimeout('dedicated-process', true)
    })

    describe('chrome crashing', () => {
      commonCrashing('dedicated-process', true)
    })
  })

  describe('chrome-pool strategy', () => {
    common('chrome-pool', true)

    describe('chrome pdf with small timeout', () => {
      commonTimeout('chrome-pool', true)
    })

    describe('chrome crashing', () => {
      commonCrashing('chrome-pool', true)
    })
  })

  describe('chrome-page-pool strategy', () => {
    common('chrome-page-pool', true)

    describe('chrome pdf with small timeout', () => {
      commonTimeout('chrome-page-pool', true)
    })

    describe('chrome crashing', () => {
      commonCrashing('chrome-page-pool', true)
    })
  })
})

function common (strategy, imageExecution) {
  let reporter
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(() => {
    reporter = JsReport({
      templatingEngines: {
        strategy: 'in-process'
      }
    })

    reporter.use(require('jsreport-handlebars')())

    reporter.use(require('../')({
      strategy,
      numberOfWorkers: 2,
      launchOptions: {
        args: ['--no-sandbox']
      }
    }))

    return reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('should not fail when rendering', async () => {
    const request = {
      template: { content: 'Foo', recipe, engine: 'none' }
    }

    const res = await reporter.render(request)

    if (!imageExecution) {
      res.content.toString().should.containEql('%PDF')
    } else {
      res.meta.contentType.startsWith('image').should.be.True()
    }
  })

  it('not fail when rendering multiple times', async () => {
    const request = {
      template: { content: 'Foo', recipe, engine: 'none' }
    }

    const op = []

    op.push(reporter.render(request))
    op.push(reporter.render(request))
    op.push(reporter.render(request))
    op.push(reporter.render(request))
    op.push(reporter.render(request))

    await Promise.all(op)
  })

  if (!imageExecution) {
    it('should not fail when rendering header', async () => {
      const request = {
        template: { content: 'Heyx', recipe, engine: 'none', chrome: { header: 'Foo' } }
      }

      const res = await reporter.render(request)
      res.content.toString().should.containEql('%PDF')
    })

    it('should render headerTemplate', async () => {
      const request = {
        template: { content: 'content', recipe, engine: 'none', chrome: { headerTemplate: 'foo' } },
        options: { debug: { logsToResponseHeader: true } }
      }

      const res = await reporter.render(request)
      JSON.stringify(res.meta.logs).should.match(/Executing recipe html/)
    })

    it('should render footerTemplate', async () => {
      const request = {
        template: { content: 'content', recipe, engine: 'none', chrome: { footerTemplate: 'foo' } },
        options: { debug: { logsToResponseHeader: true } }
      }

      const res = await reporter.render(request)
      JSON.stringify(res.meta.logs).should.match(/Executing recipe html/)
    })

    it('should render header/footer with helpers', async () => {
      const request = {
        template: {
          content: 'content',
          recipe,
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

    it('should work with scale option', async () => {
      const request = {
        template: {
          content: 'content',
          recipe,
          engine: 'handlebars',
          chrome: {
            scale: '2.0'
          }
        }
      }

      const res = await reporter.render(request)
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.containEql('content')
    })
  }

  it('should provide logs', async () => {
    const request = {
      template: { content: 'Heyx <script>console.log("hello world")</script>', recipe, engine: 'none' },
      options: { debug: { logsToResponseHeader: true } }
    }

    const res = await reporter.render(request)
    JSON.stringify(res.meta.logs).should.match(/hello world/)
  })

  it('should merge chrome options from page\'s javascript', async () => {
    const request = {
      template: {
        content: `
          content
          <script>
            ${imageExecution ? `
              window.JSREPORT_CHROME_IMAGE_OPTIONS = {
                type: 'jpeg'
              }
            ` : `
              window.JSREPORT_CHROME_PDF_OPTIONS = {
                displayHeaderFooter: true,
                marginTop: '80px',
                headerTemplate: '{{foo}}'
              }
            `}
          </script>
        `,
        recipe,
        engine: 'handlebars'
      },
      data: {
        foo: '1'
      }
    }

    const res = await reporter.render(request)

    if (imageExecution) {
      res.meta.contentType.should.be.eql('image/jpeg')
    } else {
      const parsed = await parsePdf(res.content)

      parsed.pages[0].text.should.containEql('content')
      parsed.pages[0].text.should.containEql('1')
    }
  })

  it('should avoid merging sensitive options from page\'s javascript', async () => {
    const distPath = path.join(__dirname, '../testReport.pdf')

    const request = {
      template: {
        content: `
          content
          <script>
            ${imageExecution ? `
              window.JSREPORT_CHROME_IMAGE_OPTIONS = {
                path: '${distPath}'
              }
            ` : `
              window.JSREPORT_CHROME_PDF_OPTIONS = {
                path: '${distPath}',
                displayHeaderFooter: true,
                marginTop: '80px',
                headerTemplate: '{{foo}}'
              }
            `}
          </script>
        `,
        recipe,
        engine: 'handlebars'
      },
      data: {
        foo: '1'
      }
    }

    const res = await reporter.render(request)

    const exists = fs.existsSync(distPath)

    exists.should.be.False()

    if (!imageExecution) {
      const parsed = await parsePdf(res.content)
      parsed.pages[0].text.should.containEql('content')
      parsed.pages[0].text.should.containEql('1')
    } else {
      res.meta.contentType.startsWith('image').should.be.True()
    }
  })

  if (!imageExecution) {
    it('should default into media type print', async () => {
      const request = {
        template: {
          content: '<style>@media only print{ span { display: none } }</style>text<span>screen</span>',
          recipe,
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
          recipe,
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
          recipe,
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
  }
}

function commonTimeout (strategy, imageExecution) {
  let reporter
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(() => {
    reporter = JsReport()
    reporter.use(require('../')({
      strategy,
      launchOptions: {
        args: ['--no-sandbox']
      },
      timeout: 1
    }))

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should reject', async () => {
    const request = {
      template: { content: 'content', recipe, engine: 'none' }
    }

    return reporter.render(request).should.be.rejected()
  })
}

function commonCrashing (strategy, imageExecution) {
  let reporter
  let originalUrlFormat
  const recipe = imageExecution ? 'chrome-image' : 'chrome-pdf'

  beforeEach(async () => {
    reporter = JsReport()
    reporter.use(require('../')({
      strategy,
      launchOptions: {
        args: ['--no-sandbox']
      }
    }))

    originalUrlFormat = require('url').format
    return reporter.init()
  })

  afterEach(async () => {
    require('url').format = originalUrlFormat

    if (reporter) {
      await reporter.close()
    }
  })

  it('should handle page.on(error) and reject', (done) => {
    require('url').format = () => 'chrome://crash'
    process.on('unhandledRejection', () => done(new Error('Rejection should be handled!')))

    reporter.render({
      template: { content: 'content', recipe, engine: 'none' }
    }).catch(() => done())
  })
}
