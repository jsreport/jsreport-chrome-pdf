/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using headless chrome.
 */

const puppeteer = require('puppeteer')

function numberOrUndefined (param) {
  try {
    return parseInt(param)
  } catch (e) {
    return undefined
  }
}

function execute (reporter, definition) {
  return async (req, res) => {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    page.on('console', (m) => {
      req.logger.debug(m, { timestamp: new Date() })
    })

    await page.setContent(res.content.toString())

    const chrome = Object.assign({}, req.template.chrome)
    chrome.scale = numberOrUndefined(chrome.scale)
    chrome.margin = {
      top: chrome.marginTop,
      right: chrome.marginRight,
      bottom: chrome.marginBottom,
      left: chrome.marginLeft
    }

    if (chrome.waitForJS === true || chrome.waitForJS === 'true') {
      req.logger.debug('Chrome will wait for printing trigger')
      await page.waitForFunction('window.JSREPORT_READY_TO_START === true', { timeout: definition.options.timeout })
    }

    req.logger.debug('Running chrome with params ' + JSON.stringify(chrome))

    res.content = await page.pdf(chrome)

    await browser.close()

    res.headers['Content-Type'] = 'application/pdf'
    res.headers['Content-Disposition'] = 'inline; filename="report.pdf"'
    res.headers['File-Extension'] = 'pdf'
  }
}

module.exports = function (reporter, definition) {
  reporter.extensionsManager.recipes.push({
    name: 'chrome-pdf',
    execute: execute(reporter, definition)
  })

  reporter.documentStore.registerComplexType('ChromeType', {
    scale: { type: 'Edm.Int32' },
    displayHeaderFooter: { type: 'Edm.Boolean' },
    printBackground: { type: 'Edm.Boolean' },
    pageRanges: { type: 'Edm.String' },
    format: { type: 'Edm.String' },
    width: { type: 'Edm.String' },
    height: { type: 'Edm.String' },
    marginTop: { type: 'Edm.String' },
    marginRight: { type: 'Edm.String' },
    marginBottom: { type: 'Edm.String' },
    marginLeft: { type: 'Edm.String' },
    waitForJS: { type: 'Edm.Boolean' }
  })

  if (reporter.documentStore.model.entityTypes['TemplateType']) {
    reporter.documentStore.model.entityTypes['TemplateType'].chrome = { type: 'jsreport.ChromeType' }
  }
}
