const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter, isOnCooldown, setCooldown } = require('../database');
const { rollXp } = require('../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('study')
    .setDescription('Study to earn XP')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Your character\'s name')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const charName = interaction.options.getString('character').trim();

    const char = getCharacter(guildId, userId, charName);
    if (!char) {
      return interaction.reply({
        content: `❌ No character named **${charName}** found. Check your spelling or use \`/list\`.`,
        ephemeral: true,
      });
    }

    if (isOnCooldown(guildId, char.id, 'study')) {
      return interaction.reply({
        content: `Hey now! **${char.name}** already did that today. You can try again tomorrow.`,
        ephemeral: true,
      });
    }

    const xpGained = rollXp();
    const newXp = char.xp + xpGained;
    updateCharacter(char.id, { xp: newXp });
    setCooldown(guildId, char.id, 'study');

    const embed = new EmbedBuilder()
      .setTitle('📖 Study Session')
      .setColor(0x57F287)
      .setDescription(`**${char.name}** hit the books and earned **${xpGained} XP**!`)
      .addFields(
        { name: 'XP Gained', value: `+${xpGained}`, inline: true },
        { name: 'Total XP', value: `${newXp}`, inline: true },
      )
      .setFooter({ text: 'This action is now on cooldown until midnight Ohio time.' });

    await interaction.reply({ embeds: [embed] });
  },
};
