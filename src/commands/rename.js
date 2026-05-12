const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, renameCharacter } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename one of your characters')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Current character name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName('new_name')
        .setDescription('New name for the character')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(32)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const oldName = interaction.options.getString('character').trim();
    const newName = interaction.options.getString('new_name').trim();

    if (oldName.toLowerCase() === newName.toLowerCase()) {
      return interaction.reply({
        content: '❌ The new name must be different from the current name.',
        ephemeral: true,
      });
    }

    const char = getCharacter(guildId, userId, oldName);
    if (!char) {
      return interaction.reply({
        content: `❌ No character named **${oldName}** found. Check your spelling or use \`/list\`.`,
        ephemeral: true,
      });
    }

    const existing = getCharacter(guildId, userId, newName);
    if (existing) {
      return interaction.reply({
        content: `❌ You already have a character named **${newName}**.`,
        ephemeral: true,
      });
    }

    try {
      renameCharacter(guildId, userId, oldName, newName);

      const embed = new EmbedBuilder()
        .setTitle('✏️ Character Renamed')
        .setColor(0x57F287)
        .setDescription(`**${oldName}** has been renamed to **${newName}**.`);

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Failed to rename character. Please try again.',
        ephemeral: true,
      });
    }
  },
};
