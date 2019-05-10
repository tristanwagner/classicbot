# ClassicBot 

## Demo

You can find a demo bot [here](https://discordapp.com/oauth2/authorize?&client_id=575100311992139806&scope=bot)

## Install

You will need NodeJS and NPM in order to run this bot on your machine.

#####Clone repo

`
git clone https://github.com/tristanwagner/classicbot && cd classicbot/
`

#####Load dependencies

`
npm install
`

#####Configure bot

create a .env file that contains your token

`
echo 'TOKEN=<your token here>' > .env
`

#####Start bot

`
npm start
`

## Commands

Search for a quest

```
!q <name>

!fq <name>

!findquest <name>

!q the den
```

Search for an item

```
!i <name>

!fi <name>

!finditem <name>

!i thunderfury
```

Search for an NPC 

```
!n <name>

!fn <name>

!findnpc <name>

!n thrall
```

Search for a dungeon with related quests: 

```
!d <name>

!d sm
```

