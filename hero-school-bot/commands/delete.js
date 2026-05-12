const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Permanently delete one of your characters')
    .addStringOption(opt =>
      opt.setName('character').setDescription('Character name to delete').setRequired(true)
    ),

  async execute(interaction) {
    const charName = interaction.options.getString('character').trim();
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

    const confirm = new ButtonBuilder()
      .setCustomId('confirm_delete')
      .setLabel('Yes, delete forever')
      .setStyle(ButtonStyle.Danger);

    const cancel = new ButtonBuilder()
      .setCustomId('cancel_delete')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirm, cancel);

    const reply = await interaction.reply({
      content: `🌸 Are you sure you want to permanently delete **${charName}**? This cannot be undone.`,
      components: [row],
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      collector.stop();
      if (i.customId === 'confirm_delete') {
        db.prepare('DELETE FROM characters WHERE id = ?').run(character.id);
        await i.update({ content: `🌸 **${charName}** has been permanently deleted.`, components: [] });
      } else {
        await i.update({ content: `🌸 Deletion cancelled. **${charName}** is safe.`, components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        reply.edit({ content: `🌸 Deletion timed out. **${charName}** was not deleted.`, components: [] }).catch(() => {});
      }
    });
  },
};
