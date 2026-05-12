const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter } = require('../database');
const { formatMoney } = require('../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Add money to your character (staff/admin use)')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Your character\'s name')
        .setRequired(true)
    )
    .addNumberOption(opt =>
      opt.setName('amount')
        .setDescription('Amount to add in USD')
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

    const newMoney = parseFloat((char.money + amount).toFixed(2));
    updateCharacter(char.id, { money: newMoney });

    const embed = new EmbedBuilder()
      .setTitle('💰 Donation Received')
      .setColor(0x57F287)
      .setDescription(`**${char.name}** received a donation of **${formatMoney(amount)}**!`)
      .addFields(
        { name: 'Received', value: `+${formatMoney(amount)}`, inline: true },
        { name: 'New Balance', value: formatMoney(newMoney), inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
