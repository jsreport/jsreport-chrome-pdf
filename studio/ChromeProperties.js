import React, { Component } from 'react'

export default class Properties extends Component {
  render () {
    const { entity, onChange } = this.props
    const chrome = entity.chrome || {}

    const changeChrome = (change) => onChange({ ...entity, chrome: { ...entity.chrome, ...change } })

    return (
      <div className='properties-section'>
        <div className='form-group'><label>scale</label>
          <input
            type='text' placeholder='1' value={chrome.scale || ''}
            onChange={(v) => changeChrome({ scale: v.target.value })} />
        </div>
        <div className='form-group'>
          <label>display header/footer</label>
          <input
            type='checkbox' checked={chrome.displayHeaderFooter === true}
            onChange={(v) => changeChrome({ displayHeaderFooter: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>print background</label>
          <input
            type='checkbox' checked={chrome.printBackground === true}
            onChange={(v) => changeChrome({ printBackground: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>landscape</label>
          <input
            type='checkbox' checked={chrome.landscape === true}
            onChange={(v) => changeChrome({ landscape: v.target.checked })} />
        </div>
        <div className='form-group'><label>pageRanges</label>
          <input
            type='text' placeholder='1-5, 8, 11-13' value={chrome.pageRanges || ''}
            onChange={(v) => changeChrome({ pageRanges: v.target.value })} />
        </div>
        <div className='form-group'><label>format</label>
          <input
            type='text' placeholder='Letter' value={chrome.format || ''}
            onChange={(v) => changeChrome({ format: v.target.value })} />
        </div>
        <div className='form-group'><label>width</label>
          <input
            type='text' placeholder='10cm' value={chrome.width || ''}
            onChange={(v) => changeChrome({ width: v.target.value })} />
        </div>
        <div className='form-group'><label>height</label>
          <input
            type='text' placeholder='10cm' value={chrome.height || ''}
            onChange={(v) => changeChrome({ height: v.target.value })} />
        </div>
        <div className='form-group'><label>margin top</label>
          <input
            type='text' placeholder='10cm' value={chrome.marginTop || ''}
            onChange={(v) => changeChrome({ marginTop: v.target.value })} />
        </div>
        <div className='form-group'><label>margin right</label>
          <input
            type='text' placeholder='10cm' value={chrome.marginRight || ''}
            onChange={(v) => changeChrome({ marginRight: v.target.value })} />
        </div>
        <div className='form-group'><label>margin bottom</label>
          <input
            type='text' placeholder='10cm' value={chrome.marginBottom || ''}
            onChange={(v) => changeChrome({ marginBottom: v.target.value })} />
        </div>
        <div className='form-group'><label>margin left</label>
          <input
            type='text' placeholder='10cm' value={chrome.marginLeft || ''}
            onChange={(v) => changeChrome({ marginLeft: v.target.value })} />
        </div>
        <div className='form-group'>
          <label title='window.JSREPORT_READY_TO_START=true;'>wait for printing trigger</label>
          <input
            type='checkbox' title='window.JSREPORT_READY_TO_START=true;' checked={chrome.waitForJS === true}
            onChange={(v) => changeChrome({ waitForJS: v.target.checked })} />
        </div>
      </div>
    )
  }
}
