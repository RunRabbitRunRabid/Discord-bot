require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('[Fatal] Missing DISCORD_TOKEN or CLIENT_ID in .env file.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
    console.log(`[Deploy] Queued /${command.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`[Deploy] Registering ${commands.length} global slash commands...`);
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log(`[Deploy] Successfully registered ${data.length} application commands globally.`);
    console.log('[Deploy] Note: Global commands may take up to 1 hour to appear in Discord.');
    console.log('[Deploy] For instant registration in a specific server, use Routes.applicationGuildCommands(clientId, guildId) instead.');
  } catch (err) {
    console.error('[Deploy] Error registering commands:', err);
  }
})();
