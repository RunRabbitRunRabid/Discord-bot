const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, renameCharacter } = require('../database');

const PINK = 0xFFB7C5;

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`🌸 ${title}`)
    .setColor(PINK)
    .setDescription(description)
    .setFooter({ text: 'Hero Academy · If this keeps happening, contact a server admin.' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Give one of your characters a new name')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Current character name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName('new_name')
        .setDescription('New name (spaces and long names are allowed)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const oldName = interaction.options.getString('character').trim();
    const newName = interaction.options.getString('new_name').trim();

    if (oldName.toLowerCase() === newName.toLowerCase()) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Same Name Entered',
          `The new name **${newName}** is the same as the current name.\n\n` +
          `**Try:** Enter a different name in the \`new_name\` field.`
        )],
        ephemeral: true,
      });
    }

    let char;
    try {
      char = getCharacter(guildId, userId, oldName);
    } catch (err) {
      console.error('[/rename]', err);
      return interaction.reply({
        embeds: [errorEmbed(
          'Database Error',
          `Something went wrong while looking up **${oldName}**.\n\n` +
          `**Try:** Run the command again in a moment.`
        )],
        ephemeral: true,
      });
    }

    if (!char) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Not Found',
          `No character named **${oldName}** was found under your account in this server.\n\n` +
          `**Try:**\n` +
          `— Check the spelling in the \`character\` field (names are exact)\n` +
          `— Use \`/list\` to see your characters and copy the exact name`
        )],
        ephemeral: true,
      });
    }

    const existing = getCharacter(guildId, userId, newName);
    if (existing) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Name Already Taken',
          `You already have a character named **${newName}** in this server.\n\n` +
          `**Try:** Choose a different new name, or use \`/list\` to see all your existing character names.`
        )],
        ephemeral: true,
      });
    }

    try {
      renameCharacter(guildId, userId, oldName, newName);

      const embed = new EmbedBuilder()
        .setTitle('🌸 Character Renamed')
        .setColor(PINK)
        .setDescription(`**${oldName}** is now known as **${newName}**.`)
        .setFooter({ text: 'Hero Academy' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[/rename]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Rename Failed',
          `The rename from **${oldName}** to **${newName}** could not be completed.\n\n` +
          `**What may have happened:** A database error occurred, or the name was taken by the time the request went through.\n\n` +
          `**Try:** Run \`/rename\` again. Use \`/list\` to confirm what names are already in use.`
        )],
        ephemeral: true,
      });
    }
  },
};
