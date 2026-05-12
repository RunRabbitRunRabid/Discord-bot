const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PINK } = require('../constants');
const { getUserChars, isOnCooldown } = require('../database');
const { formatMoney } = require('../utils/random');
const { errorEmbed } = require('../utils/embed');

const ACTIONS = ['class', 'study', 'train', 'afterschool'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('View all your characters, stats, and daily activity status'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    let chars;
    try {
      chars = getUserChars(guildId, userId);
    } catch (err) {
      console.error('[/list]', err);
      return interaction.reply({
        embeds: [errorEmbed(
          'Could Not Load Characters',
          `There was a problem reading your characters from the database.\n\n` +
          `**Try:** Run \`/list\` again in a moment.`
        )],
        ephemeral: true,
      });
    }

    if (!chars.length) {
      return interaction.reply({
        embeds: [errorEmbed(
          'No Characters Found',
          `You have no characters enrolled in this server yet.\n\n` +
          `**Try:** Use \`/create\` to enroll your first character. ` +
          `Characters are server-specific and won't carry over from other servers.`
        )],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🌸 ${interaction.user.displayName}'s Roster`)
      .setColor(PINK)
      .setDescription(`**${chars.length}** character(s) enrolled in this server.`)
      .setFooter({ text: 'Hero Academy · 🌸 = used today  ·  · = still available' })
      .setTimestamp();

    for (const char of chars) {
      const status = ACTIONS.map(a => {
        const done = isOnCooldown(guildId, char.id, a);
        return `${done ? '🌸' : '·'} /${a}`;
      }).join('   ');

      embed.addFields({
        name: `🌸  ${char.name}`,
        value: [
          `> **XP:** ${char.xp}   **|**   **Funds:** ${formatMoney(char.money)}`,
          `> **Subject 1:** ${char.prof1}   **·**   **Subject 2:** ${char.prof2}`,
          `> **After-school:** ${char.activity === 'work' ? 'Part-time Work' : 'Club'}`,
          `> **Today:** ${status}`,
        ].join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
