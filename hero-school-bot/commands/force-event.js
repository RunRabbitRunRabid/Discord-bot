'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { selectRandomEvent, createEvent, activeEvents } = require('../utils/quicktimeManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('force-event')
    .setDescription('(Admin) Immediately trigger a QuickTime event, bypassing the daily schedule')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const guildId = interaction.guildId;

    // ── Verify a QuickTime channel is configured ──────────────────────────────
    const config = db.prepare('SELECT channel_id FROM quicktime_config WHERE guild_id = ?').get(guildId);
    if (!config) {
      return interaction.reply({
        content: '⚠️ No QuickTime channel has been configured. Use `/quicktime` to set one first.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // ── Deactivate any existing active event ──────────────────────────────────
    const existing = db.prepare(
      'SELECT event_id FROM quicktime_events WHERE guild_id = ? AND is_active = 1'
    ).get(guildId);

    if (existing) {
      const now = Math.floor(Date.now() / 1000);
      db.prepare(
        'UPDATE quicktime_events SET is_active = 0, completed_at = ? WHERE event_id = ?'
      ).run(now, existing.event_id);
      activeEvents.delete(guildId);
      console.log(`[ForceEvent] Deactivated existing event ${existing.event_id} in guild ${guildId}`);
    }

    // ── Select and post a random event ────────────────────────────────────────
    const eventTemplate = selectRandomEvent();
    const eventId = await createEvent(interaction.client, guildId, eventTemplate);

    if (!eventId) {
      return interaction.editReply({
        content: '❌ Failed to post the event. Make sure the configured QuickTime channel is accessible.',
      });
    }

    console.log(`[ForceEvent] Admin ${interaction.user.tag} force-triggered event "${eventTemplate.title}" in guild ${guildId}`);

    return interaction.editReply({
      content: `✅ **QuickTime Event Triggered!**\n${eventTemplate.emoji} **${eventTemplate.title}**\n${eventTemplate.description}`,
    });
  },
};
