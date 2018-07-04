/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using headless chrome.
 */

const util = require('util')
const path = require('path')
const fs = require('fs')
const url = require('url')
const extend = require('node.extend')
const uuid = require('uuid/v4')
const puppeteer = require('puppeteer')

const writeFileAsync = util.promisify(fs.writeFile)

const runWithTimeout = (fn, ms, msg) => {
  return new Promise(async (resolve, reject) => {
    let resolved = false

    const info = {
      // information to pass to fn to ensure it can cancel
      // things if it needs to
      error: null
    }

    const timer = setTimeout(() => {
      const err = new Error(`Timeout Error: ${msg}`)
      info.error = err
      resolved = true
      reject(err)
    }, ms)

    try {
      const result = await fn(info, (err) => {
        clearTimeout(timer)
        reject(err)
      })

      if (resolved) {
        return
      }

      resolve(result)
    } catch (e) {
      if (resolved) {
        return
      }

      reject(e)
    } finally {
      clearTimeout(timer)
    }
  })
}

async function renderHeaderOrFooter (type, reporter, req, content) {
  reporter.logger.debug(`Starting child request to render pdf ${type}`, req)

  const template = extend(true, {}, req.template, { content, engine: req.template.engine, recipe: 'html' })

  const res = await reporter.render({
    template
  }, req)

  return res.content.toString()
}

function execute (reporter, definition) {
  return async (req, res) => {
    const launchOptions = Object.assign({}, definition.options.launchOptions)

    let browser
    let browserClosed = false

    try {
      await runWithTimeout(async (timeoutInfo, reject) => {
        try {
          browser = await puppeteer.launch(launchOptions)

          if (timeoutInfo.error) {
            return
          }

          const page = await browser.newPage()

          if (timeoutInfo.error) {
            return
          }

          page.on('error', reject)

          page.on('console', (m) => {
            reporter.logger.debug(m.text(), { timestamp: new Date().getTime(), ...req })
          })

          const chrome = Object.assign({}, req.template.chrome)

          if (chrome.headerTemplate) {
            chrome.headerTemplate = await renderHeaderOrFooter('header', reporter, req, chrome.headerTemplate)
          }

          if (timeoutInfo.error) {
            return
          }

          if (chrome.footerTemplate) {
            chrome.footerTemplate = await renderHeaderOrFooter('footer', reporter, req, chrome.footerTemplate)
          }

          if (timeoutInfo.error) {
            return
          }

          if (chrome.waitForNetworkIddle === true) {
            reporter.logger.debug('Chrome will wait for network iddle before printing', req)
          }

          const id = uuid()
          const htmlPath = path.join(reporter.options.tempAutoCleanupDirectory, `${id}-chrome-pdf.html`)

          if (!path.isAbsolute(htmlPath)) {
            throw new Error(`generated htmlPath option must be an absolute path to a file. path: ${htmlPath}`)
          }

          await writeFileAsync(htmlPath, res.content.toString())

          if (timeoutInfo.error) {
            return
          }

          const htmlUrl = url.format({
            protocol: 'file',
            pathname: htmlPath
          })

          // this is the same as sending timeout options to the page.goto
          // but additionally setting it more generally in the page
          page.setDefaultNavigationTimeout(definition.options.timeout)

          await page.goto(
            htmlUrl,
            chrome.waitForNetworkIddle === true
              ? { waitUntil: 'networkidle0' }
              : { }
          )

          if (timeoutInfo.error) {
            return
          }

          if (chrome.waitForJS === true) {
            reporter.logger.debug('Chrome will wait for printing trigger', req)
            await page.waitForFunction('window.JSREPORT_READY_TO_START === true', { timeout: definition.options.timeout })
          }

          let newChromeSettings = await page.evaluate(() => window.JSREPORT_CHROME_PDF_OPTIONS)

          if (newChromeSettings != null) {
            delete newChromeSettings.path
          }

          Object.assign(chrome, newChromeSettings)

          if (chrome.mediaType) {
            if (chrome.mediaType !== 'screen' && chrome.mediaType !== 'print') {
              throw reporter.createError(`chrome.mediaType must be eql to 'screen' or 'print'`, { weak: true })
            }

            await page.emulateMedia(chrome.mediaType)
          }

          chrome.margin = {
            top: chrome.marginTop,
            right: chrome.marginRight,
            bottom: chrome.marginBottom,
            left: chrome.marginLeft
          }

          if (timeoutInfo.error) {
            return
          }

          reporter.logger.debug('Running chrome with params ' + JSON.stringify(chrome), req)

          res.content = await page.pdf(chrome)

          if (timeoutInfo.error) {
            return
          }

          res.meta.contentType = 'application/pdf'
          res.meta.fileExtension = 'pdf'
        } finally {
          // this block can be fired when there is a timeout and
          // runWithTimeout was resolved but we cancel the code branch with "return"
          if (browser && !browserClosed) {
            browserClosed = true
            await browser.close()
          }
        }
      }, definition.options.timeout, `pdf generation not completed after ${definition.options.timeout}ms`)
    } finally {
      if (browser && !browserClosed) {
        browserClosed = true
        await browser.close()
      }
    }
  }
}

