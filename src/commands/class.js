const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter, isOnCooldown, setCooldown } = require('../database');
const { getClassOfDay, getWeekdayName, isProficientInClass } = require('../utils/time');
const { rollXp } = require('../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('class')
    .setDescription('Attend today\'s hero class for XP')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Your character\'s name')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const charName = interaction.options.getString('character').trim();

    const char = getCharacter(guildId, userId, charName);
    if (!char) {
      return interaction.reply({
        content: `❌ No character named **${charName}** found. Check your spelling or use \`/list\`.`,
        ephemeral: true,
      });
    }

    if (isOnCooldown(guildId, char.id, 'class')) {
      return interaction.reply({
        content: `Hey now! **${char.name}** already did that today. You can try again tomorrow.`,
        ephemeral: true,
      });
    }

    const todayClass = getClassOfDay();
    const weekday = getWeekdayName();
    const proficient = isProficientInClass(char, todayClass);

    let xpGained = rollXp();
    let bonusNote = '';

    if (proficient) {
      xpGained += 5;
      bonusNote = `\n✨ **+5 XP Proficiency Bonus!** (${todayClass} is one of ${char.name}'s strong suits)`;
    }

    const newXp = char.xp + xpGained;
    updateCharacter(char.id, { xp: newXp });
    setCooldown(guildId, char.id, 'class');

    const embed = new EmbedBuilder()
      .setTitle(`📚 Class — ${weekday}`)
      .setColor(0xFEE75C)
      .setDescription(
        `**${char.name}** attended **${todayClass}** and gained **${xpGained} XP**!${bonusNote}`
      )
      .addFields(
        { name: 'Total XP', value: `${newXp}`, inline: true },
        { name: 'Today\'s Class', value: todayClass, inline: true },
      )
      .setFooter({ text: 'This action is now on cooldown until midnight Ohio time.' });

    await interaction.reply({ embeds: [embed] });
  },
};
