const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCharacter, updateCharacter, isOnCooldown, setCooldown } = require('../database');
const { rollXp } = require('../utils/xp');

const PINK = 0xFFB7C5;

const TRAIN_LINES = [
  'pushed past their limits in the training hall today.',
  'ran drills until their body finally gave in — in the best way.',
  'worked on their weaknesses and came out stronger.',
  'sparred until every move felt natural.',
  'spent the session refining the fundamentals and it paid off.',
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
    .setName('train')
    .setDescription('Push your limits in the training hall and earn XP')
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

    let char;
    try {
      char = getCharacter(guildId, userId, charName);
    } catch (err) {
      console.error('[/train]', err);
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

    if (isOnCooldown(guildId, char.id, 'train')) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Already Done Today',
          `Hey now! **${char.name}** already trained today.\n\n` +
          `**Try:** Come back after midnight Ohio time when cooldowns reset. ` +
          `You can still use \`/class\`, \`/study\`, or \`/afterschool\` if you haven't yet.`
        )],
        ephemeral: true,
      });
    }

    try {
      const xpGained = rollXp();
      const newXp = char.xp + xpGained;
      const flavour = TRAIN_LINES[Math.floor(Math.random() * TRAIN_LINES.length)];
      updateCharacter(char.id, { xp: newXp });
      setCooldown(guildId, char.id, 'train');

      const embed = new EmbedBuilder()
        .setTitle('🌸 Training Session')
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
      console.error('[/train]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Something Went Wrong',
          `**${char.name}**'s training session could not be saved.\n\n` +
          `**Try:** Run \`/train\` again. Your XP was not changed if the error occurred.`
        )],
        ephemeral: true,
      });
    }
  },
};
