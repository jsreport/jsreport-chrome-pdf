import React, { Component } from 'react'
import { TextEditor } from 'jsreport-studio'

export default class ChromeEditor extends Component {
  render () {
    const { entity, onUpdate, tab } = this.props

    return (<TextEditor
      name={entity._id + '_chrome' + tab.headerOrFooter}
      mode='handlebars'
      value={entity.chrome ? entity.chrome[tab.headerOrFooter + 'Template'] : ''}
      onUpdate={(v) => onUpdate(Object.assign({}, entity, { chrome: Object.assign({}, entity.chrome, { [tab.headerOrFooter + 'Template']: v }) }))}
    />)
  }
}

ChromeEditor.propTypes = {
  entity: React.PropTypes.object.isRequired,
  tab: React.PropTypes.object.isRequired,
  onUpdate: React.PropTypes.func.isRequired
}
