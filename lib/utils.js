const archiver = require('archiver')
const yauzl = require('yauzl')
const fs = require('fs')
const path = require('path')

module.exports.compress = (dir, out) => {
  const ws = fs.createWriteStream(out)

  return new Promise((resolve, reject) => {
    const archive = archiver('zip')
    archive.on('error', reject)
    archive.on('end', resolve)
    archive.pipe(ws)
    archive.directory(dir, false)
    archive.finalize()
  })
}

module.exports.decompress = (zipPath) => {
  const chromePath = path.join(path.dirname(zipPath), 'chrome')
  if (!fs.existsSync(chromePath)) {
    fs.mkdirSync(chromePath)
  }

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, {lazyEntries: true}, (err, zipfile) => {
      if (err) {
        return reject(err)
      }

      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          if (!fs.existsSync(path.join(chromePath, entry.fileName))) {
            fs.mkdirSync(path.join(chromePath, entry.fileName))
          }
          zipfile.readEntry()
        } else {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              return reject(err)
            }
            readStream.on('end', () => {
              fs.chmodSync(path.join(chromePath, entry.fileName), 0o777)
              zipfile.readEntry()
            })
            readStream.pipe(fs.createWriteStream(path.join(chromePath, entry.fileName)))
          })
        }
      })

      zipfile.on('end', resolve)
    })
  })
}
