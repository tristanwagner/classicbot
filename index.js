const { Client, Attachment } = require('discord.js')
const client = new Client()
const csv = require('fast-csv')
const fs = require('fs')
const fuzz = require('fuzzball')
const webshot = require('webshot')

const cachePath = './cache/'

const npc = {
  commands: ['!findnpc', '!fn', '!n'],
  fp: './data/npcs.csv',
  headers: ['entry', 'name'],
  db: 'https://classicdb.ch/?npc=',
  index: {}
}

const item = {
  commands: ['!finditem', '!fi', '!i'],
  fp: './data/items.csv',
  headers: ['entry', 'name'],
  db: 'https://classicdb.ch/?item=',
  index: {}
}

const quest = {
  commands: ['!findquest', '!fq', '!q'],
  fp: './data/quests.csv',
  headers: ['entry', 'Title'],
  db: 'https://classicdb.ch/?quest=',
  index: {}
}

const entities = [npc, item, quest]

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
  let query = msg.content.split(' ').slice(1).join(' ')
  switch (true) {
    case quest.commands.some(command => msg.content.startsWith(command)):
      handleQuestSearch(query, msg)
      break
    case npc.commands.some(command => msg.content.startsWith(command)):
      handleNpcSearch(query, msg)
      break
    case item.commands.some(command => msg.content.startsWith(command)):
      await handleItemSearch(query, msg)
      break
    default:
      break
  }
});

const handleQuestSearch = (query, msg) => {
  let match = findMatch(query, quest.index)
  msg.reply(`Found quest ${quest.index[match]}\n ${quest.db.concat(match)}`)
}

const handleNpcSearch = (query, msg) => {
  let match = findMatch(query, npc.index)
  msg.reply(`Found npc ${npc.index[match]}\n ${npc.db.concat(match)}`)
}

const handleItemSearch = async (query, msg) => {
  console.log(`Searching quests for query : ${query}`)
  let match = findMatch(query, item.index)
  console.log(`Found name : ${item.index[match]}`)
  msg.reply(`Found item ${item.index[match]}\n ${item.db.concat(match)}`)
  let filepath = cachePath.concat(match, '.png')
  if (!fs.existsSync(filepath)) {
    await takeImage(match)
  }
  msg.reply(`Tooltip of ${item.index[match]}`, new Attachment(filepath))
}

const initData = () => {
  console.log('initializing data')
  return Promise.all(
    entities.map(entity => {
      return fetchEntityData(entity)
    })
  )
}
const fetchEntityData = ({ headers, fp, index }) => {
  let stream = fs.createReadStream(fp)
  return new Promise((resolve, reject) => {
    let i = 0
    let keys = []
    csv
      .fromStream(stream, {})
      .on('data', data => {
        if (i === 0) {
          keys = headers.map(header => {
            return data.indexOf(header)
          })
        } else {
          if(isNaN(parseInt(data[keys[1]]))){
            index[data[keys[0]]] = data[keys[1]]
          }
        }
        i++
      })
      .on('end', () => {
        resolve()
      })
  })
}

const findMatch = (str, data) => {
  let matches = fuzz.extract(str, data, { scorer: fuzz.WRatio })
  return matches[0][2]
}

const takeImage = (id) => {
  console.log('Taking image for item id:', id, 'in url', item.db.concat(id))
  return new Promise((resolve, reject) => {
    webshot(item.db.concat(id), cachePath.concat(id, '.png'), { captureSelector: '.tooltip' }, (err) => {
      if (err) {
        console.log('Error while taking image for item id', id, err)
        reject(err)
      }
      resolve()
    })
  })
}

initData()
  .then(() => {
    client.login('NTc1MTAwMzExOTkyMTM5ODA2.XNDD5w.QNx4SNd3aLfusx4AWCUrNrWCHWQ');
  })
