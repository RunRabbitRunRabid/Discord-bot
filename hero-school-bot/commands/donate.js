const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Add money to a character (admin/mod use)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt.setName('character').setDescription('Character name').setRequired(true)
    )
    .addNumberOption(opt =>
      opt.setName('amount').setDescription('Amount to add in USD').setRequired(true).setMinValue(0.01)
    ),

  async execute(interaction) {
    const charName = interaction.options.getString('character').trim();
    const amount = interaction.options.getNumber('amount');
    const guildId = interaction.guildId;

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
    ).get(guildId, charName);

    if (!character) {
      return interaction.reply({ content: `🌸 No character named **${charName}** found.` });
    }

    db.prepare('UPDATE characters SET money = money + ? WHERE id = ?').run(amount, character.id);

    const embed = new EmbedBuilder()
      .setTitle('🌸 Donation Added')
      .setColor(0xff9ec8)
      .addFields(
        { name: 'Character', value: charName, inline: true },
        { name: 'Added', value: `+$${amount.toFixed(2)}`, inline: true },
        { name: 'New Balance', value: `$${(character.money + amount).toFixed(2)}`, inline: true },
      )
      .setFooter({ text: `Donated by ${interaction.user.username} • Hero School Academy` });

    await interaction.reply({ embeds: [embed] });
  },
};
