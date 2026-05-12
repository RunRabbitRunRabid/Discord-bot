require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { getUserCharacters } = require('./database');
const fs = require('fs');
const path = require('path');
const { startScheduler } = require('./scheduler');

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is not set. Please add it to your .env file.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command && command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`[Commands] Loaded /${command.data.name}`);
  }
}

client.once('ready', () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);
  startScheduler(client);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'character') {
      const characters = getUserCharacters(interaction.guildId, interaction.user.id);
      const input = focused.value.toLowerCase();
      const choices = characters
        .filter(c => c.name.toLowerCase().includes(input))
        .slice(0, 25)
        .map(c => ({ name: c.name, value: c.name }));
      return interaction.respond(choices).catch(() => {});
    }
    return interaction.respond([]).catch(() => {});
  }

  if (!interaction.isChatInputCommand()) return;

  if (!interaction.guildId) {
    return interaction.reply({
      content: '❌ This bot only works inside a server, not in DMs.',
      ephemeral: true,
    });
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Error] Command /${interaction.commandName} failed:`, err);
    const errorMsg = '❌ An error occurred while running this command. Please try again.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMsg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
  }
});

client.on('error', (err) => {
  console.error('[Client Error]', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Promise Rejection]', err);
});

client.login(token).catch(err => {
  console.error('[Login Failed]', err.message);
  process.exit(1);
});
