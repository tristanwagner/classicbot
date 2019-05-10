# ClassicBot 

## Demo

You can find a demo bot [here](https://discordapp.com/oauth2/authorize?&client_id=575100311992139806&scope=bot)

## Install

You will need NodeJS and NPM in order to run this bot on your machine

Clone repo

`
git clone https://github.com/tristanwagner/classicbot && cd classicbot/
`

Load dependencies

`
npm install
`

Start bot

`
TOKEN=<your token here> npm start
`

You can also edit the npm start command to automatically use your token

```
vim package.json

- "start": "node index.js",

+ "start": "TOKEN=<your token here> node index.js",

npm start
```
or create a .env file that contains your token

`
echo 'TOKEN=<your token here>' > .env
`

## Commands

Search for a quest

```
!q <name>

!fq <name>

!findquest <name>
```

Search for an item

```
!i <name>

!fi <name>

!finditem <name>
```

Search for an NPC 

```
!fn <name>

!n <name>

!findnpc <name>
```
