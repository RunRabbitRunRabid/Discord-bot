const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

const QUALITY_LABELS = {
  good:   '🟢 Good',
  medium: '🟡 Medium',
  bad:    '🔴 Bad',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('npc-list')
    .setDescription('Show all NPC students in this server and their stats'),

  async execute(interaction) {
    const guildId = interaction.guildId;

    const npcs = db.prepare(
      'SELECT name, subject1, subject2, afterschool, money, xp, student_quality FROM characters ' +
      'WHERE guild_id = ? AND is_npc = 1 ORDER BY xp DESC'
    ).all(guildId);

    if (!npcs.length) {
      return interaction.reply({
        content: '🤖 No NPCs have been registered in this server yet. An admin can add one with `/npc-create`.',
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🤖 NPC Students')
      .setColor(0x7289da)
      .setFooter({ text: `${npcs.length} NPC(s) • Hero School Academy` });

    for (const npc of npcs) {
      const qualityLabel = QUALITY_LABELS[npc.student_quality] ?? npc.student_quality;
      embed.addFields({
        name: `🤖 ${npc.name}`,
        value: [
          `**XP:** ${npc.xp} · **Money:** $${Number(npc.money).toFixed(2)}`,
          `**Proficiencies:** ${npc.subject1}, ${npc.subject2}`,
          `**After-School:** ${npc.afterschool === 'club' ? '🌸 Club' : '🌸 Work'}`,
          `**Student Quality:** ${qualityLabel}`,
        ].join('\n'),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
