const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { CLASS_CHOICES, ACTIVITY_CHOICES, PINK } = require('../constants');
const { getChar, getUserChars, createChar } = require('../database');
const { formatMoney } = require('../utils/random');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Enroll a new hero character into the academy')
    .addStringOption(o => o
      .setName('name')
      .setDescription('Your character\'s full name (spaces allowed, up to 100 characters)')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(100)
    )
    .addStringOption(o => o
      .setName('proficiency1')
      .setDescription('First proficiency class — select from the list')
      .setRequired(true)
      .addChoices(...CLASS_CHOICES)
    )
    .addStringOption(o => o
      .setName('proficiency2')
      .setDescription('Second proficiency class — select from the list')
      .setRequired(true)
      .addChoices(...CLASS_CHOICES)
    )
    .addStringOption(o => o
      .setName('activity')
      .setDescription('After-school activity — select from the list')
      .setRequired(true)
      .addChoices(...ACTIVITY_CHOICES)
    )
    .addNumberOption(o => o
      .setName('starting_money')
      .setDescription('Starting money in USD (e.g. 50.00)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(10000)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    const name   = interaction.options.getString('name').trim();
    const prof1  = interaction.options.getString('proficiency1');
    const prof2  = interaction.options.getString('proficiency2');
    const act    = interaction.options.getString('activity');
    const money  = interaction.options.getNumber('starting_money');

    if (prof1 === prof2) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Duplicate Proficiencies',
          `You picked **${prof1}** for both slots. Each character needs two *different* proficiency classes.\n\n` +
          `**Try:** Select a different class for Proficiency 2.`
        )],
        ephemeral: true,
      });
    }

    const existing = getChar(guildId, userId, name);
    if (existing) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Name Already Taken',
          `You already have a character named **${name}** in this server.\n\n` +
          `**Try:** Use a different name, or use \`/list\` to see your current characters.\n` +
          `To change an existing name, use \`/rename\`.`
        )],
        ephemeral: true,
      });
    }

    const allChars = getUserChars(guildId, userId);
    if (allChars.length >= 10) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Limit Reached',
          `You already have **10 characters** in this server — that's the maximum.\n\n` +
          `**Try:** Use \`/delete\` to remove a character you no longer need, then register again.`
        )],
        ephemeral: true,
      });
    }

    try {
      createChar(guildId, userId, name, prof1, prof2, act, money);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 New Hero Enrolled!')
            .setColor(PINK)
            .setDescription(`Welcome to the academy, **${name}**. Your journey begins now.`)
            .addFields(
              { name: 'Name',           value: name,                                    inline: false },
              { name: 'Proficiency 1',  value: prof1,                                   inline: true  },
              { name: 'Proficiency 2',  value: prof2,                                   inline: true  },
              { name: '\u200b',         value: '\u200b',                                inline: true  },
              { name: 'Activity',       value: act === 'work' ? 'Part-time Work' : 'Club', inline: true },
              { name: 'Starting Funds', value: formatMoney(money),                      inline: true  },
              { name: 'Starting XP',   value: '0 XP',                                  inline: true  },
            )
            .setFooter({ text: `Registered by ${interaction.user.tag} · Hero Academy` })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/register]', err);
      await interaction.reply({
        embeds: [errorEmbed(
          'Registration Failed',
          `Something went wrong saving **${name}** to the database.\n\n` +
          `**What may have happened:** The name might already be taken, or there was a brief database error.\n\n` +
          `**Try:** Run \`/register\` again in a moment.`
        )],
        ephemeral: true,
      });
    }
  },
};
