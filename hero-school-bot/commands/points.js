const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check the QuickTime points for a character')
    .addStringOption(opt =>
      opt
        .setName('character')
        .setDescription('The character\'s name')
        .setRequired(true)
    ),

  async execute(interaction) {
    const charName = interaction.options.getString('character').trim();
    const guildId = interaction.guildId;

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ? AND is_npc = 0'
    ).get(guildId, charName);

    if (!character) {
      return interaction.reply({
        content: `🌸 No character named **${charName}** found in this server.`,
        ephemeral: true,
      });
    }

    const pointRow = db.prepare(
      'SELECT points FROM quicktime_points WHERE guild_id = ? AND character_id = ?'
    ).get(guildId, character.id);

    const points = pointRow?.points ?? 0;

    // Count events participated in
    const eventCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM quicktime_participants WHERE character_id = ?'
    ).get(character.id).cnt;

    const embed = new EmbedBuilder()
      .setTitle(`⚡ QuickTime Points — ${charName}`)
      .setColor(0xffd700)
      .addFields(
        { name: '🏅 Total Points', value: `${points} pts`, inline: true },
        { name: '📋 Events Completed', value: `${eventCount}`, inline: true },
      )
      .setFooter({ text: 'Hero School Academy' });

    await interaction.reply({ embeds: [embed] });
  },
};
