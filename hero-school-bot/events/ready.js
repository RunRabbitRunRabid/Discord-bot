const cron = require('node-cron');
const { updateAllLeaderboards } = require('../utils/leaderboard');
const { performWeeklyReset } = require('../utils/weeklyReset');
const { performNPCDailyRolls } = require('../utils/npcRolls');

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

    // Monday at midnight ET — weekly XP reset. Top 3 receive a 10 XP head start.
    // Runs after the daily cron so leaderboards reflect the fresh state.
    cron.schedule('0 0 * * 1', async () => {
      console.log('[Cron] Weekly reset — Monday midnight ET');
      await performWeeklyReset(client).catch(console.error);
      await updateAllLeaderboards(client).catch(console.error);
    }, { timezone: 'America/New_York' });

    // 6 AM ET daily — simulate all four activities for every registered NPC.
    // NPCs earn XP from /class (with proficiency), /study, /train, and
    // /afterschool (XP + money), scaled by their quality tier.
    cron.schedule('0 6 * * *', async () => {
      console.log('[Cron] 6 AM ET — running NPC daily rolls');
      await performNPCDailyRolls().catch(console.error);
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
