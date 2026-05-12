const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spend')
    .setDescription('Spend money from your character\'s wallet')
    .addStringOption(opt =>
      opt.setName('character').setDescription('Character name').setRequired(true)
    )
    .addNumberOption(opt =>
      opt.setName('amount').setDescription('Amount to spend in USD').setRequired(true).setMinValue(0.01)
    ),

  async execute(interaction) {
    const charName = interaction.options.getString('character').trim();
    const amount = interaction.options.getNumber('amount');
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
    ).get(guildId, charName);

    if (!character) {
      return interaction.reply({ content: `🌸 No character named **${charName}** found.` });
    }
    if (character.user_id !== userId) {
      return interaction.reply({ content: `🌸 **${charName}** doesn't belong to you.` });
    }
    if (character.money < amount) {
      return interaction.reply({ content: 'Not enough funds.' });
    }

    db.prepare('UPDATE characters SET money = money - ? WHERE id = ?').run(amount, character.id);

    const embed = new EmbedBuilder()
      .setTitle('🌸 Money Spent')
      .setColor(0xff9ec8)
      .addFields(
        { name: 'Character', value: charName, inline: true },
        { name: 'Spent', value: `-$${amount.toFixed(2)}`, inline: true },
        { name: 'Remaining Balance', value: `$${(character.money - amount).toFixed(2)}`, inline: true },
      )
      .setFooter({ text: 'Hero School Academy' });

    await interaction.reply({ embeds: [embed] });
  },
};
