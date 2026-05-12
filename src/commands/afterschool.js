const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PINK } = require('../constants');
const { getChar, updateChar, isOnCooldown, setCooldown } = require('../database');
const { rollXp, rollMoney, afterschoolMessage, formatMoney } = require('../utils/random');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afterschool')
    .setDescription('Attend your after-school activity for XP and money')
    .addStringOption(o => o
      .setName('character')
      .setDescription('Your character\'s name')
      .setRequired(true)
    ),

  async execute(interaction) {
    const guildId  = interaction.guildId;
    const userId   = interaction.user.id;
    const charName = interaction.options.getString('character').trim();

    let char;
    try { char = getChar(guildId, userId, charName); }
    catch (err) {
      console.error('[/afterschool]', err);
      return interaction.reply({ embeds: [errorEmbed('Database Error', `Could not look up **${charName}**. Try again in a moment.`)], ephemeral: true });
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

    if (isOnCooldown(guildId, char.id, 'afterschool')) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Already Done Today',
          `Hey now! **${char.name}** already did their after-school activity today.\n\n` +
          `**Try:** Come back after midnight Ohio time. You can still use \`/class\`, \`/study\`, or \`/train\`.`
        )],
        ephemeral: true,
      });
    }

    try {
      const isWork   = char.activity === 'work';
      const xp       = rollXp();
      const earned   = rollMoney(isWork);
      const newXp    = char.xp + xp;
      const newMoney = parseFloat((char.money + earned).toFixed(2));

      updateChar(char.id, { xp: newXp, money: newMoney });
      setCooldown(guildId, char.id, 'afterschool');

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🌸 ${isWork ? 'Part-time Work' : 'Club Activity'}`)
            .setColor(PINK)
            .setDescription(`**${char.name}** ${afterschoolMessage(isWork)}`)
            .addFields(
              { name: 'XP Earned',    value: `+${xp}`,               inline: true },
              { name: 'Money Earned', value: `+${formatMoney(earned)}`, inline: true },
              { name: '\u200b',       value: '\u200b',                inline: true },
              { name: 'Total XP',    value: `${newXp}`,              inline: true },
              { name: 'Total Funds', value: formatMoney(newMoney),   inline: true },
            )
            .setFooter({ text: 'Hero Academy · Cooldown resets at midnight Ohio time' })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/afterschool]', err);
      await interaction.reply({
        embeds: [errorEmbed('Something Went Wrong', `**${char.name}**'s after-school activity could not be saved.\n\n**Try:** Run \`/afterschool\` again. Your XP and funds were not changed.`)],
        ephemeral: true,
      });
    }
  },
};
