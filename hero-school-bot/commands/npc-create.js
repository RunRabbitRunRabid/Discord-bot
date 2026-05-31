const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ComponentType,
  PermissionFlagsBits,
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

const QUALITY_LABELS = {
  good:   '🟢 Good',
  medium: '🟡 Medium',
  bad:    '🔴 Bad',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('npc-create')
    .setDescription('(Admin) Create an NPC character that auto-rolls daily')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('NPC character name')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('student_quality')
        .setDescription('Student quality tier — affects daily roll ranges')
        .setRequired(true)
        .addChoices(
          { name: '🟢 Good  (4–18 XP per activity)', value: 'good' },
          { name: '🟡 Medium (3–15 XP per activity)', value: 'medium' },
          { name: '🔴 Bad   (2–10 XP per activity)', value: 'bad' }
        )
    )
    .addStringOption(opt =>
      opt.setName('afterschool')
        .setDescription('After-school activity')
        .setRequired(true)
        .addChoices(
          { name: '🌸 Club', value: 'club' },
          { name: '🌸 Work', value: 'work' }
        )
    )
    .addNumberOption(opt =>
      opt.setName('startingmoney')
        .setDescription('Starting money in USD (default: 0)')
        .setRequired(false)
        .setMinValue(0)
    ),

  async execute(interaction) {
    const name          = interaction.options.getString('name').trim();
    const quality       = interaction.options.getString('student_quality');
    const afterschool   = interaction.options.getString('afterschool');
    const startingMoney = interaction.options.getNumber('startingmoney') ?? 0;
    const guildId       = interaction.guildId;

    // NPC user_id is a sentinel value — NPCs are not owned by any real user
    const NPC_USER_ID = 'NPC';

    if (name.length < 2 || name.length > 32) {
      return interaction.reply({ content: '🌸 NPC name must be between 2 and 32 characters.', ephemeral: true });
    }

    const existing = db.prepare('SELECT id FROM characters WHERE guild_id = ? AND name = ?').get(guildId, name);
    if (existing) {
      return interaction.reply({ content: `🌸 A character named **${name}** already exists in this server.`, ephemeral: true });
    }

    // Build subject selection menus
    const classOptions = CLASSES.map(cls =>
      new StringSelectMenuOptionBuilder().setLabel(cls).setValue(cls)
    );

    const subject1Row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('npc_subject1_select')
        .setPlaceholder('Choose Proficiency Class 1...')
        .addOptions(classOptions)
    );

    const embed = new EmbedBuilder()
      .setTitle('🤖 NPC Creation — Step 1 of 2')
      .setDescription(`Creating NPC **${name}** (${QUALITY_LABELS[quality]})\nSelect the **first proficiency class** below.`)
      .setColor(0x7289da);

    const reply = await interaction.reply({ embeds: [embed], components: [subject1Row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
      filter: i => i.user.id === interaction.user.id,
    });

    let subject1 = null;

    collector.on('collect', async i => {
      if (i.customId === 'npc_subject1_select') {
        subject1 = i.values[0];

        const remainingOptions = CLASSES.filter(c => c !== subject1).map(cls =>
          new StringSelectMenuOptionBuilder().setLabel(cls).setValue(cls)
        );

        const subject2Row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('npc_subject2_select')
            .setPlaceholder('Choose Proficiency Class 2...')
            .addOptions(remainingOptions)
        );

        const embed2 = new EmbedBuilder()
          .setTitle('🤖 NPC Creation — Step 2 of 2')
          .setDescription(
            `Creating NPC **${name}** (${QUALITY_LABELS[quality]})\n` +
            `First class: **${subject1}**\nNow select the **second proficiency class**.`
          )
          .setColor(0x7289da);

        await i.update({ embeds: [embed2], components: [subject2Row] });

      } else if (i.customId === 'npc_subject2_select') {
        const subject2 = i.values[0];
        collector.stop('done');

        try {
          db.prepare(`
            INSERT INTO characters (guild_id, user_id, name, subject1, subject2, afterschool, money, xp, is_npc, student_quality)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?)
          `).run(guildId, NPC_USER_ID, name, subject1, subject2, afterschool, startingMoney, quality);

          const finalEmbed = new EmbedBuilder()
            .setTitle('🤖 NPC Created!')
            .setColor(0x7289da)
            .setDescription(`**${name}** has been registered as an NPC and will auto-roll all 4 activities every day at **6 AM ET**.`)
            .addFields(
              { name: 'Name',            value: name,                                          inline: true },
              { name: 'Student Quality', value: QUALITY_LABELS[quality],                       inline: true },
              { name: 'After-School',    value: afterschool === 'club' ? '🌸 Club' : '🌸 Work', inline: true },
              { name: 'Starting Money',  value: `$${startingMoney.toFixed(2)}`,                inline: true },
              { name: 'Proficiency 1',   value: subject1,                                      inline: true },
              { name: 'Proficiency 2',   value: subject2,                                      inline: true },
            )
            .setFooter({ text: `Created by ${interaction.user.username} • Hero School Academy` });

          await i.update({ embeds: [finalEmbed], components: [] });
        } catch (err) {
          await i.update({
            embeds: [],
            components: [],
            content: `🌸 Failed to create NPC. A character named **${name}** may already exist.`,
          });
        }
      }
    });

    collector.on('end', (_, reason) => {
      if (reason !== 'done') {
        reply.edit({
          content: '🌸 NPC creation timed out. Please run `/npc-create` again.',
          embeds: [],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
