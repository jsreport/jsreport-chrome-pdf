/*!
 * Copyright(c) 2017 Jan Blaha
 *
 * Recipe rendering pdf files using headless chrome.
 */

const os = require('os')
const url = require('url')
const extend = require('node.extend.without.arrays')
const puppeteer = require('puppeteer')
const dedicatedProcessStrategy = require('./dedicatedProcessStrategy')
const chromePoolStrategy = require('./chromePoolStrategy')

const numCPUs = os.cpus().length

async function renderHeaderOrFooter (type, reporter, req, content) {
  reporter.logger.debug(`Starting child request to render pdf ${type}`, req)

  const template = extend(true, {}, req.template, { content, engine: req.template.engine, recipe: 'html' })

  const res = await reporter.render({
    template
  }, req)

  return res.content.toString()
}

function execute (reporter, definition, strategyCall, imageExecution) {
  const strategy = definition.options.strategy

  return async (req, res) => {
    const launchOptions = Object.assign({}, definition.options.launchOptions)

    const { pathToFile: htmlPath } = await reporter.writeTempFile((uuid) => `${uuid}-${imageExecution ? 'chrome-image' : 'chrome-pdf'}.html`, res.content.toString())

    // when running docker on windows host the isAbsolute is not able to correctly determine
    // if path is absolute
    // if (!path.isAbsolute(htmlPath)) {
    //  throw new Error(`generated htmlPath option must be an absolute path to a file. path: ${htmlPath}`)
    // }

    const htmlUrl = url.format({
      protocol: 'file',
      pathname: htmlPath
    })

    const chrome = Object.assign({}, imageExecution ? req.template.chromeImage : req.template.chrome)

    if (!imageExecution) {
      if (chrome.headerTemplate) {
        chrome.headerTemplate = await renderHeaderOrFooter('header', reporter, req, chrome.headerTemplate)
      }

      if (chrome.footerTemplate) {
        chrome.footerTemplate = await renderHeaderOrFooter('footer', reporter, req, chrome.footerTemplate)
      }
    }

    const result = await strategyCall({
      htmlUrl,
      strategy,
      puppeteer,
      launchOptions,
      req,
      conversionOptions: chrome,
      imageExecution
    })

    res.content = result.content

    if (imageExecution) {
      res.meta.contentType = `image/${result.type}`
      res.meta.fileExtension = result.type
    } else {
      res.meta.contentType = 'application/pdf'
      res.meta.fileExtension = 'pdf'
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

  definition.options = Object.assign({}, reporter.options.chrome, definition.options)

  if (definition.options.launchOptions == null) {
    definition.options.launchOptions = {}
  }

  if (definition.options.timeout == null) {
    definition.options.timeout = 30000
  }

  if (definition.options.strategy == null) {
    definition.options.strategy = 'dedicated-process'
  }

  if (
    definition.options.strategy !== 'dedicated-process' &&
    definition.options.strategy !== 'chrome-pool'
  ) {
    throw new Error(`Unsupported strategy "${definition.options.strategy}" for chrome-pdf`)
  }

  if (definition.options.numberOfWorkers == null) {
    definition.options.numberOfWorkers = numCPUs
  }

  if (definition.options.strategy === 'chrome-pool') {
    reporter.logger.debug(`Chrome strategy is ${definition.options.strategy}, numberOfWorkers: ${definition.options.numberOfWorkers}`)
  } else {
    reporter.logger.debug(`Chrome strategy is ${definition.options.strategy}`)
  }

  if (definition.options.launchOptions && Object.keys(definition.options.launchOptions).length > 0) {
    reporter.logger.debug('Chrome custom launch options are', definition.options.launchOptions)
  }

  let strategyCall

  if (definition.options.strategy === 'dedicated-process') {
    strategyCall = dedicatedProcessStrategy({ reporter, puppeteer, options: definition.options })
  } else if (definition.options.strategy === 'chrome-pool') {
    strategyCall = chromePoolStrategy({ reporter, puppeteer, options: definition.options })
  }

  reporter.chromeStrategyKill = strategyCall.kill

  reporter.extensionsManager.recipes.push({
    name: 'chrome-pdf',
    execute: execute(reporter, definition, strategyCall)
  })

  reporter.extensionsManager.recipes.push({
    name: 'chrome-image',
    execute: execute(reporter, definition, strategyCall, true)
  })

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

  reporter.documentStore.registerComplexType('ChromeImageType', {
    type: { type: 'Edm.String' },
    quality: { type: 'Edm.Decimal', schema: { type: 'null' } },
    fullPage: { type: 'Edm.Boolean' },
    clipX: { type: 'Edm.Decimal', schema: { type: 'null' } },
    clipY: { type: 'Edm.Decimal', schema: { type: 'null' } },
    clipWidth: { type: 'Edm.Decimal', schema: { type: 'null' } },
    clipHeight: { type: 'Edm.Decimal', schema: { type: 'null' } },
    omitBackground: { type: 'Edm.Boolean' },
    mediaType: { type: 'Edm.String' },
    waitForJS: { type: 'Edm.Boolean' },
    waitForNetworkIddle: { type: 'Edm.Boolean' }
  })

  if (reporter.documentStore.model.entityTypes['TemplateType']) {
    reporter.documentStore.model.entityTypes['TemplateType'].chrome = { type: 'jsreport.ChromeType' }
    reporter.documentStore.model.entityTypes['TemplateType'].chromeImage = { type: 'jsreport.ChromeImageType' }
  }

  reporter.closeListeners.add('docker-workers', async () => {
    if (reporter.chromeStrategyKill) {
      await reporter.chromeStrategyKill()
    }
  })
}
