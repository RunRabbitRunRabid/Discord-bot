const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter, isOnCooldown, setCooldown } = require('../database');
const { getClassOfDay, getWeekdayName, isProficientInClass } = require('../utils/time');
const { rollXp } = require('../utils/xp');

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
    .setName('class')
    .setDescription('Attend today\'s hero class and earn XP')
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
      console.error('[/class]', err);
      return interaction.reply({
        embeds: [errorEmbed(
          'Database Error',
          `Something went wrong while looking up **${charName}**.\n\n` +
          `**Try:** Run the command again in a moment. If it keeps failing, contact a server admin.`
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

    if (isOnCooldown(guildId, char.id, 'class')) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Already Done Today',
          `Hey now! **${char.name}** already attended class today.\n\n` +
          `**Try:** Come back after midnight Ohio time — that's when all daily cooldowns reset. ` +
          `In the meantime, you can still use \`/study\`, \`/train\`, or \`/afterschool\` if you haven't yet.`
        )],
        ephemeral: true,
      });
    }

    try {
      const todayClass = getClassOfDay();
      const weekday = getWeekdayName();
      const proficient = isProficientInClass(char, todayClass);

      let xpGained = rollXp();
      let bonusLine = '';

      if (proficient) {
        xpGained += 5;
        bonusLine = `\n> 🌸 **Proficiency Bonus +5 XP** — ${todayClass} is one of ${char.name}'s specialties!`;
      }

      const newXp = char.xp + xpGained;
      updateCharacter(char.id, { xp: newXp });
      setCooldown(guildId, char.id, 'class');

      const embed = new EmbedBuilder()
        .setTitle(`🌸 Class — ${weekday}`)
        .setColor(PINK)
        .setDescription(
          `**${char.name}** attended **${todayClass}** and earned **+${xpGained} XP**.${bonusLine}`
        )
        .addFields(
          { name: 'XP Earned', value: `+${xpGained}`, inline: true },
          { name: 'Total XP', value: `${newXp}`, inline: true },
          { name: 'Today\'s Class', value: todayClass, inline: true },
        )
        .setFooter({ text: 'Hero Academy · Cooldown resets at midnight Ohio time' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[/class]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Something Went Wrong',
          `**${char.name}**'s class attendance could not be saved.\n\n` +
          `**Try:** Run \`/class\` again. Your XP was not changed if the error occurred.`
        )],
        ephemeral: true,
      });
    }
  },
};
