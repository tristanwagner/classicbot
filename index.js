require('dotenv').config()
const { Client } = require('discord.js')
const client = new Client()
const csv = require('fast-csv')
const fs = require('fs')
const fuzz = require('fuzzball')
const webshot = require('webshot-node')

// specific to classicdb.ch
const wsOptions = {
  // max-width: min-content; doesn't work for some reasons
  customCSS: `.tooltip {
    visibility: visible !important;
    max-width: 350px;
  }`,
  captureSelector: '.tooltip',
}

const cachePath = './cache/'

const classicdb = 'https://classicdb.ch/'

let dbpath = process.env.DB || classicdb

const npc = {
  type: 'npc',
  commands: ['!findnpc', '!fn', '!n'],
  id: 'entry',
  name: 'name',
  fp: './data/npcs.csv',
  db: dbpath.concat('?npc='),
  data: []
}

const item = {
  type: 'item',
  commands: ['!finditem', '!fi', '!i'],
  id: 'entry',
  name: 'name',
  fp: './data/items.csv',
  db: dbpath.concat('?item='),
  data: []
}

const quest = {
  type: 'quest',
  commands: ['!findquest', '!fq', '!q'],
  id: 'entry',
  name: 'Title',
  fp: './data/quests.csv',
  db: dbpath.concat('?quest='),
  data: []
}

const dungeon = {
  type: 'dungeon',
  commands: ['!finddungeon', '!fd', '!d'],
  id: 'id',
  name: 'name',
  fp: './data/dungeons.csv',
  db: dbpath.concat('?zone='),
  dbq: dbpath.concat('?quests=2.'),
  data: []
}

const entities = [npc, item, quest, dungeon]

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('error', error => {
  console.log('Discord api client error', error)
})

//discord users messages entry point
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
    case dungeon.commands.some(command => msg.content.startsWith(command)):
      handleDungeonSearch(query, msg)
      break
    case msg.content.startsWith('!help'):
      handleHelp(msg)
      break
    default:
      break
  }
});

//construct an array of quests that belongs to a quest chain
const populateLinkedQuests = (arr) => {
  const initialLength = arr.length
  for (index in arr) {
    let _quest = arr[index]
    if (_quest.PrevQuestId !== '0') {
      let prevQuest = quest.data.find(q => q[quest.id] === _quest.PrevQuestId)
      if (prevQuest && !arr.includes(prevQuest)) {
        arr.splice(index, 0, prevQuest)
      }
    }
    if (_quest.NextQuestId !== '0') {
      let nextQuest = quest.data.find(q => q[quest.id] === _quest.NextQuestId)
      if (nextQuest && !arr.includes(nextQuest)) {
        arr.splice(index + 1, 0, nextQuest)
      }
    }
    if (_quest.NextQuestInChain !== '0') {
      let nextQuest = quest.data.find(q => q[quest.id] === _quest.NextQuestInChain)
      if (nextQuest && !arr.includes(nextQuest)) {
        arr.splice(index + 1, 0, nextQuest)
      }
    }
  }
  if (arr.length === initialLength) {
    return arr
  } else {
    return populateLinkedQuests(arr)
  }
}

const handleQuestSearch = (query, msg) => {
  let matches = findMatch(query, quest)
  let groupedMatches = populateLinkedQuests([matches[0]])
  let foundQuest = groupedMatches.find(q => q[quest.name] === matches[0][quest.name])
  msg.reply({
    embed: {
      color: 3447003,
      title: foundQuest[quest.name],
      url: quest.db.concat(foundQuest[quest.id]), //link is the first quest in chain with found name
      description: `Found ${groupedMatches.length} quest${groupedMatches.length > 1 ? `s parts for ${foundQuest[quest.name]}` : ''} :\n`,
      fields: groupedMatches.map((match, index) => {
        return {
          name: `${index + 1}. ${match[quest.name]}`,
          value: `Min level [${match.MinLevel}]\n${match.Objectives}\n${quest.db.concat(match[quest.id])}`
        }
      }),
      timestamp: new Date(),
      footer: {
        icon_url: client.user.avatarURL,
        text: 'Quest Search'
      }
    }
  })
}

