require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.argv[2];

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

if (!guildId) {
  console.error('Usage: node src/deploy-guild.js YOUR_SERVER_ID');
  console.error('');
  console.error('To get your server ID:');
  console.error('  1. Open Discord Settings → Advanced → turn on Developer Mode');
  console.error('  2. Right-click your server icon → Copy Server ID');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command && command.data) {
    commands.push(command.data.toJSON());
    console.log(`Loaded command: /${command.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Step 1: Wiping all guild commands for server ${guildId}...`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log('Guild commands cleared.');

    console.log(`Step 2: Registering ${commands.length} fresh guild commands...`);
    const result = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log(`Done! Registered ${result.length} commands instantly.`);
    console.log('');
    console.log('Guild commands update immediately — refresh Discord and try /register.');
  } catch (err) {
    console.error('Failed:', err);
  }
})();
