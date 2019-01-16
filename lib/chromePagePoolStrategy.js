const conversion = require('./conversion')

module.exports = ({ reporter, puppeteer, options }) => {
  let mainBrowser
  let mainBrowserPendingPromise
  const pool = []
  const tasksQueue = []
  const { timeout, numberOfWorkers } = options

  if (numberOfWorkers < 1) {
    throw new Error('"numberOfWorkers" must be a number greater or equal than 1')
  }

  async function allocateBrowser (puppeteer, launchOptions) {
    if (mainBrowser) {
      return mainBrowser
    }

    if (!mainBrowserPendingPromise) {
      mainBrowserPendingPromise = puppeteer.launch(launchOptions)
    }

    mainBrowser = await mainBrowserPendingPromise
    return mainBrowser
  }

  // TODO: figure it out best way to clean page listeners of different executions, and also ensure that page
  // always load url with fresh session
  const execute = async ({ htmlUrl, strategy, launchOptions, conversionOptions, req, imageExecution }) => {
    let pageInfo
    let page
    let releasePage
    let crashError = false
    let timeoutError = false

    try {
      const result = await conversion({
        reporter,
        getBrowser: async () => {
          const browser = await allocateBrowser(puppeteer, launchOptions)
          return browser
        },
        getPage: async (browser) => {
          const allocation = await allocatePage(
            browser,
            pool,
            tasksQueue,
            { numberOfWorkers }
          )

          pageInfo = allocation.pageInfo
          releasePage = allocation.releasePage

          page = pageInfo.instance

          return page
        },
        htmlUrl,
        strategy,
        timeout,
        req,
        imageExecution,
        options: conversionOptions
      })

      return {
        type: result.type,
        content: result.content
      }
    } catch (err) {
      if (err.workerCrashed) {
        crashError = true
      } else if (err.workerTimeout) {
        timeoutError = true
      }

      throw err
    } finally {
      if (releasePage) {
        releasePage()
      }

      if ((crashError || timeoutError) && pageInfo) {
        recyclePage(mainBrowser, pageInfo).catch(() => {})
      }

      tryFlushTasksQueue(mainBrowser, pool, tasksQueue)
    }
  }

  execute.kill = async () => {
    const op = []

    pool.forEach(async (pageInfo) => {
      if (pageInfo.recycling) {
        op.push(pageInfo.recycling.then(() => {
          if (pageInfo.instance && !pageInfo.instance.isClosed()) {
            return pageInfo.instance.close()
          }
        }))
      } else if (pageInfo.instance && !pageInfo.instance.isClosed()) {
        op.push(pageInfo.instance.close())
      }
    })

    await Promise.all(op)

    if (mainBrowser) {
      await mainBrowser.close()
    }
  }

  return execute
}

async function createPage (browser, pageInfo) {
  pageInfo.instance = await browser.newPage()

  pageInfo.instance.on('error', () => {
    // clean references when the browser is no longer active (it has crashed or closed)
    pageInfo.instance = null
  })
}

async function allocatePage (browser, pool, tasksQueue, options) {
  const { numberOfWorkers } = options
  let pageInfo

  if (pool.length < numberOfWorkers) {
    pageInfo = { instance: undefined, isBusy: true }
    pool.push(pageInfo)
    await createPage(browser, pageInfo)
  } else {
    // simple round robin balancer across browser pages,
    // get the first available page from the list
    const availablePageIndex = pool.findIndex((b) => b.isBusy === false)

    if (availablePageIndex !== -1) {
      pageInfo = pool.splice(availablePageIndex, 1)[0]
      pageInfo.isBusy = true
      // ..and then if page found then make it the last item in the list
      // to continue the rotation
      pool.push(pageInfo)

      // we check that instance exists, theorically there will be always an instance,
      // however there is small chance that an error while recycling a chrome instance happens
      // and we end with .instance being null, in which case we need to create it here
      if (pageInfo.instance == null) {
        await createPage(browser, pageInfo)
      }
    } else {
      return new Promise((resolve, reject) => {
        tasksQueue.push({ resolve, reject, options })
      })
    }
  }

  return {
    pageInfo,
    releasePage: () => {
      pageInfo.isBusy = false
    }
  }
}

async function recyclePage (browser, pageInfo) {
  pageInfo.isBusy = true

  let resolveRecycling

  pageInfo.recycling = new Promise((resolve) => {
    resolveRecycling = resolve
  })

  if (pageInfo.instance) {
    await pageInfo.instance.close()
  }

  // clean the property before trying to get new instance, this let us
  // create the instance later if for some reason the instance can not be
  // created during recycling
  pageInfo.instance = null

  try {
    await createPage(browser, pageInfo)
  } finally {
    if (resolveRecycling) {
      resolveRecycling()
    }

    pageInfo.isBusy = false
  }
}

function tryFlushTasksQueue (browser, pool, tasksQueue) {
  if (tasksQueue.length === 0) {
    return
  }

  const task = tasksQueue.shift()

  allocatePage(browser, pool, tasksQueue, task.options).then(task.resolve).catch(task.reject)
}
