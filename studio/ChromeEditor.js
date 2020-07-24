import PropTypes from 'prop-types'
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
  entity: PropTypes.object.isRequired,
  tab: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired
}
