require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startScheduler } = require('./scheduler');
const { getUserCharacters } = require('./database');

const PINK = 0xFFB7C5;

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
      try {
        const characters = getUserCharacters(interaction.guildId, interaction.user.id);
        const query = focused.value.toLowerCase();
        const choices = characters
          .filter(c => c.name.toLowerCase().includes(query))
          .slice(0, 25)
          .map(c => ({ name: c.name, value: c.name }));
        await interaction.respond(choices);
      } catch (err) {
        console.error('[Autocomplete] character lookup failed:', err);
        await interaction.respond([]).catch(() => {});
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (!interaction.guildId) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌸 Server Only')
          .setColor(PINK)
          .setDescription(
            'This bot only works inside a Discord server, not in DMs.\n\n' +
            '**Try:** Open the server where the bot is installed and run commands there.'
          ),
      ],
      ephemeral: true,
    });
  }

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌸 Unknown Command')
          .setColor(PINK)
          .setDescription(
            `The command \`/${interaction.commandName}\` was not recognised.\n\n` +
            `**Try:** Use \`/help\` to see the full list of available commands. ` +
            `If you just added the bot, commands may take up to 1 hour to appear globally.`
          ),
      ],
      ephemeral: true,
    });
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Error] Command /${interaction.commandName} threw an unhandled exception:`, err);

    const errorEmbed = new EmbedBuilder()
      .setTitle('🌸 Unexpected Error')
      .setColor(PINK)
      .setDescription(
        `Something went wrong while running \`/${interaction.commandName}\`.\n\n` +
        `**What happened:** An unhandled error occurred on the bot's side — this is not something you did wrong.\n\n` +
        `**Try:**\n` +
        `— Wait a moment and run the command again\n` +
        `— If the problem repeats, contact a server admin\n` +
        `— Use \`/help\` to double-check command usage`
      )
      .setFooter({ text: 'Hero Academy · The error has been logged.' });

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
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
  console.error('Check that your DISCORD_TOKEN in .env is correct and the bot has not been reset.');
  process.exit(1);
});
