import Properties from './ChromeProperties.js'
import Studio from 'jsreport-studio'
import ChromeEditor from './ChromeEditor.js'
import * as Constants from './constants.js'
import ChromeTitle from './ChromeTitle.js'

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
      marginLeft: '...',
      mediaType: 'print|screen'
    }
  }
})

Studio.addEditorComponent(Constants.CHROME_TAB_EDITOR, ChromeEditor)
Studio.addTabTitleComponent(Constants.CHROME_TAB_TITLE, ChromeTitle)
Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf') ? 'fa-file-pdf-o' : null)
