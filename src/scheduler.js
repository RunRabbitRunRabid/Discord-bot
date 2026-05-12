const cron = require('node-cron');
const { resetAllCooldowns, getLeaderboardMsg } = require('./database');
const { buildLeaderboard } = require('./utils/leaderboard');

let client = null;

function startScheduler(discordClient) {
  client = discordClient;

  // Reset all daily cooldowns at midnight Ohio time
  cron.schedule('0 0 * * *', () => {
    console.log('[Scheduler] Midnight Ohio — resetting all cooldowns.');
    resetAllCooldowns();
  }, { timezone: 'America/New_York' });

  // Refresh leaderboard every minute
  cron.schedule('* * * * *', async () => {
    if (!client) return;
    for (const guild of client.guilds.cache.values()) {
      const record = getLeaderboardMsg(guild.id);
      if (!record) continue;
      try {
        const ch  = await guild.channels.fetch(record.channel_id);
        if (!ch || !ch.isTextBased()) continue;
        const msg = await ch.messages.fetch(record.message_id);
        await msg.edit({ content: buildLeaderboard(guild) });
      } catch (err) {
        console.error(`[Scheduler] Leaderboard update failed for guild ${guild.id}:`, err.message);
      }
    }
  });

  console.log('[Scheduler] Running — cooldowns reset at midnight Ohio time, leaderboard refreshes every minute.');
}

module.exports = { startScheduler };
