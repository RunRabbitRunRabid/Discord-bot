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
    .setDescription('View all NPC characters in this server'),

  async execute(interaction) {
    const guildId = interaction.guildId;

    const npcs = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND is_npc = 1 ORDER BY xp DESC'
    ).all(guildId);

    if (!npcs.length) {
      return interaction.reply({ content: '🤖 No NPCs have been created in this server yet. Admins can use `/npc-create` to add one.' });
    }

    const embed = new EmbedBuilder()
      .setTitle('🤖 NPC Roster')
      .setColor(0x7289da)
      .setFooter({ text: `${npcs.length} NPC(s) • Hero School Academy` });

    for (const npc of npcs) {
      const qualityLabel = QUALITY_LABELS[npc.student_quality] ?? '❓ Unknown';

      const lines = [
        `**XP:** ${npc.xp} · **Money:** $${Number(npc.money).toFixed(2)}`,
        `**Proficiencies:** ${npc.subject1}, ${npc.subject2}`,
        `**After-School:** ${npc.afterschool === 'club' ? '🌸 Club' : '🌸 Work'}`,
        `**Student Quality:** ${qualityLabel}`,
        `*Auto-rolls all 4 activities daily at 6 AM ET*`,
      ];

      embed.addFields({
        name: `🤖 ${npc.name}`,
        value: lines.join('\n'),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
