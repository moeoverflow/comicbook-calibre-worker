const path = require('path')
const fs = require('fs')
const schedule = require('node-schedule')
const shell = require('shelljs')
const mongoose = require('mongoose')
const config = require('./config')

const { libraryPath, nhentaiDir, ehentaiDir, wnacgDir, mongodbUrl } = config

mongoose.Promise = global.Promise
mongoose.connect(mongodbUrl, { useNewUrlParser: true })
let sqlite

const ComicbookCalibre = mongoose.model('ComicbookCalibre', {
  storeInCalibre: Boolean,
  domain: String,
  id: String,
  filepath: String
})

const add_calibre_library = async (libraryPath, addDir) => {
  if (!fs.existsSync(addDir)) return

  const files = fs.readdirSync(addDir)
  for (const file of files) {
    const filepath = path.join(addDir, file)
    const stat = fs.lstatSync(filepath)
    if (!stat.isFile()) continue
    if (!file.includes('.epub')) continue

    const { stdout } = shell.exec(`calibredb add --with-library=${libraryPath} ${filepath}`)

    const found = stdout.match(/id[s]?\: (\d+)/)
    if (!found) continue

    const bookId = found[1]
    if (!sqlite) sqlite = require('better-sqlite3')(path.join(libraryPath, 'metadata.db'))
    const row = sqlite.prepare('select B.path, D.name from books B left join data D on (B.id = D.id) where B.id = ?').get(bookId)
    if (!row) continue

    const calibreBookPath = path.join(row.path, `${row.name}.epub`)
    const splited = file.replace('.epub', '').split('@')
    const [domain, id] = splited

    const cc = await ComicbookCalibre.findOne({
      domain, id,
    })
    await cc.updateOne({
      $set: {
        storeInCalibre: true,
        filepath: calibreBookPath,
      }
    })

    shell.rm(filepath)
  }
}

add_calibre_library(libraryPath, nhentaiDir)

schedule.scheduleJob('* * * * *', async () => {
  await add_calibre_library(libraryPath, nhentaiDir)
  await add_calibre_library(libraryPath, ehentaiDir)
  await add_calibre_library(libraryPath, wnacgDir)
})
