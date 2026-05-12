const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter, isOnCooldown, setCooldown } = require('../database');
const { rollXp, rollMoney, getAfterSchoolMessage, formatMoney } = require('../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afterschool')
    .setDescription('Do your after-school activity for XP and money')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Your character\'s name')
        .setRequired(true)
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

    if (isOnCooldown(guildId, char.id, 'afterschool')) {
      return interaction.reply({
        content: `Hey now! **${char.name}** already did that today. You can try again tomorrow.`,
        ephemeral: true,
      });
    }

    const isWork = char.activity === 'work';
    const xpGained = rollXp();
    const moneyGained = rollMoney(isWork);
    const message = getAfterSchoolMessage(isWork);

    const newXp = char.xp + xpGained;
    const newMoney = parseFloat((char.money + moneyGained).toFixed(2));
    updateCharacter(char.id, { xp: newXp, money: newMoney });
    setCooldown(guildId, char.id, 'afterschool');

    const embed = new EmbedBuilder()
      .setTitle(`${isWork ? '💼 Part-time Work' : '🎭 Club Activity'}`)
      .setColor(isWork ? 0xFEE75C : 0xEB459E)
      .setDescription(`**${char.name}** — ${message}`)
      .addFields(
        { name: 'XP Gained', value: `+${xpGained}`, inline: true },
        { name: 'Money Earned', value: `+${formatMoney(moneyGained)}`, inline: true },
        { name: 'Total XP', value: `${newXp}`, inline: true },
        { name: 'Total Money', value: formatMoney(newMoney), inline: true },
      )
      .setFooter({ text: 'This action is now on cooldown until midnight Ohio time.' });

    await interaction.reply({ embeds: [embed] });
  },
};
