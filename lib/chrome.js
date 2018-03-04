/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using headless chrome.
 */

const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
const { compress, decompress } = require('./utils')

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
      reporter.logger.debug(m.text(), { timestamp: new Date(), ...req })
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

  if (reporter.compilation) {
    const fileToPatch = path.join(require.resolve('puppeteer'), '..', 'lib', 'Downloader.js')
    const contentToPatch = fs.readFileSync(fileToPatch).toString()
    fs.writeFileSync(fileToPatch, contentToPatch.replace(
      `require(path.join(PROJECT_ROOT, 'package.json')).puppeteer.chromium_revision;`,
      `"${require(path.join(require.resolve('puppeteer'), '..', 'package.json')).puppeteer.chromium_revision}"`))

    const chromePath = path.dirname(puppeteer.executablePath())
    const localesPath = path.join(chromePath, 'locales')

    fs.readdirSync(localesPath).forEach((f) => {
      fs.unlinkSync(path.join(localesPath, f))
    })
    if (fs.existsSync(path.join(chromePath, 'interactive_ui_tests.exe'))) {
      fs.unlinkSync(path.join(chromePath, 'interactive_ui_tests.exe'))
    }

    reporter.compilation.resourceInTemp('chrome.zip', path.join(reporter.options.tempDirectory, 'chrome.zip'))

    return compress(path.dirname(puppeteer.executablePath()), path.join(reporter.options.tempDirectory, 'chrome.zip'))
  }

  if (reporter.execution) {
    const zipPath = reporter.execution.resourceTempPath('chrome.zip')

    definition.options.launchOptions = Object.assign({
      executablePath: path.join(path.dirname(zipPath), 'chrome', 'chrome')
    }, definition.options.launchOptions)

    if (fs.existsSync(definition.options.launchOptions.executablePath)) {
      return
    }

    reporter.initializeListeners.add('chrome exe', () => decompress(zipPath))
  }
}
