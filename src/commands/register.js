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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Create a new hero character')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Your character\'s name')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(32)
    )
    .addStringOption(opt =>
      opt.setName('class1')
        .setDescription('First proficiency class')
        .setRequired(true)
        .addChoices(...CLASS_CHOICES)
    )
    .addStringOption(opt =>
      opt.setName('class2')
        .setDescription('Second proficiency class')
        .setRequired(true)
        .addChoices(...CLASS_CHOICES)
    )
    .addStringOption(opt =>
      opt.setName('activity')
        .setDescription('After-school activity type')
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
    const class1 = interaction.options.getString('class1');
    const class2 = interaction.options.getString('class2');
    const activity = interaction.options.getString('activity');
    const money = interaction.options.getNumber('starting_money');

    if (class1 === class2) {
      return interaction.reply({
        content: '❌ Your two proficiency classes must be different.',
        ephemeral: true,
      });
    }

    const existing = getCharacter(guildId, userId, name);
    if (existing) {
      return interaction.reply({
        content: `❌ You already have a character named **${name}** in this server.`,
        ephemeral: true,
      });
    }

    const userChars = getUserCharacters(guildId, userId);
    if (userChars.length >= 10) {
      return interaction.reply({
        content: '❌ You can have at most 10 characters per server.',
        ephemeral: true,
      });
    }

    try {
      createCharacter(guildId, userId, name, class1, class2, activity, money);

      const embed = new EmbedBuilder()
        .setTitle('✅ Character Registered!')
        .setColor(0x57F287)
        .addFields(
          { name: 'Name', value: name, inline: true },
          { name: 'Proficiency 1', value: class1, inline: true },
          { name: 'Proficiency 2', value: class2, inline: true },
          { name: 'Activity', value: activity === 'work' ? 'Part-time Work' : 'Club', inline: true },
          { name: 'Starting Money', value: formatMoney(money), inline: true },
          { name: 'Starting XP', value: '0', inline: true },
        )
        .setFooter({ text: `Character created for ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Failed to create character. The name may already be taken in this server.',
        ephemeral: true,
      });
    }
  },
};
