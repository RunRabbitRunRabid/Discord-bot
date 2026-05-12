const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getCharacter, deleteCharacter } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Permanently delete one of your characters')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Character name to delete')
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const charName = interaction.options.getString('character').trim();

    const char = getCharacter(guildId, userId, charName);
    if (!char) {
      return interaction.reply({
        content: `❌ No character named **${charName}** found. Check your spelling or use \`/list\`.`,
        ephemeral: true,
      });
    }

    const confirmBtn = new ButtonBuilder()
      .setCustomId('confirm_delete')
      .setLabel('Yes, delete permanently')
      .setStyle(ButtonStyle.Danger);

    const cancelBtn = new ButtonBuilder()
      .setCustomId('cancel_delete')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Confirm Deletion')
      .setColor(0xED4245)
      .setDescription(
        `Are you sure you want to **permanently delete** **${char.name}**?\n\n` +
        `**XP:** ${char.xp} | **Money:** $${parseFloat(char.money).toFixed(2)}\n\n` +
        `This action cannot be undone.`
      );

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });

    const collector = response.createMessageComponentCollector({ time: 30_000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== userId) {
        return btn.reply({ content: 'Only you can confirm this.', ephemeral: true });
      }

      if (btn.customId === 'confirm_delete') {
        deleteCharacter(guildId, userId, charName);
        await btn.update({
          embeds: [
            new EmbedBuilder()
              .setTitle('🗑️ Character Deleted')
              .setColor(0xED4245)
              .setDescription(`**${char.name}** has been permanently deleted.`),
          ],
          components: [],
        });
      } else {
        await btn.update({
          embeds: [
            new EmbedBuilder()
              .setTitle('❎ Deletion Cancelled')
              .setColor(0x57F287)
              .setDescription(`**${char.name}** was not deleted.`),
          ],
          components: [],
        });
      }

      collector.stop();
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await response.edit({ components: [] }).catch(() => {});
      }
    });
  },
};
