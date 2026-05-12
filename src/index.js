require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { startScheduler } = require('./scheduler');
const { PINK } = require('./constants');

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('ERROR: DISCORD_TOKEN is not set in .env');
  process.exit(1);
}

const client      = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands   = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd && cmd.data && cmd.execute) {
    client.commands.set(cmd.data.name, cmd);
    console.log(`[Commands] Loaded /${cmd.data.name}`);
  }
}

client.once('ready', () => {
  console.log(`[Bot] Online as ${client.user.tag} — serving ${client.guilds.cache.size} server(s)`);
  startScheduler(client);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.guildId) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle('🌸 Server Only').setColor(PINK)
          .setDescription('This bot only works inside a Discord server, not in DMs.\n\n**Try:** Open the server where the bot is installed and run commands there.'),
      ],
      ephemeral: true,
    });
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle('🌸 Unknown Command').setColor(PINK)
          .setDescription(
            `The command \`/${interaction.commandName}\` was not recognised.\n\n` +
            `**Try:** Use \`/help\` to see all available commands. If you just ran \`npm run deploy\`, ` +
            `global commands can take up to 1 hour — use \`npm run deploy:guild YOUR_SERVER_ID\` for instant updates.`
          ),
      ],
      ephemeral: true,
    });
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Error] /${interaction.commandName} threw an unhandled exception:`, err);
    const errEmbed = new EmbedBuilder()
      .setTitle('🌸 Unexpected Error')
      .setColor(PINK)
      .setDescription(
        `Something went wrong running \`/${interaction.commandName}\`.\n\n` +
        `**This is not something you did wrong.** The error has been logged.\n\n` +
        `**Try:**\n— Wait a moment and run the command again\n— Use \`/help\` to check command usage\n— Contact a server admin if it keeps happening`
      );

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
    }
  }
});

client.on('error', err => console.error('[Client Error]', err));
process.on('unhandledRejection', err => console.error('[Unhandled Rejection]', err));

client.login(token).catch(err => {
  console.error('[Login Failed]', err.message);
  console.error('Check that DISCORD_TOKEN in your .env is correct and the bot has not been reset.');
  process.exit(1);
});
