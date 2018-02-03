/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using headless chrome.
 */

const puppeteer = require('puppeteer')

function floatOrUndefined (param) {
  try {
    return parseFloat(param)
  } catch (e) {
    return undefined
  }
}

function boolOrUndefined (par) {
  return (par === true || par === 'true') ? true : undefined
}

function execute (reporter, definition) {
  return async (req, res) => {
    const launchOptions = Object.assign({}, definition.options.launchOptions)
    if (typeof launchOptions.args === 'string') {
      launchOptions.args = launchOptions.args.split(',')
    }
    const browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()

    page.on('console', (m) => {
      reporter.logger.debug(m, { timestamp: new Date() }, req)
    })

    const chrome = Object.assign({}, req.template.chrome)
    chrome.scale = floatOrUndefined(chrome.scale)
    chrome.landscape = boolOrUndefined(chrome.landscape)
    chrome.printBackground = boolOrUndefined(chrome.printBackground)
    chrome.displayHeaderFooter = boolOrUndefined(chrome.displayHeaderFooter)
    chrome.margin = {
      top: chrome.marginTop,
      right: chrome.marginRight,
      bottom: chrome.marginBottom,
      left: chrome.marginLeft
    }

    if (boolOrUndefined(chrome.waitForNetworkIddle) === true) {
      reporter.logger.debug('Chrome will wait for network iddle before printing', req)
    }

    await page.goto('data:text/html,' + res.content.toString(),
      boolOrUndefined(chrome.waitForNetworkIddle) === true ? {waitUntil: 'networkidle2'} : {})

    if (chrome.waitForJS === true || chrome.waitForJS === 'true') {
      reporter.logger.debug('Chrome will wait for printing trigger', req)
      await page.waitForFunction('window.JSREPORT_READY_TO_START === true', { timeout: definition.options.timeout })
    }

    reporter.logger.debug('Running chrome with params ' + JSON.stringify(chrome), req)

    res.content = await page.pdf(chrome)

    await browser.close()

    res.meta.contentType = 'application/pdf'
    res.meta.fileExtension = 'pdf'
  }
}

module.exports = function (reporter, definition) {
  reporter.extensionsManager.recipes.push({
    name: 'chrome-pdf',
    execute: execute(reporter, definition)
  })

  reporter.documentStore.registerComplexType('ChromeType', {
    scale: { type: 'Edm.String' },
    displayHeaderFooter: { type: 'Edm.Boolean' },
    printBackground: { type: 'Edm.Boolean' },
    landscape: { type: 'Edm.Boolean' },
    pageRanges: { type: 'Edm.String' },
    format: { type: 'Edm.String' },
    width: { type: 'Edm.String' },
    height: { type: 'Edm.String' },
    marginTop: { type: 'Edm.String' },
    marginRight: { type: 'Edm.String' },
    marginBottom: { type: 'Edm.String' },
    marginLeft: { type: 'Edm.String' },
    waitForJS: { type: 'Edm.Boolean' },
    waitForNetworkIddle: { type: 'Edm.Boolean' }
  })

  if (reporter.documentStore.model.entityTypes['TemplateType']) {
    reporter.documentStore.model.entityTypes['TemplateType'].chrome = { type: 'jsreport.ChromeType' }
  }
}