const handleDungeonSearch = (query, msg) => {
  // if query is less than 4 chars its probably an abreviation..
  let matches = query.length < 4 ? findMatch(query, dungeon, choice => choice.surname) : findMatch(query, dungeon)
  let foundDungeon = matches[0]
  let relatedQuests = quest.data.filter(q => q.ZoneOrSort === foundDungeon.id)
  msg.reply({
    embed: {
      color: 3447003,
      title: foundDungeon.name,
      url: dungeon.db.concat(foundDungeon.id),
      description: `Found ${relatedQuests.length} quest${relatedQuests.length > 1 ? `s related to ${foundDungeon.name}` : ''} :\n${dungeon.dbq.concat(foundDungeon.id)}\n`,
      fields: relatedQuests.map((match, index) => {
        return {
          name: `${index + 1}. ${match[quest.name]}`,
          value: `Min level [${match.MinLevel}]\n${quest.db.concat(match[quest.id])}`
        }
      }),
      timestamp: new Date(),
      footer: {
        icon_url: client.user.avatarURL,
        text: 'Dungeon Search'
      }
    }
  })
}

const handleNpcSearch = (query, msg) => {
  let match = findMatch(query, npc)[0]
  msg.reply({
    embed: {
      color: 3447003,
      url: npc.db.concat(match[npc.id]),
      description: npc.db.concat(match[npc.id]),
      title: match[npc.name],
      timestamp: new Date(),
      footer: {
        icon_url: client.user.avatarURL,
        text: 'NPC Search'
      }
    }
  })
}

const handleItemSearch = async (query, msg) => {
  console.log(`Searching items for query : ${query}`)
  let match = findMatch(query, item)[0]
  console.log(`Found name : ${match[item.name]}`)
  let filepath = cachePath.concat(match[item.id], '.png')
  //if snapshot is not in cache
  if (!fs.existsSync(filepath)) {
    await takeSnapshot(match[item.id])
  }
  //TODO: Find a way to edit embed with images, so we can send the link, and then the image when process is done
  msg.reply({
    file: filepath,
    embed: {
      color: 3447003,
      url: item.db.concat(match[item.id]),
      description: item.db.concat(match[item.id]),
      title: match[item.name],
      image: {
        url: 'attachment://'.concat(match[item.id], '.png')
      },
      timestamp: new Date(),
      footer: {
        icon_url: client.user.avatarURL,
        text: 'Item Search'
      }
    }
  })
}

const handleHelp = (msg) => {
  msg.reply('incoming!')
}

const initData = () => {
  console.log('initializing data')
  return Promise.all(
    entities.map(entity => {
      return fetchEntityDataToObject(entity)
    })
  )
}

const fetchEntityDataToObject = ({ fp, data }) => {
  return new Promise((resolve, reject) => {
    let stream = fs.createReadStream(fp)
    let i = 0
    let keys = []

    csv
      .parseStream(stream, {})
      .on('data', _data => {
        if (i === 0) {
          keys = _data
        } else {
          let obj = {}
          keys.map((key, i) => {
            obj[key] = _data[i]
          })
          data.push(obj)
        }
        i++
      })
      .on('end', () => {
        resolve()
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

const findMatch = (str, entity, processor) => {
  let matches = fuzz.extract(str, entity.data, { limit: 15, scorer: fuzz.WRatio, processor: processor ? processor : choice => choice[entity.name] })
  //from [[{ choice }, score]] to [{ choice, score }]
  return matches.reduce((acc, curr, index) => {
    if (index === 0) acc = []
    curr[0].scoring = curr[1]
    acc.push(curr[0])
    return acc
  }, [])
}

//take item's tooltip snapshot and save it to cache folder
const takeSnapshot = (id) => {
  console.log('Taking snapshot for item id:', id, 'in url', item.db.concat(id))
  return new Promise((resolve, reject) => {
    webshot(item.db.concat(id), cachePath.concat(id, '.png'), wsOptions, (err) => {
      if (err) {
        console.log('Error while taking snapshot for item id', id, err)
        reject(err)
      }
      resolve()
    })
  })
}

const run = () => {
  initData()
    .then(() => {
      return client.login(process.env.TOKEN)
    })
    .catch(error => {
      console.log(error)
      run()
    })
}

//pull the trigger
run()
