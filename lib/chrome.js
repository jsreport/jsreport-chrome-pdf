/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using headless chrome.
 */

const util = require('util')
const path = require('path')
const fs = require('fs')
const url = require('url')
const uuid = require('uuid/v4')
const puppeteer = require('puppeteer')

const writeFileAsync = util.promisify(fs.writeFile)

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

async function renderHeaderOrFooter (reporter, req, content) {
  const res = await reporter.render({
    template: { content, engine: req.template.engine, recipe: 'html' }
  }, req)
  return res.content.toString()
}

function execute (reporter, definition) {
  return async (req, res) => {
    const launchOptions = Object.assign({}, definition.options.launchOptions)
    if (typeof launchOptions.args === 'string') {
      launchOptions.args = launchOptions.args.split(',')
    }
    const browser = await puppeteer.launch(launchOptions)
    try {
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

      if (chrome.headerTemplate) {
        chrome.headerTemplate = await renderHeaderOrFooter(reporter, req, chrome.headerTemplate)
      }

      if (chrome.footerTemplate) {
        chrome.footerTemplate = await renderHeaderOrFooter(reporter, req, chrome.footerTemplate)
      }

      if (boolOrUndefined(chrome.waitForNetworkIddle) === true) {
        reporter.logger.debug('Chrome will wait for network iddle before printing', req)
      }

      const id = uuid()
      const htmlPath = path.join(reporter.options.tempAutoCleanupDirectory, `${id}-chrome-pdf.html`)

      if (!path.isAbsolute(htmlPath)) {
        throw new Error(`generated htmlPath option must be an absolute path to a file. path: ${htmlPath}`)
      }

      await writeFileAsync(htmlPath, res.content.toString())

      const htmlUrl = url.format({
        protocol: 'file',
        pathname: htmlPath
      })

      await page.goto(
        htmlUrl,
        boolOrUndefined(chrome.waitForNetworkIddle) === true
          ? { waitUntil: 'networkidle2', timeout: definition.options.timeout }
          : { timeout: definition.options.timeout }
      )

      if (chrome.waitForJS === true || chrome.waitForJS === 'true') {
        reporter.logger.debug('Chrome will wait for printing trigger', req)
        await page.waitForFunction('window.JSREPORT_READY_TO_START === true', { timeout: definition.options.timeout })
      }

      reporter.logger.debug('Running chrome with params ' + JSON.stringify(chrome), req)

      res.content = await page.pdf(chrome)
    } finally {
      await browser.close()
    }

    res.meta.contentType = 'application/pdf'
    res.meta.fileExtension = 'pdf'
  }
}

module.exports = function (reporter, definition) {
  reporter.extensionsManager.recipes.push({
    name: 'chrome-pdf',
    execute: execute(reporter, definition)
  })

  definition.options.launchOptions = Object.assign({},
    reporter.options.chrome ? reporter.options.chrome.launchOptions : {},
    definition.options.launchOptions
  )

  reporter.logger.debug('Chrome launch options are', definition.options.launchOptions)

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
    waitForNetworkIddle: { type: 'Edm.Boolean' },
    headerTemplate: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    footerTemplate: { type: 'Edm.String', document: { extension: 'html', engine: true } }
  })

  if (reporter.documentStore.model.entityTypes['TemplateType']) {
    reporter.documentStore.model.entityTypes['TemplateType'].chrome = { type: 'jsreport.ChromeType' }
  }
}
