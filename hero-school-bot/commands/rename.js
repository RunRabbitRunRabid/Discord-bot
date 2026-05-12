const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename one of your characters')
    .addStringOption(opt =>
      opt.setName('character').setDescription('Current character name').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('newname').setDescription('New character name').setRequired(true)
    ),

  async execute(interaction) {
    const charName = interaction.options.getString('character').trim();
    const newName = interaction.options.getString('newname').trim();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (newName.length < 2 || newName.length > 32) {
      return interaction.reply({ content: '🌸 New name must be between 2 and 32 characters.' });
    }

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
    ).get(guildId, charName);

    if (!character) {
      return interaction.reply({ content: `🌸 No character named **${charName}** found.` });
    }
    if (character.user_id !== userId) {
      return interaction.reply({ content: `🌸 **${charName}** doesn't belong to you.` });
    }

    const taken = db.prepare('SELECT id FROM characters WHERE guild_id = ? AND name = ?').get(guildId, newName);
    if (taken) {
      return interaction.reply({ content: `🌸 A character named **${newName}** already exists in this server.` });
    }

    db.prepare('UPDATE characters SET name = ? WHERE id = ?').run(newName, character.id);
    await interaction.reply({ content: `🌸 **${charName}** has been renamed to **${newName}**.` });
  },
};
