require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const token    = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('ERROR: Set DISCORD_TOKEN and CLIENT_ID in your .env file first.');
  process.exit(1);
}

const guildMode = process.argv.includes('--guild');
const guildId   = process.argv[process.argv.indexOf('--guild') + 1];

if (guildMode && !guildId) {
  console.error('Usage: node src/deploy.js --guild YOUR_SERVER_ID');
  console.error('');
  console.error('To get your server ID:');
  console.error('  1. Open Discord Settings → Advanced → enable Developer Mode');
  console.error('  2. Right-click your server icon → Copy Server ID');
  process.exit(1);
}

const commands      = [];
const commandsPath  = path.join(__dirname, 'commands');
const commandFiles  = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd && cmd.data) {
    commands.push(cmd.data.toJSON());
    console.log(`  Loaded: /${cmd.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    if (guildMode) {
      console.log(`\nRegistering ${commands.length} commands to guild ${guildId} (instant)...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      const result = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`Done! ${result.length} commands registered instantly to your server.`);
      console.log('\nRefresh Discord — /create should now be available with subject1 and subject2 dropdowns.');
    } else {
      console.log(`\nRegistering ${commands.length} commands globally (up to 1 hour to appear)...`);
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      const result = await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`Done! ${result.length} global commands registered.`);
      console.log('\nNote: global commands take up to 1 hour to appear. For instant updates use: npm run deploy:guild YOUR_SERVER_ID');
    }
  } catch (err) {
    console.error('\nDeploy failed:', err.message);
    if (err.message.includes('401')) console.error('Your DISCORD_TOKEN is invalid. Check your .env file.');
    if (err.message.includes('404')) console.error('CLIENT_ID not found. Check your .env file.');
  }
})();
