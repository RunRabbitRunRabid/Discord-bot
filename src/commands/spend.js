const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter } = require('../database');
const { formatMoney } = require('../utils/xp');

const PINK = 0xFFB7C5;

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`🌸 ${title}`)
    .setColor(PINK)
    .setDescription(description)
    .setFooter({ text: 'Hero Academy · If this keeps happening, contact a server admin.' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spend')
    .setDescription('Deduct money from your character\'s funds')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Your character\'s name')
        .setRequired(true)
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

    let char;
    try {
      char = getCharacter(guildId, userId, charName);
    } catch (err) {
      console.error('[/spend]', err);
      return interaction.reply({
        embeds: [errorEmbed(
          'Database Error',
          `Something went wrong while looking up **${charName}**.\n\n` +
          `**Try:** Run the command again in a moment. No funds were deducted.`
        )],
        ephemeral: true,
      });
    }

    if (!char) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Not Found',
          `No character named **${charName}** was found under your account in this server.\n\n` +
          `**Try:**\n` +
          `— Check the spelling (names are exact, including spaces)\n` +
          `— Use \`/list\` to see all your characters and their exact names`
        )],
        ephemeral: true,
      });
    }

    if (char.money < amount) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Insufficient Funds',
          `**${char.name}** only has **${formatMoney(char.money)}** and cannot cover **${formatMoney(amount)}**.\n\n` +
          `**Try:**\n` +
          `— Spend a smaller amount\n` +
          `— Earn more money with \`/afterschool\`\n` +
          `— Use \`/list\` to check your exact current balance`
        )],
        ephemeral: true,
      });
    }

    try {
      const newMoney = parseFloat((char.money - amount).toFixed(2));
      updateCharacter(char.id, { money: newMoney });

      const embed = new EmbedBuilder()
        .setTitle('🌸 Funds Spent')
        .setColor(PINK)
        .setDescription(`**${char.name}** spent **${formatMoney(amount)}**.`)
        .addFields(
          { name: 'Amount Spent', value: `-${formatMoney(amount)}`, inline: true },
          { name: 'Remaining Funds', value: formatMoney(newMoney), inline: true },
        )
        .setFooter({ text: 'Hero Academy' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[/spend]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Transaction Failed',
          `The payment for **${char.name}** could not be processed.\n\n` +
          `**Try:** Run \`/spend\` again. Your funds were not changed if the error occurred.`
        )],
        ephemeral: true,
      });
    }
  },
};
