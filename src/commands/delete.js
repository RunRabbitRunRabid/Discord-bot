const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getCharacter, deleteCharacter } = require('../database');

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
    .setName('delete')
    .setDescription('Permanently remove one of your characters')
    .addStringOption(opt =>
      opt.setName('character')
        .setDescription('Character name to delete')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const charName = interaction.options.getString('character').trim();

    let char;
    try {
      char = getCharacter(guildId, userId, charName);
    } catch (err) {
      console.error('[/delete]', err);
      return interaction.reply({
        embeds: [errorEmbed(
          'Database Error',
          `Something went wrong while looking up **${charName}**.\n\n` +
          `**Try:** Run the command again in a moment.`
        )],
        ephemeral: true,
      });
    }

    if (!char) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Not Found',
          `No character named **${charName}** was found under your account in this server.\n\n` +
          `**Try:**\n` +
          `— Check the spelling (names are exact, including spaces)\n` +
          `— Use \`/list\` to see all your characters and their exact names`
        )],
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
      .setTitle('🌸 Confirm Deletion')
      .setColor(PINK)
      .setDescription(
        `You are about to **permanently delete** **${char.name}**.\n\n` +
        `> **XP:** ${char.xp}  ·  **Funds:** $${parseFloat(char.money).toFixed(2)}\n\n` +
        `This cannot be undone. Are you sure?`
      )
      .setFooter({ text: 'This prompt expires in 30 seconds.' });

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });

    const collector = response.createMessageComponentCollector({ time: 30_000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== userId) {
        return btn.reply({
          embeds: [errorEmbed('Not Your Prompt', 'Only the person who ran this command can confirm the deletion.')],
          ephemeral: true,
        });
      }

      if (btn.customId === 'confirm_delete') {
        try {
          deleteCharacter(guildId, userId, charName);
          await btn.update({
            embeds: [
              new EmbedBuilder()
                .setTitle('🌸 Character Deleted')
                .setColor(PINK)
                .setDescription(`**${char.name}** has been permanently removed from the academy.`)
                .setTimestamp(),
            ],
            components: [],
          });
        } catch (err) {
          console.error('[/delete confirm]', err);
          await btn.update({
            embeds: [errorEmbed(
              'Deletion Failed',
              `**${char.name}** could not be deleted due to a database error.\n\n` +
              `**Try:** Run \`/delete\` again. The character has not been removed.`
            )],
            components: [],
          });
        }
      } else {
        await btn.update({
          embeds: [
            new EmbedBuilder()
              .setTitle('🌸 Deletion Cancelled')
              .setColor(PINK)
              .setDescription(`**${char.name}** remains enrolled. No changes were made.`)
              .setTimestamp(),
          ],
          components: [],
        });
      }

      collector.stop();
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await response.edit({
          embeds: [errorEmbed(
            'Prompt Expired',
            `The deletion prompt for **${char.name}** timed out after 30 seconds.\n\n` +
            `**Try:** Run \`/delete\` again if you still want to remove this character.`
          )],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
