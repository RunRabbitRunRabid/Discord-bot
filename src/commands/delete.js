const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { PINK } = require('../constants');
const { getChar, deleteChar } = require('../database');
const { formatMoney } = require('../utils/random');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Permanently remove one of your characters')
    .addStringOption(o => o
      .setName('character')
      .setDescription('Character name to delete')
      .setRequired(true)
    ),

  async execute(interaction) {
    const guildId  = interaction.guildId;
    const userId   = interaction.user.id;
    const charName = interaction.options.getString('character').trim();

    let char;
    try { char = getChar(guildId, userId, charName); }
    catch (err) {
      console.error('[/delete]', err);
      return interaction.reply({ embeds: [errorEmbed('Database Error', `Could not look up **${charName}**. Try again in a moment.`)], ephemeral: true });
    }

    if (!char) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Not Found',
          `No character named **${charName}** was found on your account in this server.\n\n` +
          `**Try:**\n— Check the spelling (names are exact, spaces included)\n— Use \`/list\` to see your characters`
        )],
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_delete').setLabel('Yes, delete permanently').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_delete').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const response = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌸 Confirm Deletion')
          .setColor(PINK)
          .setDescription(
            `You are about to **permanently delete** **${char.name}**.\n\n` +
            `> **XP:** ${char.xp}   ·   **Funds:** ${formatMoney(char.money)}\n\n` +
            `This cannot be undone.`
          )
          .setFooter({ text: 'This prompt expires in 30 seconds.' }),
      ],
      components: [row],
      ephemeral: true,
    });

    const collector = response.createMessageComponentCollector({ time: 30_000 });

    collector.on('collect', async btn => {
      if (btn.user.id !== userId) {
        return btn.reply({ embeds: [errorEmbed('Not Your Prompt', 'Only the person who ran this command can confirm the deletion.')], ephemeral: true });
      }

      if (btn.customId === 'confirm_delete') {
        try {
          deleteChar(guildId, userId, charName);
          await btn.update({
            embeds: [new EmbedBuilder().setTitle('🌸 Character Deleted').setColor(PINK).setDescription(`**${char.name}** has been permanently removed.`).setTimestamp()],
            components: [],
          });
        } catch (err) {
          console.error('[/delete confirm]', err);
          await btn.update({
            embeds: [errorEmbed('Deletion Failed', `**${char.name}** could not be deleted.\n\n**Try:** Run \`/delete\` again.`)],
            components: [],
          });
        }
      } else {
        await btn.update({
          embeds: [new EmbedBuilder().setTitle('🌸 Cancelled').setColor(PINK).setDescription(`**${char.name}** was not deleted.`).setTimestamp()],
          components: [],
        });
      }
      collector.stop();
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await response.edit({
          embeds: [errorEmbed('Prompt Expired', `The deletion prompt timed out.\n\n**Try:** Run \`/delete\` again if you still want to remove **${char.name}**.`)],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
