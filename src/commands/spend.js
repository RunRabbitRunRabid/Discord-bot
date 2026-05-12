const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PINK } = require('../constants');
const { getChar, updateChar } = require('../database');
const { formatMoney } = require('../utils/random');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spend')
    .setDescription('Deduct money from your character\'s funds')
    .addStringOption(o => o
      .setName('character')
      .setDescription('Your character\'s name')
      .setRequired(true)
    )
    .addNumberOption(o => o
      .setName('amount')
      .setDescription('Amount to spend in USD')
      .setRequired(true)
      .setMinValue(0.01)
    ),

  async execute(interaction) {
    const guildId  = interaction.guildId;
    const userId   = interaction.user.id;
    const charName = interaction.options.getString('character').trim();
    const amount   = parseFloat(interaction.options.getNumber('amount').toFixed(2));

    let char;
    try { char = getChar(guildId, userId, charName); }
    catch (err) {
      console.error('[/spend]', err);
      return interaction.reply({ embeds: [errorEmbed('Database Error', `Could not look up **${charName}**. Try again in a moment. No funds were deducted.`)], ephemeral: true });
    }

    if (!char) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Not Found',
          `No character named **${charName}** was found on your account in this server.\n\n` +
          `**Try:**\n— Check the spelling (names are exact, spaces included)\n— Use \`/list\` to see your characters`
        )],
        ephemeral: true,
      });
    }

    if (char.money < amount) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Insufficient Funds',
          `**${char.name}** only has **${formatMoney(char.money)}** and cannot cover **${formatMoney(amount)}**.\n\n` +
          `**Try:**\n— Spend a smaller amount\n— Earn more with \`/afterschool\`\n— Use \`/list\` to check your exact balance`
        )],
        ephemeral: true,
      });
    }

    try {
      const newMoney = parseFloat((char.money - amount).toFixed(2));
      updateChar(char.id, { money: newMoney });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 Funds Spent')
            .setColor(PINK)
            .setDescription(`**${char.name}** spent **${formatMoney(amount)}**.`)
            .addFields(
              { name: 'Amount Spent',    value: `-${formatMoney(amount)}`, inline: true },
              { name: 'Remaining Funds', value: formatMoney(newMoney),     inline: true },
            )
            .setFooter({ text: 'Hero Academy' })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/spend]', err);
      await interaction.reply({
        embeds: [errorEmbed('Transaction Failed', `**${char.name}**'s payment could not be processed.\n\n**Try:** Run \`/spend\` again. Your funds were not changed.`)],
        ephemeral: true,
      });
    }
  },
};
