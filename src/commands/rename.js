const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PINK } = require('../constants');
const { getChar, renameChar } = require('../database');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Give one of your characters a new name')
    .addStringOption(o => o
      .setName('character')
      .setDescription('Current character name')
      .setRequired(true)
    )
    .addStringOption(o => o
      .setName('new_name')
      .setDescription('New name (spaces allowed, up to 100 characters)')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(100)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;
    const oldName = interaction.options.getString('character').trim();
    const newName = interaction.options.getString('new_name').trim();

    if (oldName.toLowerCase() === newName.toLowerCase()) {
      return interaction.reply({
        embeds: [errorEmbed('Same Name', `The new name is the same as the current one.\n\n**Try:** Enter a different name in the \`new_name\` field.`)],
        ephemeral: true,
      });
    }

    let char;
    try { char = getChar(guildId, userId, oldName); }
    catch (err) {
      console.error('[/rename]', err);
      return interaction.reply({ embeds: [errorEmbed('Database Error', `Could not look up **${oldName}**. Try again in a moment.`)], ephemeral: true });
    }

    if (!char) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Not Found',
          `No character named **${oldName}** was found on your account in this server.\n\n` +
          `**Try:**\n— Check the spelling in the \`character\` field\n— Use \`/list\` to copy the exact name`
        )],
        ephemeral: true,
      });
    }

    const conflict = getChar(guildId, userId, newName);
    if (conflict) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Name Already Taken',
          `You already have a character named **${newName}**.\n\n` +
          `**Try:** Choose a different new name, or use \`/list\` to see all your existing names.`
        )],
        ephemeral: true,
      });
    }

    try {
      renameChar(guildId, userId, oldName, newName);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 Character Renamed')
            .setColor(PINK)
            .setDescription(`**${oldName}** is now known as **${newName}**.`)
            .setFooter({ text: 'Hero Academy' })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/rename]', err);
      await interaction.reply({
        embeds: [errorEmbed('Rename Failed', `Could not rename **${oldName}** to **${newName}**.\n\n**Try:** Run \`/rename\` again.`)],
        ephemeral: true,
      });
    }
  },
};
