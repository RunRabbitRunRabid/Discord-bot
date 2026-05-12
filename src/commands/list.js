const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserCharacters, isOnCooldown } = require('../database');
const { formatMoney } = require('../utils/xp');

const PINK = 0xFFB7C5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('View all your characters, stats, and daily activity status'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    let characters;
    try {
      characters = getUserCharacters(guildId, userId);
    } catch (err) {
      console.error('[/list]', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 Could Not Load Characters')
            .setColor(PINK)
            .setDescription(
              `There was a problem reading your characters from the database.\n\n` +
              `**Try:** Run \`/list\` again in a moment. If it keeps failing, contact a server admin.`
            ),
        ],
        ephemeral: true,
      });
    }

    if (!characters.length) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 No Characters Found')
            .setColor(PINK)
            .setDescription(
              `You don't have any characters enrolled in this server yet.\n\n` +
              `**Try:** Use \`/register\` to create your first character. ` +
              `If you have characters in another server, they stay there — characters don't transfer between servers.`
            ),
        ],
        ephemeral: true,
      });
    }

    const ACTIONS = ['class', 'study', 'train', 'afterschool'];

    const embed = new EmbedBuilder()
      .setTitle(`🌸 ${interaction.user.displayName}'s Roster`)
      .setColor(PINK)
      .setDescription(`You have **${characters.length}** character(s) enrolled in this server.`)
      .setFooter({ text: 'Hero Academy · 🌸 = used today  ·  = available' })
      .setTimestamp();

    for (const char of characters) {
      const statusParts = ACTIONS.map(action => {
        const used = isOnCooldown(guildId, char.id, action);
        return `${used ? '🌸' : '·'} /${action}`;
      });

      embed.addFields({
        name: `🌸  ${char.name}`,
        value: [
          `> **XP:** ${char.xp}  **|**  **Funds:** ${formatMoney(char.money)}`,
          `> **Proficiencies:** ${char.class1}  ·  ${char.class2}`,
          `> **Activity:** ${char.activity === 'work' ? 'Part-time Work' : 'Club'}`,
          `> **Today:** ${statusParts.join('   ')}`,
        ].join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
