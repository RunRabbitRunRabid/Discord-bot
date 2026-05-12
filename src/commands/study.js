const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter, isOnCooldown, setCooldown } = require('../database');
const { rollXp } = require('../utils/xp');

const PINK = 0xFFB7C5;

const STUDY_LINES = [
  'buried in textbooks for hours and came out sharper for it.',
  'reviewed every note from this week and it showed.',
  'ran practice drills in their head until the concepts clicked.',
  'spent the evening reading ahead and gained an edge.',
  'worked through every problem in the chapter without skipping a single one.',
];

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`🌸 ${title}`)
    .setColor(PINK)
    .setDescription(description)
    .setFooter({ text: 'Hero Academy · If this keeps happening, contact a server admin.' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('study')
    .setDescription('Hit the books and earn XP')
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
      console.error('[/study]', err);
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

    if (isOnCooldown(guildId, char.id, 'study')) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Already Done Today',
          `Hey now! **${char.name}** already studied today.\n\n` +
          `**Try:** Come back after midnight Ohio time when cooldowns reset. ` +
          `You can still use \`/class\`, \`/train\`, or \`/afterschool\` if you haven't yet.`
        )],
        ephemeral: true,
      });
    }

    try {
      const xpGained = rollXp();
      const newXp = char.xp + xpGained;
      const flavour = STUDY_LINES[Math.floor(Math.random() * STUDY_LINES.length)];
      updateCharacter(char.id, { xp: newXp });
      setCooldown(guildId, char.id, 'study');

      const embed = new EmbedBuilder()
        .setTitle('🌸 Study Session')
        .setColor(PINK)
        .setDescription(`**${char.name}** ${flavour}`)
        .addFields(
          { name: 'XP Earned', value: `+${xpGained}`, inline: true },
          { name: 'Total XP', value: `${newXp}`, inline: true },
        )
        .setFooter({ text: 'Hero Academy · Cooldown resets at midnight Ohio time' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[/study]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Something Went Wrong',
          `**${char.name}**'s study session could not be saved.\n\n` +
          `**Try:** Run \`/study\` again. Your XP was not changed if the error occurred.`
        )],
        ephemeral: true,
      });
    }
  },
};
