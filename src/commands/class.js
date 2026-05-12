const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PINK } = require('../constants');
const { getChar, updateChar, isOnCooldown, setCooldown } = require('../database');
const { rollXp } = require('../utils/random');
const { getClassOfDay, getWeekdayName, isProficient } = require('../utils/time');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('class')
    .setDescription('Attend today\'s hero class and earn XP')
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
      console.error('[/class]', err);
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

    if (isOnCooldown(guildId, char.id, 'class')) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Already Done Today',
          `Hey now! **${char.name}** already attended class today.\n\n` +
          `**Try:** Come back after midnight Ohio time. You can still use \`/study\`, \`/train\`, or \`/afterschool\` in the meantime.`
        )],
        ephemeral: true,
      });
    }

    try {
      const todayClass = getClassOfDay();
      const weekday    = getWeekdayName();
      const bonus      = isProficient(char, todayClass);
      let xp           = rollXp();
      let bonusLine    = '';

      if (bonus) {
        xp += 5;
        bonusLine = `\n> 🌸 **Proficiency Bonus +5 XP** — ${todayClass} is one of ${char.name}'s specialties!`;
      }

      const newXp = char.xp + xp;
      updateChar(char.id, { xp: newXp });
      setCooldown(guildId, char.id, 'class');

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🌸 Class — ${weekday}`)
            .setColor(PINK)
            .setDescription(`**${char.name}** attended **${todayClass}** and earned **+${xp} XP**.${bonusLine}`)
            .addFields(
              { name: 'XP Earned',     value: `+${xp}`,      inline: true },
              { name: 'Total XP',      value: `${newXp}`,     inline: true },
              { name: 'Today\'s Class',value: todayClass,     inline: true },
            )
            .setFooter({ text: 'Hero Academy · Cooldown resets at midnight Ohio time' })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/class]', err);
      await interaction.reply({
        embeds: [errorEmbed('Something Went Wrong', `**${char.name}**'s class attendance could not be saved.\n\n**Try:** Run \`/class\` again. Your XP was not changed.`)],
        ephemeral: true,
      });
    }
  },
};
