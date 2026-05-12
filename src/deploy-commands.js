require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in .env');
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
    console.log('Step 1: Wiping all existing global commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('All global commands cleared.');

    console.log(`Step 2: Registering ${commands.length} fresh commands...`);
    const result = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log(`Done! Registered ${result.length} commands.`);
    console.log('');
    console.log('NOTE: Global commands can take up to 1 hour to appear.');
    console.log('To see changes instantly, use the guild deploy script instead:');
    console.log('  node src/deploy-guild.js YOUR_SERVER_ID');
  } catch (err) {
    console.error('Failed:', err);
  }
})();
