import Properties from './ChromeProperties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('chrome pdf', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf')

Studio.addApiSpec({
  template: {
    chrome: {
      scale: 1,
      displayHeaderFooter: false,
      printBackground: false,
      landscape: false,
      pageRanges: '...',
      format: '...',
      width: '...',
      height: '...',
      marginTop: '...',
      marginRight: '...',
      marginBottom: '...',
      marginLeft: '...'
    }
  }
})

Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf') ? 'fa-file-pdf-o' : null)
