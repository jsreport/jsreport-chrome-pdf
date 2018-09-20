const conversion = require('./conversion')

module.exports = ({ reporter, puppeteer, options }) => {
  const { timeout } = options

  const execute = async ({ htmlUrl, strategy, launchOptions, conversionOptions, req }) => {
    let browser

    try {
      const result = await conversion({
        reporter,
        getBrowser: async () => {
          browser = await puppeteer.launch(launchOptions)
          return browser
        },
        htmlUrl,
        strategy,
        timeout,
        req,
        options: conversionOptions
      })

      return result.pdf
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  execute.kill = () => {}

  return execute
}
