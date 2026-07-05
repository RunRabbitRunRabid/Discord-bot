const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { scheduleEventsForDay } = require('../utils/quicktimeManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quicktime')
    .setDescription('(Admin) Set the channel where QuickTime events will be posted')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('The channel to post QuickTime events in')
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    // Upsert the config row
    db.prepare(`
      INSERT INTO quicktime_config (guild_id, channel_id)
      VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id
    `).run(guildId, channel.id);

    // Reschedule events for today using the new channel
    await scheduleEventsForDay(interaction.client, guildId).catch(console.error);

    const embed = new EmbedBuilder()
      .setTitle('⚡ QuickTime Events Configured')
      .setColor(0xffd700)
      .setDescription(`QuickTime events will now be posted in ${channel}.\n\nEvents are scheduled automatically throughout the day (1–3 per day, between 8 AM and 10 PM ET). Today's schedule has been refreshed.`)
      .setFooter({ text: 'Hero School Academy' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
