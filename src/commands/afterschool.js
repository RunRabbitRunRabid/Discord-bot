const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter, isOnCooldown, setCooldown } = require('../database');
const { rollXp, rollMoney, getAfterSchoolMessage, formatMoney } = require('../utils/xp');

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
    .setName('afterschool')
    .setDescription('Attend your after-school activity for XP and money')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Your character\'s name')
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const charName = interaction.options.getString('character').trim();

    let char;
    try {
      char = getCharacter(guildId, userId, charName);
    } catch (err) {
      console.error('[/afterschool]', err);
      return interaction.reply({
        embeds: [errorEmbed(
          'Database Error',
          `Something went wrong while looking up **${charName}**.\n\n` +
          `**Try:** Run the command again in a moment.`
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

    if (isOnCooldown(guildId, char.id, 'afterschool')) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Already Done Today',
          `Hey now! **${char.name}** already did their after-school activity today.\n\n` +
          `**Try:** Come back after midnight Ohio time when cooldowns reset. ` +
          `You can still use \`/class\`, \`/study\`, or \`/train\` if you haven't yet.`
        )],
        ephemeral: true,
      });
    }

    try {
      const isWork = char.activity === 'work';
      const xpGained = rollXp();
      const moneyGained = rollMoney(isWork);
      const message = getAfterSchoolMessage(isWork);

      const newXp = char.xp + xpGained;
      const newMoney = parseFloat((char.money + moneyGained).toFixed(2));
      updateCharacter(char.id, { xp: newXp, money: newMoney });
      setCooldown(guildId, char.id, 'afterschool');

      const embed = new EmbedBuilder()
        .setTitle(`🌸 ${isWork ? 'Part-time Work' : 'Club Activity'}`)
        .setColor(PINK)
        .setDescription(`**${char.name}** — ${message}`)
        .addFields(
          { name: 'XP Earned', value: `+${xpGained}`, inline: true },
          { name: 'Money Earned', value: `+${formatMoney(moneyGained)}`, inline: true },
          { name: '\u200b', value: '\u200b', inline: true },
          { name: 'Total XP', value: `${newXp}`, inline: true },
          { name: 'Total Funds', value: formatMoney(newMoney), inline: true },
        )
        .setFooter({ text: 'Hero Academy · Cooldown resets at midnight Ohio time' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[/afterschool]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Something Went Wrong',
          `**${char.name}**'s after-school activity could not be saved.\n\n` +
          `**Try:** Run \`/afterschool\` again. Your XP and funds were not changed if the error occurred.`
        )],
        ephemeral: true,
      });
    }
  },
};
