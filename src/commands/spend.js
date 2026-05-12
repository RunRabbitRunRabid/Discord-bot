const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter } = require('../database');
const { formatMoney } = require('../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spend')
    .setDescription('Spend money from your character')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Your character\'s name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addNumberOption(opt =>
      opt.setName('amount')
        .setDescription('Amount to spend in USD')
        .setRequired(true)
        .setMinValue(0.01)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const charName = interaction.options.getString('character').trim();
    const amount = parseFloat(interaction.options.getNumber('amount').toFixed(2));

    const char = getCharacter(guildId, userId, charName);
    if (!char) {
      return interaction.reply({
        content: `❌ No character named **${charName}** found. Check your spelling or use \`/list\`.`,
        ephemeral: true,
      });
    }

    if (char.money < amount) {
      return interaction.reply({
        content: `❌ **${char.name}** only has ${formatMoney(char.money)} and cannot afford ${formatMoney(amount)}.`,
        ephemeral: true,
      });
    }

    const newMoney = parseFloat((char.money - amount).toFixed(2));
    updateCharacter(char.id, { money: newMoney });

    const embed = new EmbedBuilder()
      .setTitle('💸 Money Spent')
      .setColor(0xFEE75C)
      .setDescription(`**${char.name}** spent **${formatMoney(amount)}**.`)
      .addFields(
        { name: 'Spent', value: `-${formatMoney(amount)}`, inline: true },
        { name: 'Remaining Balance', value: formatMoney(newMoney), inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
