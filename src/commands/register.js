const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createCharacter, getCharacter, getUserCharacters } = require('../database');
const { formatMoney } = require('../utils/xp');

const CLASS_CHOICES = [
  { name: 'General Studies', value: 'General Studies' },
  { name: 'Training', value: 'Training' },
  { name: 'Search and Rescue', value: 'Search and Rescue' },
  { name: 'Front Line', value: 'Front Line' },
  { name: 'Support', value: 'Support' },
  { name: 'Quirk Control', value: 'Quirk Control' },
  { name: 'Field Training', value: 'Field Training' },
];

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
    .setName('register')
    .setDescription('Enroll a new hero character into the academy')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Your character\'s full name (spaces allowed)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('proficiency1')
        .setDescription('First proficiency class — scroll to choose')
        .setRequired(true)
        .addChoices(...CLASS_CHOICES)
    )
    .addStringOption(opt =>
      opt.setName('proficiency2')
        .setDescription('Second proficiency class — scroll to choose')
        .setRequired(true)
        .addChoices(...CLASS_CHOICES)
    )
    .addStringOption(opt =>
      opt.setName('activity')
        .setDescription('After-school activity — scroll to choose')
        .setRequired(true)
        .addChoices(
          { name: 'Club', value: 'club' },
          { name: 'Work (part-time job)', value: 'work' }
        )
    )
    .addNumberOption(opt =>
      opt.setName('starting_money')
        .setDescription('Starting money in USD (e.g. 50.00)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(10000)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const name = interaction.options.getString('name').trim();
    const class1 = interaction.options.getString('proficiency1');
    const class2 = interaction.options.getString('proficiency2');
    const activity = interaction.options.getString('activity');
    const money = interaction.options.getNumber('starting_money');

    if (class1 === class2) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Duplicate Proficiencies',
          `You selected **${class1}** for both proficiency slots.\n\n` +
          `**Try:** Choose two *different* classes — for example, **Training** and **Support**. ` +
          `Each character gets two unique specialties.`
        )],
        ephemeral: true,
      });
    }

    const existing = getCharacter(guildId, userId, name);
    if (existing) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Name Already Taken',
          `You already have a character named **${name}** in this server.\n\n` +
          `**Try:** Use a different name, or view your current characters with \`/list\`. ` +
          `If you want to update an existing character's name, use \`/rename\`.`
        )],
        ephemeral: true,
      });
    }

    const userChars = getUserCharacters(guildId, userId);
    if (userChars.length >= 10) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Limit Reached',
          `You already have **10 characters** in this server, which is the maximum.\n\n` +
          `**Try:** Use \`/delete\` to remove a character you no longer need, then register your new one.`
        )],
        ephemeral: true,
      });
    }

    try {
      createCharacter(guildId, userId, name, class1, class2, activity, money);

      const embed = new EmbedBuilder()
        .setTitle('🌸 New Hero Enrolled!')
        .setColor(PINK)
        .setDescription(`Welcome to the academy, **${name}**. Your journey begins now.`)
        .addFields(
          { name: 'Character Name', value: name, inline: false },
          { name: 'Proficiency I', value: class1, inline: true },
          { name: 'Proficiency II', value: class2, inline: true },
          { name: '\u200b', value: '\u200b', inline: true },
          { name: 'After-School Activity', value: activity === 'work' ? 'Part-time Work' : 'Club', inline: true },
          { name: 'Starting Funds', value: formatMoney(money), inline: true },
          { name: 'Starting XP', value: '0 XP', inline: true },
        )
        .setFooter({ text: `Registered by ${interaction.user.tag} · Hero Academy` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[/register]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Registration Failed',
          `Something went wrong while saving your character to the database.\n\n` +
          `**What may have happened:** The name might already exist, or there was a brief database issue.\n\n` +
          `**Try:** Wait a moment and run \`/register\` again. If the error repeats, contact a server admin.`
        )],
        ephemeral: true,
      });
    }
  },
};