module.exports = function (reporter, definition) {
  const versionSupported = /^2/

  if (!versionSupported.test(reporter.version)) {
    throw new Error(`${definition.name} extension version currently installed can only be used in jsreport v2, your current jsreport installation (${
      reporter.version
    }) is incompatible with this extension. please downgrade ${definition.name} extension to a version which works with jsreport ${
      reporter.version
    } or update jsreport to v2`)
  }

  reporter.extensionsManager.recipes.push({
    name: 'chrome-pdf',
    execute: execute(reporter, definition)
  })

  definition.options = Object.assign({}, reporter.options.chrome, definition.options)

  if (definition.options.launchOptions == null) {
    definition.options.launchOptions = {}
  }

  if (definition.options.timeout == null) {
    definition.options.timeout = 30000
  }

  if (definition.options.launchOptions && Object.keys(definition.options.launchOptions).length > 0) {
    reporter.logger.debug('Chrome custom launch options are', definition.options.launchOptions)
  }

  reporter.documentStore.registerComplexType('ChromeType', {
    scale: { type: 'Edm.Decimal', schema: { type: 'null' } },
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
    mediaType: { type: 'Edm.String' },
    waitForJS: { type: 'Edm.Boolean' },
    waitForNetworkIddle: { type: 'Edm.Boolean' },
    headerTemplate: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    footerTemplate: { type: 'Edm.String', document: { extension: 'html', engine: true } }
  })

  if (reporter.documentStore.model.entityTypes['TemplateType']) {
    reporter.documentStore.model.entityTypes['TemplateType'].chrome = { type: 'jsreport.ChromeType' }
  }

  reporter.initializeListeners.add(definition.name, () => {
    if (!reporter.documentStore.collection('templates')) {
      return
    }

    reporter.documentStore.collection('templates').beforeInsertListeners.add(definition.name, (doc) => {
      let scale

      if (doc.chrome && doc.chrome.scale != null) {
        scale = doc.chrome.scale
      }

      if (!scale) {
        return
      }

      scale = parseFloat(scale)

      if (isNaN(scale)) {
        throw new Error(`Can not insert template because "chrome.scale" property should be a valid number`)
      }

      doc.chrome.scale = scale
    })

    reporter.documentStore.collection('templates').beforeUpdateListeners.add(definition.name, (query, update) => {
      let scale

      if (update.$set && update.$set.chrome && update.$set.chrome.scale != null) {
        scale = update.$set.chrome.scale
      }

      if (!scale) {
        return
      }

      scale = parseFloat(scale)

      if (isNaN(scale)) {
        throw new Error(`Can not update template because "chrome.scale" property should be a valid number`)
      }

      update.$set.chrome.scale = scale
    })
  })
}
