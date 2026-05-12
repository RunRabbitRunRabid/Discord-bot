const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setLeaderboardMessage, getLeaderboardMessage } = require('../database');
const { buildLeaderboardContent } = require('../utils/leaderboard');

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
    .setName('leaderboard')
    .setDescription('Set the channel where the live leaderboard is posted')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to post the leaderboard in')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    if (!channel.isTextBased()) {
      return interaction.editReply({
        embeds: [errorEmbed(
          'Wrong Channel Type',
          `**${channel.name}** is not a text channel and cannot receive messages.\n\n` +
          `**Try:** Select a standard text channel from the list.`
        )],
      });
    }

    let content;
    try {
      content = buildLeaderboardContent(interaction.guild);
    } catch (err) {
      console.error('[/leaderboard build]', err);
      return interaction.editReply({
        embeds: [errorEmbed(
          'Could Not Build Leaderboard',
          `Something went wrong while generating the leaderboard content.\n\n` +
          `**Try:** Run \`/leaderboard\` again. If it keeps failing, contact a server admin.`
        )],
      });
    }

    try {
      const existing = getLeaderboardMessage(guildId);
      if (existing) {
        try {
          const oldChannel = await interaction.guild.channels.fetch(existing.channel_id);
          const oldMessage = await oldChannel.messages.fetch(existing.message_id);
          await oldMessage.delete();
        } catch {
        }
      }

      const msg = await channel.send({ content });
      setLeaderboardMessage(guildId, channel.id, msg.id);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 Leaderboard Set')
            .setColor(PINK)
            .setDescription(`The live leaderboard is now posted in ${channel} and will update every minute automatically.`)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/leaderboard post]', err);
      await interaction.editReply({
        embeds: [errorEmbed(
          'Could Not Post Leaderboard',
          `The bot failed to send a message in **${channel.name}**.\n\n` +
          `**What may have happened:** The bot is missing the **Send Messages** or **View Channel** permission in that channel.\n\n` +
          `**Try:** Check the bot's permissions in ${channel}, then run \`/leaderboard\` again.`
        )],
      });
    }
  },
};
