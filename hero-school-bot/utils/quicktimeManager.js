'use strict';

const { EmbedBuilder } = require('discord.js');
const { randomUUID } = require('crypto');
const db = require('../database/db');
const { EVENTS, COOPERATIVE_EVENTS } = require('./quicktimeEvents');
const { DateTime } = require('luxon');
const { updateAllLeaderboards } = require('./leaderboard');

const TIMEZONE = 'America/New_York';
const POINTS_PER_EVENT = 5;

// Completion message templates for normal events
const SOLO_COMPLETIONS = [
  (name) => `**${name}** was so helpful and completed this task! (+${POINTS_PER_EVENT} Points)`,
  (name) => `**${name}** did an outstanding job handling this request! (+${POINTS_PER_EVENT} Points)`,
  (name) => `**${name}** stepped up without hesitation and got the job done! (+${POINTS_PER_EVENT} Points)`,
  (name) => `**${name}** answered the call and everyone appreciated the help! (+${POINTS_PER_EVENT} Points)`,
  (name) => `**${name}** came through when it mattered most! (+${POINTS_PER_EVENT} Points)`,
  (name) => `**${name}** handled this with total professionalism! (+${POINTS_PER_EVENT} Points)`,
];

// Completion message templates for cooperative events
const COOP_COMPLETIONS = [
  (names) => `**${names}** worked together flawlessly during this assignment! Everyone earned +${POINTS_PER_EVENT} Points!`,
  (names) => `**${names}** showed incredible teamwork and got it done! Everyone earned +${POINTS_PER_EVENT} Points!`,
  (names) => `**${names}** stepped up as a unit and crushed this challenge! Everyone earned +${POINTS_PER_EVENT} Points!`,
  (names) => `**${names}** proved that heroes are stronger together! Everyone earned +${POINTS_PER_EVENT} Points!`,
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Scheduling helpers ───────────────────────────────────────────────────────

/**
 * Returns 1 or 3 — weighted heavily toward 1 (roughly 70/30).
 */
function getRandomEventCount() {
  return Math.random() < 0.7 ? 1 : 3;
}

/**
 * Returns `count` unique random times (in minutes from midnight ET) spread
 * across the active window: 8 AM – 10 PM ET.
 */
function getRandomEventTimes(count) {
  const START_MINUTE = 8 * 60;   // 8:00 AM
  const END_MINUTE   = 22 * 60;  // 10:00 PM
  const WINDOW = END_MINUTE - START_MINUTE;

  const times = new Set();
  while (times.size < count) {
    // Round to nearest 5-minute mark so events land on clean times
    const raw = START_MINUTE + Math.floor(Math.random() * WINDOW);
    times.add(Math.round(raw / 5) * 5);
  }
  return Array.from(times).sort((a, b) => a - b);
}

/**
 * Picks a random event from the appropriate pool.
 * Cooperative events are rare (~7% chance).
 */
function selectRandomEvent() {
  const isCooperative = Math.random() < 0.07;
  if (isCooperative) {
    const template = randomItem(COOPERATIVE_EVENTS);
    const participantsNeeded = Math.floor(Math.random() * 4) + 2; // 2–5
    return { ...template, participantsNeeded, cooperative: true };
  }
  return { ...randomItem(EVENTS), participantsNeeded: 1, cooperative: false };
}

// ─── Active event tracking (in-memory, per guild) ────────────────────────────
// Maps guildId → eventId of the currently active event (if any)
const activeEvents = new Map();

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Posts a new QuickTime event embed to the configured channel.
 * Returns the eventId on success, null if no channel is configured.
 */
async function createEvent(client, guildId, eventTemplate) {
  const config = db.prepare('SELECT channel_id FROM quicktime_config WHERE guild_id = ?').get(guildId);
  if (!config) return null;

  // Only one active event at a time per guild
  const existing = db.prepare(
    'SELECT event_id FROM quicktime_events WHERE guild_id = ? AND is_active = 1'
  ).get(guildId);
  if (existing) {
    console.log(`[QuickTime] Guild ${guildId} already has an active event — skipping.`);
    return null;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;

  const channel = guild.channels.cache.get(config.channel_id);
  if (!channel) return null;

  const eventId = randomUUID();
  const { emoji, title, description, cooperative, participantsNeeded } = eventTemplate;

  // Persist to DB
  db.prepare(`
    INSERT INTO quicktime_events (guild_id, event_id, title, description, emoji, is_cooperative, participants_needed, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(guildId, eventId, title, description, emoji ?? '⚡', cooperative ? 1 : 0, participantsNeeded);

  const embed = buildEventEmbed({ eventId, emoji, title, description, cooperative, participantsNeeded, participants: [] });

  try {
    const msg = await channel.send({ embeds: [embed] });
    // Store message id so we can edit it later
    db.prepare('UPDATE quicktime_events SET message_id = ? WHERE event_id = ?').run(msg.id, eventId);
    activeEvents.set(guildId, eventId);
    console.log(`[QuickTime] Posted event "${title}" (${eventId}) in guild ${guildId}`);
    return eventId;
  } catch (err) {
    console.error(`[QuickTime] Failed to post event in guild ${guildId}:`, err.message);
    // Clean up DB row if message failed
    db.prepare('DELETE FROM quicktime_events WHERE event_id = ?').run(eventId);
    return null;
  }
}

/**
 * Builds the embed for an active event.
 */
function buildEventEmbed({ eventId, emoji, title, description, cooperative, participantsNeeded, participants }) {
  const spotsLeft = participantsNeeded - participants.length;
  const participantList = participants.length
    ? participants.map(p => `• ${p.character_name}`).join('\n')
    : '*No one yet — be the first!*';

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} QuickTime Event — ${title}`)
    .setColor(0xffd700)
    .setDescription(description)
    .addFields(
      cooperative
        ? [
            { name: '👥 Participants', value: participantList, inline: false },
            { name: '🎯 Spots Needed', value: `${spotsLeft} more needed (${participants.length}/${participantsNeeded})`, inline: true },
          ]
        : [
            { name: '🎯 Status', value: '*Unclaimed — use `/event` to claim it!*', inline: false },
          ]
    )
    .setFooter({ text: cooperative ? 'Use /event <character> to join!' : 'Use /event <character> to claim this event!' })
    .setTimestamp();

  return embed;
}

/**
 * Builds the embed for a completed event.
 */
function buildCompletedEmbed({ emoji, title, description, cooperative, participants }) {
  const names = participants.map(p => p.character_name).join(', ');
  const completionMsg = cooperative
    ? randomItem(COOP_COMPLETIONS)(names)
    : randomItem(SOLO_COMPLETIONS)(participants[0].character_name);

  return new EmbedBuilder()
    .setTitle(`${emoji} Event Complete — ${title}`)
    .setColor(0x57f287)
    .setDescription(description)
    .addFields({ name: '✅ Result', value: completionMsg, inline: false })
    .setFooter({ text: 'Hero School Academy' })
    .setTimestamp();
}

/**
 * Marks an event complete, awards points, and edits the original message.
 */
async function completeEvent(client, guildId, eventId, participants) {
  const row = db.prepare('SELECT * FROM quicktime_events WHERE event_id = ?').get(eventId);
  if (!row) return;

  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE quicktime_events SET is_active = 0, completed_at = ? WHERE event_id = ?').run(now, eventId);

  // Award points to each participant
  for (const p of participants) {
    db.prepare(`
      INSERT INTO quicktime_points (guild_id, user_id, character_id, character_name, points)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id, character_id) DO UPDATE SET points = points + excluded.points
    `).run(guildId, p.user_id, p.character_id, p.character_name, POINTS_PER_EVENT);
  }

  activeEvents.delete(guildId);

  // Update leaderboards after awarding points
  await updateAllLeaderboards(client).catch(err =>
    console.error('[QuickTime] Failed to update leaderboards after event completion:', err.message)
  );

  // Edit the original message if we can
  const config = db.prepare('SELECT channel_id FROM quicktime_config WHERE guild_id = ?').get(guildId);
  if (!config) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(config.channel_id);
  if (!channel) return;

  if (row.message_id) {
    try {
      const msg = await channel.messages.fetch(row.message_id).catch(() => null);
      if (msg) {
        const completedEmbed = buildCompletedEmbed({
          emoji: row.emoji,
          title: row.title,
          description: row.description,
          cooperative: row.is_cooperative === 1,
          participants,
        });
        await msg.edit({ embeds: [completedEmbed] });
      }
    } catch (err) {
      console.error(`[QuickTime] Failed to edit completion message for event ${eventId}:`, err.message);
    }
  }
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

// Maps guildId → array of setTimeout handles for today's scheduled events
const scheduledTimers = new Map();

/**
 * Cancels any pending timers for a guild and schedules fresh events for today.
 */
async function scheduleEventsForDay(client, guildId) {
  // Cancel existing timers
  const existing = scheduledTimers.get(guildId) ?? [];
  for (const t of existing) clearTimeout(t);
  scheduledTimers.set(guildId, []);

  const count = getRandomEventCount();
  const minuteTimes = getRandomEventTimes(count);

  const now = DateTime.now().setZone(TIMEZONE);
  const timers = [];

  for (const minuteOfDay of minuteTimes) {
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;

    const eventTime = now.set({ hour, minute, second: 0, millisecond: 0 });
    const msUntil = eventTime.toMillis() - now.toMillis();

    if (msUntil <= 0) {
      // Time already passed today — skip
      continue;
    }

    const eventTemplate = selectRandomEvent();
    const label = eventTime.toFormat('h:mm a ZZZZ');
    console.log(`[QuickTime] Guild ${guildId} — scheduling "${eventTemplate.title}" at ${label} (in ${Math.round(msUntil / 60000)} min)`);

    const timer = setTimeout(async () => {
      await createEvent(client, guildId, eventTemplate).catch(console.error);
    }, msUntil);

    timers.push(timer);
  }

  scheduledTimers.set(guildId, timers);
  console.log(`[QuickTime] Guild ${guildId} — ${timers.length} event(s) scheduled for today.`);
}

/**
 * Schedules events for every guild that has a quicktime_config row.
 */
async function scheduleAllGuilds(client) {
  const rows = db.prepare('SELECT guild_id FROM quicktime_config').all();
  for (const row of rows) {
    await scheduleEventsForDay(client, row.guild_id).catch(console.error);
  }
}

module.exports = {
  getRandomEventCount,
  getRandomEventTimes,
  selectRandomEvent,
  createEvent,
  completeEvent,
  scheduleEventsForDay,
  scheduleAllGuilds,
  buildEventEmbed,
  activeEvents,
  POINTS_PER_EVENT,
};
