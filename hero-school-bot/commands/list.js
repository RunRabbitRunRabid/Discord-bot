const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { getTodayKey, getWeekKey } = require('../utils/time');

const COMMAND_LABELS = {
  class: 'Class',
  study: 'Study',
  train: 'Train',
  afterschool: 'After-School',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List all your characters and their status')
    .addUserOption(opt =>
      opt.setName('user').setDescription('View another user\'s characters (optional)').setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const todayKey = getTodayKey();

    const characters = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND user_id = ? ORDER BY xp DESC'
    ).all(guildId, targetUser.id);

    if (!characters.length) {
      return interaction.reply({ content: `🌸 **${targetUser.username}** has no characters in this server yet.` });
    }

    const weekKey = getWeekKey();

    const embed = new EmbedBuilder()
      .setTitle(`🌸 Characters — ${targetUser.username}`)
      .setColor(0xff9ec8)
      .setFooter({ text: 'Hero School Academy' });

    for (const char of characters) {
      const usedCmds = db.prepare(
        'SELECT command FROM cooldowns WHERE guild_id = ? AND character_id = ? AND used_on = ?'
      ).all(guildId, char.id, todayKey).map(r => r.command);

      const statusLines = Object.entries(COMMAND_LABELS).map(([cmd, label]) => {
        const done = usedCmds.includes(cmd);
        return `${done ? '✅' : '⬜'} ${label}`;
      }).join(' · ');

      // Check if this character received a weekly bonus this week
      const weeklyBonus = db.prepare(
        'SELECT bonus_xp FROM weekly_resets WHERE guild_id = ? AND character_id = ? AND reset_week = ? AND got_bonus = 1'
      ).get(guildId, char.id, weekKey);

      const QUALITY_LABELS = { good: '🟢 Good', medium: '🟡 Medium', bad: '🔴 Bad' };

      const lines = [
        `**XP:** ${char.xp} · **Money:** $${Number(char.money).toFixed(2)}`,
        `**Proficiencies:** ${char.subject1}, ${char.subject2}`,
        `**After-School:** ${char.afterschool === 'club' ? '🌸 Club' : '🌸 Work'}`,
      ];

      if (char.is_npc) {
        const qualityLabel = QUALITY_LABELS[char.student_quality] ?? char.student_quality;
        lines.push(`🤖 **NPC** — Student Quality: ${qualityLabel}`);
      } else {
        lines.push(`**Today:** ${statusLines}`);
      }

      if (weeklyBonus) {
        lines.push(`🏆 **Weekly Bonus:** Top 3 reward — ${weeklyBonus.bonus_xp} XP head start`);
      }

      embed.addFields({
        name: char.is_npc ? `🤖 ${char.name}` : char.name,
        value: lines.join('\n'),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
