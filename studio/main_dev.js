import Properties from './ChromeProperties.js'
import ImageProperties from './ChromeImageProperties.js'
import Studio from 'jsreport-studio'
import ChromeEditor from './ChromeEditor.js'
import * as Constants from './constants.js'
import ChromeTitle from './ChromeTitle.js'

Studio.addPropertiesComponent('chrome pdf', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf')
Studio.addPropertiesComponent('chrome image', ImageProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'chrome-image')

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
    },
    chromeImage: {
      type: 'jpeg|png',
      quality: 80,
      fullPage: false,
      clipX: 0,
      clipY: 0,
      clipWidth: 800,
      clipHeight: 800,
      omitBackground: false,
      mediaType: 'print|screen'
    }
  }
})

Studio.addEditorComponent(Constants.CHROME_TAB_EDITOR, ChromeEditor)
Studio.addTabTitleComponent(Constants.CHROME_TAB_TITLE, ChromeTitle)
Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf') ? 'fa-file-pdf-o' : null)
Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'templates' && entity.recipe === 'chrome-image') ? 'fa-file-image-o' : null)
