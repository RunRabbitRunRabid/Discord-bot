const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PINK } = require('../constants');
const { getChar, updateChar } = require('../database');
const { formatMoney } = require('../utils/random');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Add money to a character\'s funds')
    .addStringOption(o => o
      .setName('character')
      .setDescription('Your character\'s name')
      .setRequired(true)
    )
    .addNumberOption(o => o
      .setName('amount')
      .setDescription('Amount to add in USD')
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
      console.error('[/donate]', err);
      return interaction.reply({ embeds: [errorEmbed('Database Error', `Could not look up **${charName}**. Try again in a moment. No funds were added.`)], ephemeral: true });
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

    try {
      const newMoney = parseFloat((char.money + amount).toFixed(2));
      updateChar(char.id, { money: newMoney });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 Donation Received')
            .setColor(PINK)
            .setDescription(`**${char.name}** received a donation of **${formatMoney(amount)}**.`)
            .addFields(
              { name: 'Amount Received', value: `+${formatMoney(amount)}`, inline: true },
              { name: 'New Balance',     value: formatMoney(newMoney),     inline: true },
            )
            .setFooter({ text: 'Hero Academy' })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/donate]', err);
      await interaction.reply({
        embeds: [errorEmbed('Transaction Failed', `The donation to **${char.name}** could not be processed.\n\n**Try:** Run \`/donate\` again. Their balance was not changed.`)],
        ephemeral: true,
      });
    }
  },
};
