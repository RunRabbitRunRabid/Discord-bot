const cron = require('node-cron');
const { resetAllCooldownsGlobal, getAllGuildIds, getLeaderboardMessage } = require('./database');
const { buildLeaderboardContent } = require('./utils/leaderboard');

let client = null;

function startScheduler(discordClient) {
  client = discordClient;

  cron.schedule('0 0 * * *', () => {
    console.log('[Scheduler] Midnight Ohio time — resetting all daily cooldowns.');
    resetAllCooldownsGlobal();
  }, {
    timezone: 'America/New_York',
  });

  cron.schedule('* * * * *', async () => {
    if (!client) return;
    await updateAllLeaderboards();
  });

  console.log('[Scheduler] Started — daily reset at midnight Ohio time, leaderboard refresh every minute.');
}

async function updateAllLeaderboards() {
  if (!client) return;

  const guilds = client.guilds.cache.values();

  for (const guild of guilds) {
    const record = getLeaderboardMessage(guild.id);
    if (!record) continue;

    try {
      const channel = await guild.channels.fetch(record.channel_id);
      if (!channel || !channel.isTextBased()) continue;

      const message = await channel.messages.fetch(record.message_id);
      if (!message) continue;

      const content = buildLeaderboardContent(guild);
      await message.edit({ content });
    } catch (err) {
      console.error(`[Scheduler] Failed to update leaderboard for guild ${guild.id}:`, err.message);
    }
  }
}

module.exports = { startScheduler, updateAllLeaderboards };
