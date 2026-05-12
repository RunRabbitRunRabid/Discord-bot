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
    .setName('donate')
    .setDescription('Add money to a character\'s funds')
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

    let char;
    try {
      char = getCharacter(guildId, userId, charName);
    } catch (err) {
      console.error('[/donate]', err);
      return interaction.reply({
        embeds: [errorEmbed(
          'Database Error',
          `Something went wrong while looking up **${charName}**.\n\n` +
          `**Try:** Run the command again in a moment. No funds were added.`
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

    try {
      const newMoney = parseFloat((char.money + amount).toFixed(2));
      updateCharacter(char.id, { money: newMoney });

      const embed = new EmbedBuilder()
        .setTitle('🌸 Donation Received')
        .setColor(PINK)
        .setDescription(`**${char.name}** received a donation of **${formatMoney(amount)}**.`)
        .addFields(
          { name: 'Amount Received', value: `+${formatMoney(amount)}`, inline: true },
          { name: 'New Balance', value: formatMoney(newMoney), inline: true },
        )
        .setFooter({ text: 'Hero Academy' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[/donate]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Transaction Failed',
          `The donation to **${char.name}** could not be processed.\n\n` +
          `**Try:** Run \`/donate\` again. Their balance was not changed if the error occurred.`
        )],
        ephemeral: true,
      });
    }
  },
};
