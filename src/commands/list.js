const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserCharacters, isOnCooldown } = require('../database');
const { formatMoney } = require('../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('View all your characters, stats, and daily activity status'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const characters = getUserCharacters(guildId, userId);

    if (!characters.length) {
      return interaction.reply({
        content: '📋 You have no characters in this server. Use `/register` to create one!',
        ephemeral: true,
      });
    }

    const ACTIONS = ['class', 'study', 'train', 'afterschool'];

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${interaction.user.username}'s Characters`)
      .setColor(0x5865F2)
      .setFooter({ text: `${characters.length} character(s) | Daily cooldowns reset at midnight Ohio time` });

    for (const char of characters) {
      const cooldownStatus = ACTIONS.map(action => {
        const used = isOnCooldown(guildId, char.id, action);
        return `${used ? '✅' : '⬜'} /${action}`;
      }).join('  ');

      embed.addFields({
        name: `⚡ ${char.name}`,
        value: [
          `**XP:** ${char.xp} | **Money:** ${formatMoney(char.money)}`,
          `**Proficiencies:** ${char.class1}, ${char.class2}`,
          `**Activity:** ${char.activity === 'work' ? 'Part-time Work' : 'Club'}`,
          `**Today:** ${cooldownStatus}`,
        ].join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
