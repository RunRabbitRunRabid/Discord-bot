const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { PINK } = require('../constants');
const { getLeaderboardMsg, setLeaderboardMsg } = require('../database');
const { buildLeaderboard } = require('../utils/leaderboard');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Set the channel where the live leaderboard is posted')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o
      .setName('channel')
      .setDescription('Text channel to post the leaderboard in')
      .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    if (!channel.isTextBased()) {
      return interaction.editReply({
        embeds: [errorEmbed('Wrong Channel Type', `**${channel.name}** is not a text channel.\n\n**Try:** Select a standard text channel.`)],
      });
    }

    try {
      const existing = getLeaderboardMsg(guildId);
      if (existing) {
        try {
          const oldCh  = await interaction.guild.channels.fetch(existing.channel_id);
          const oldMsg = await oldCh.messages.fetch(existing.message_id);
          await oldMsg.delete();
        } catch { /* old message gone, that's fine */ }
      }

      const content = buildLeaderboard(interaction.guild);
      const msg     = await channel.send({ content });
      setLeaderboardMsg(guildId, channel.id, msg.id);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 Leaderboard Set')
            .setColor(PINK)
            .setDescription(`The live leaderboard is now in ${channel}. It updates every minute automatically.`)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/leaderboard]', err);
      await interaction.editReply({
        embeds: [errorEmbed(
          'Could Not Post Leaderboard',
          `The bot failed to send a message in **${channel.name}**.\n\n` +
          `**What may have happened:** The bot is missing Send Messages or View Channel permission in that channel.\n\n` +
          `**Try:** Check the bot's permissions in ${channel}, then run \`/leaderboard\` again.`
        )],
      });
    }
  },
};
