# 🌸 Hero School Discord Bot

bing bong, hero school bot
---

## Features

- **Character system** — Multiple characters per user, per server
- **Daily class schedule** — Based on US Eastern Time (Ohio time)
- **4 daily activities** — `/class`, `/study`, `/train`, `/afterschool` (each with independent cooldowns)
- **Proficiency bonuses** — +5 XP when attending a class your character is proficient in
- **Live leaderboards** — Auto-updated XP and Wealth rankings in a dedicated channel
- **Full CRUD** — Create, list, rename, delete characters
- **Economy** — Spend and receive money with validation
- **All responses visible** — No hidden/ephemeral messages
- **Crash-proof** — Global error handlers prevent bot downtime
- **Guild-isolated** — All data is server-specific

---

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord bot application ([Discord Developer Portal](https://discord.com/developers/applications))

### 2. Clone & Install

```bash
git clone https://github.com/yourname/hero-school-bot.git
cd hero-school-bot
npm install
```

### 3. Configure Environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
```

- `DISCORD_TOKEN` — Found in your bot's settings on the Discord Developer Portal
- `CLIENT_ID` — Your application's ID (top of the General Information page)

### 4. Set Bot Permissions

In the Discord Developer Portal, under **Bot**:
- Enable **Message Content Intent** (not strictly required but good practice)
- Enable **Server Members Intent** (optional)

When inviting the bot to your server, include at minimum:
- `applications.commands`
- `bot` with permissions: Send Messages, Embed Links, Read Message History

OAuth2 invite URL scopes: `bot` + `applications.commands`

### 5. Deploy Slash Commands

```bash
npm run deploy
```

> Global commands take up to 1 hour to propagate. For instant testing in a single server, edit `deploy-commands.js` and swap `Routes.applicationCommands` for `Routes.applicationGuildCommands(clientId, 'YOUR_GUILD_ID')`.

### 6. Start the Bot

```bash
npm start
```

---

## Commands

| Command | Description | Who Can Use |
|---|---|---|
| `/create [name] [afterschool] [startingmoney]` | Create a new character (dropdowns for proficiency selection) | Anyone |
| `/class [character]` | Attend today's class — earn 5–20 XP (+5 bonus if proficient) | Character owner |
| `/study [character]` | Study session — earn 5–20 XP | Character owner |
| `/train [character]` | Training session — earn 5–20 XP | Character owner |
| `/afterschool [character]` | After-school activity — earn XP + money | Character owner |
| `/list [user?]` | List all characters with XP, money, proficiencies, and today's cooldown status | Anyone |
| `/rename [character] [newname]` | Rename a character | Character owner |
| `/delete [character]` | Permanently delete a character (confirmation required) | Character owner |
| `/spend [character] [amount]` | Subtract money from a character with balance validation | Character owner |
| `/donate [character] [amount]` | Add money to any character | Manage Messages permission |
| `/leaderboard [channel]` | Set the live leaderboard channel | Manage Channels permission |

---

## Daily Schedule (US Eastern Time)

| Day | Class |
|---|---|
| Monday | General Studies |
| Tuesday | Training |
| Wednesday | Search and Rescue |
| Thursday | Front Line |
| Friday | Support |
| Saturday | Power Control |
| Sunday | Field Training |

Cooldowns reset at **midnight Eastern Time** automatically.

---

## Available Proficiency Classes

- General Studies
- Training
- Search and Rescue
- Front Line
- Support
- Power Control
- Field Training

---

## Deployment (Railway / Render)

1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app/) or [Render](https://render.com/)
3. Connect your GitHub repository
4. Set environment variables:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
5. Set start command: `node index.js`
6. The `data/` folder (SQLite database) is created automatically at runtime

> **Note:** On Railway/Render free tiers, the filesystem may be ephemeral. For persistent SQLite storage on Railway, use a Volume. On Render, attach a Persistent Disk to your service.

---

## Project Structure

```
hero-school-bot/
├── index.js              # Bot entry point — loads commands, events, handles errors
├── deploy-commands.js    # Registers slash commands with Discord
├── package.json
├── .env.example          # Environment variable template
├── database/
│   └── db.js             # SQLite setup and schema (better-sqlite3)
├── commands/
│   ├── create.js         # /create — character creation with dropdown UI
│   ├── class.js          # /class — daily class attendance
│   ├── study.js          # /study — study session
│   ├── train.js          # /train — training session
│   ├── afterschool.js    # /afterschool — club or work activity
│   ├── list.js           # /list — view all characters
│   ├── leaderboard.js    # /leaderboard — set live leaderboard channel
│   ├── rename.js         # /rename — rename a character
│   ├── delete.js         # /delete — delete a character (with confirmation)
│   ├── spend.js          # /spend — subtract money from character
│   └── donate.js         # /donate — add money to character (mod only)
├── events/
│   ├── ready.js          # On bot ready — starts cron jobs, updates leaderboards
│   └── interactionCreate.js  # Routes slash command interactions to handlers
└── utils/
    ├── time.js           # Eastern Time helpers and daily schedule
    └── leaderboard.js    # Leaderboard embed builder and update logic
```

---

## License

MIT — free to use, modify, and deploy.
