require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[Fatal] Missing DISCORD_TOKEN in environment. Copy .env.example to .env and fill in your token.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`[Commands] Loaded /${command.data.name}`);
  } else {
    console.warn(`[Warning] ${file} is missing required "data" or "execute" properties.`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`[Events] Registered event: ${event.name}`);
}

// Global error handlers to prevent crashes
process.on('unhandledRejection', err => {
  console.error('[UnhandledRejection]', err);
});
process.on('uncaughtException', err => {
  console.error('[UncaughtException]', err);
});

client.login(token);

