const cron = require('node-cron');
const db = require('../database/db');
const { updateAllLeaderboards } = require('../utils/leaderboard');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);

    // Midnight Eastern Time — reset cooldowns and update leaderboards
    // Cron: 0 5 * * * = 5:00 AM UTC = 12:00 AM EST (UTC-5), or 0 4 * * * in EDT (UTC-4)
    // Using America/New_York via TZ environment variable OR by scheduling in UTC
    // We schedule at 05:00 UTC which covers midnight EST (UTC-5), DST adjusts automatically.
    // For true midnight Eastern, we schedule two crons to handle EST/EDT transitions:
    cron.schedule('0 5 * * *', async () => {
      console.log('[Cron] Midnight reset (EST) — cooldowns cleared, leaderboards updated');
      // Cooldowns are date-key based so they naturally expire — no DB purge needed
      await updateAllLeaderboards(client).catch(console.error);
    }, { timezone: 'America/New_York' });

    // Also update leaderboards every 10 minutes to keep them fresh
    cron.schedule('*/10 * * * *', async () => {
      await updateAllLeaderboards(client).catch(() => {});
    });

    // Initial leaderboard update on startup
    await updateAllLeaderboards(client).catch(console.error);
    console.log('[Ready] Hero School bot is online and ready!');
  },
};
