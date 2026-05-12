const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ComponentType,
} = require('discord.js');
const db = require('../database/db');

const CLASSES = [
  'General Studies',
  'Training',
  'Search and Rescue',
  'Front Line',
  'Support',
  'Power Control',
  'Field Training',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a new character for Hero School')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Character name').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('afterschool')
        .setDescription('After-school activity: club or work')
        .setRequired(true)
        .addChoices(
          { name: '🌸 Club', value: 'club' },
          { name: '🌸 Work', value: 'work' }
        )
    )
    .addNumberOption(opt =>
      opt.setName('startingmoney')
        .setDescription('Starting money in USD (e.g. 50)')
        .setRequired(true)
        .setMinValue(0)
    ),

  async execute(interaction) {
    const name = interaction.options.getString('name').trim();
    const afterschool = interaction.options.getString('afterschool');
    const startingMoney = interaction.options.getNumber('startingmoney');
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (name.length < 2 || name.length > 32) {
      return interaction.reply({ content: '🌸 Character name must be between 2 and 32 characters.' });
    }

    const existing = db.prepare('SELECT id FROM characters WHERE guild_id = ? AND name = ?').get(guildId, name);
    if (existing) {
      return interaction.reply({ content: `🌸 A character named **${name}** already exists in this server.` });
    }

    const classOptions = CLASSES.map(cls =>
      new StringSelectMenuOptionBuilder().setLabel(cls).setValue(cls)
    );

    const subject1Row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('subject1_select')
        .setPlaceholder('Choose Proficiency Class 1...')
        .addOptions(classOptions)
    );

    const embed = new EmbedBuilder()
      .setTitle('🌸 Character Creation — Step 1 of 2')
      .setDescription(`Creating **${name}**\nSelect your **first proficiency class** below.`)
      .setColor(0xff9ec8);

    const reply = await interaction.reply({ embeds: [embed], components: [subject1Row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
      filter: i => i.user.id === interaction.user.id,
    });

    let subject1 = null;

    collector.on('collect', async i => {
      if (i.customId === 'subject1_select') {
        subject1 = i.values[0];

        const remainingOptions = CLASSES.filter(c => c !== subject1).map(cls =>
          new StringSelectMenuOptionBuilder().setLabel(cls).setValue(cls)
        );

        const subject2Row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('subject2_select')
            .setPlaceholder('Choose Proficiency Class 2...')
            .addOptions(remainingOptions)
        );

        const embed2 = new EmbedBuilder()
          .setTitle('🌸 Character Creation — Step 2 of 2')
          .setDescription(`Creating **${name}**\nFirst class: **${subject1}**\nNow select your **second proficiency class**.`)
          .setColor(0xff9ec8);

        await i.update({ embeds: [embed2], components: [subject2Row] });
      } else if (i.customId === 'subject2_select') {
        const subject2 = i.values[0];
        collector.stop('done');

        try {
          db.prepare(`
            INSERT INTO characters (guild_id, user_id, name, subject1, subject2, afterschool, money, xp)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
          `).run(guildId, userId, name, subject1, subject2, afterschool, startingMoney);

          const finalEmbed = new EmbedBuilder()
            .setTitle('🌸 Character Created!')
            .setColor(0xff9ec8)
            .addFields(
              { name: 'Name', value: name, inline: true },
              { name: 'After-School', value: afterschool === 'club' ? '🌸 Club' : '🌸 Work', inline: true },
              { name: 'Starting Money', value: `$${startingMoney.toFixed(2)}`, inline: true },
              { name: 'Proficiency 1', value: subject1, inline: true },
              { name: 'Proficiency 2', value: subject2, inline: true },
            )
            .setFooter({ text: `Created by ${interaction.user.username}` });

          await i.update({ embeds: [finalEmbed], components: [] });
        } catch (err) {
          await i.update({
            embeds: [],
            components: [],
            content: `🌸 Failed to create character. A character named **${name}** may already exist.`,
          });
        }
      }
    });

    collector.on('end', (_, reason) => {
      if (reason !== 'done') {
        reply.edit({ content: '🌸 Character creation timed out. Please run `/create` again.', embeds: [], components: [] }).catch(() => {});
      }
    });
  },
};
