const cron = require('node-cron');
const { updateAllLeaderboards } = require('../utils/leaderboard');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);

    // Midnight Eastern Time — reset cooldowns and update leaderboards.
    // node-cron's timezone option handles EST/EDT automatically — no manual UTC offset needed.
    // Cooldowns are date-key based (YYYY-MM-DD in ET) so they expire naturally; no DB purge required.
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Midnight ET reset — leaderboards updated');
      await updateAllLeaderboards(client).catch(console.error);
    }, { timezone: 'America/New_York' });

    // Update leaderboards every 60 seconds for live time and immediate character changes
    setInterval(async () => {
      await updateAllLeaderboards(client).catch(() => {});
    }, 60000);

    // Initial leaderboard update on startup
    await updateAllLeaderboards(client).catch(console.error);
    console.log('[Ready] Hero School bot is online and ready!');
  },
};
