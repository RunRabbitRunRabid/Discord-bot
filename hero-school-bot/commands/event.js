const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { completeEvent, buildEventEmbed } = require('../utils/quicktimeManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Claim or join the active QuickTime event with your character')
    .addStringOption(opt =>
      opt
        .setName('character')
        .setDescription('Your character\'s name')
        .setRequired(true)
    ),

  async execute(interaction) {
    const charName = interaction.options.getString('character').trim();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // ── Validate character ────────────────────────────────────────────────────
    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ? AND is_npc = 0'
    ).get(guildId, charName);

    if (!character) {
      return interaction.reply({
        content: `🌸 No character named **${charName}** found in this server.`,
        ephemeral: true,
      });
    }

    if (character.user_id !== userId) {
      return interaction.reply({
        content: `🌸 **${charName}** doesn't belong to you.`,
        ephemeral: true,
      });
    }

    // ── Find the active event ─────────────────────────────────────────────────
    const event = db.prepare(
      'SELECT * FROM quicktime_events WHERE guild_id = ? AND is_active = 1'
    ).get(guildId);

    if (!event) {
      return interaction.reply({
        content: '⚡ There is no active QuickTime event right now. Keep an eye out — they pop up throughout the day!',
        ephemeral: true,
      });
    }

    // ── Check if this character already joined ────────────────────────────────
    const alreadyIn = db.prepare(
      'SELECT id FROM quicktime_participants WHERE event_id = ? AND character_id = ?'
    ).get(event.event_id, character.id);

    if (alreadyIn) {
      return interaction.reply({
        content: `🌸 **${charName}** has already joined this event!`,
        ephemeral: true,
      });
    }

    // ── For solo events: first come, first served ─────────────────────────────
    if (!event.is_cooperative) {
      const taken = db.prepare(
        'SELECT id FROM quicktime_participants WHERE event_id = ?'
      ).get(event.event_id);

      if (taken) {
        return interaction.reply({
          content: '⚡ This event has already been claimed by another character. Better luck next time!',
          ephemeral: true,
        });
      }
    }

    // ── For cooperative events: check if full ─────────────────────────────────
    if (event.is_cooperative) {
      const currentCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM quicktime_participants WHERE event_id = ?'
      ).get(event.event_id).cnt;

      if (currentCount >= event.participants_needed) {
        return interaction.reply({
          content: '⚡ This cooperative event is already full! Better luck next time.',
          ephemeral: true,
        });
      }
    }

    // ── Add participant ───────────────────────────────────────────────────────
    db.prepare(`
      INSERT INTO quicktime_participants (event_id, character_id, character_name)
      VALUES (?, ?, ?)
    `).run(event.event_id, character.id, character.name);

    // Fetch updated participant list
    const participants = db.prepare(
      'SELECT qp.*, c.user_id FROM quicktime_participants qp JOIN characters c ON c.id = qp.character_id WHERE qp.event_id = ?'
    ).all(event.event_id);

    await interaction.deferReply({ ephemeral: true });

    // ── Check if event is now complete ────────────────────────────────────────
    const isComplete = !event.is_cooperative || participants.length >= event.participants_needed;

    if (isComplete) {
      // Complete the event — awards points and edits the original message
      await completeEvent(interaction.client, guildId, event.event_id, participants);

      return interaction.editReply({
        content: event.is_cooperative
          ? `✅ **${charName}** joined the event and the team is complete! Everyone earns **+5 Points**!`
          : `✅ **${charName}** claimed the event and earned **+5 Points**!`,
      });
    }

    // ── Cooperative event still needs more participants — update the embed ────
    const config = db.prepare('SELECT channel_id FROM quicktime_config WHERE guild_id = ?').get(guildId);
    if (config && event.message_id) {
      try {
        const guild = interaction.guild;
        const channel = guild.channels.cache.get(config.channel_id);
        if (channel) {
          const msg = await channel.messages.fetch(event.message_id).catch(() => null);
          if (msg) {
            const updatedEmbed = buildEventEmbed({
              eventId: event.event_id,
              emoji: event.emoji,
              title: event.title,
              description: event.description,
              cooperative: true,
              participantsNeeded: event.participants_needed,
              participants,
            });
            await msg.edit({ embeds: [updatedEmbed] });
          }
        }
      } catch (err) {
        console.error('[Event] Failed to update cooperative event embed:', err.message);
      }
    }

    const spotsLeft = event.participants_needed - participants.length;
    return interaction.editReply({
      content: `✅ **${charName}** joined the cooperative event! **${spotsLeft}** more participant(s) needed.`,
    });
  },
};
