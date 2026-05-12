const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTodayClass, getTodayDayName, getFormattedTime } = require('../utils/time');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all Hero School commands and how to use them'),

  async execute(interaction) {
    const todayClass = getTodayClass();
    const todayDay = getTodayDayName();
    const currentTime = getFormattedTime();

    const embed = new EmbedBuilder()
      .setTitle('🌸 Hero School — Command Guide')
      .setColor(0xff9ec8)
      .setDescription(
        `Welcome to **Hero School Academy**! Use these commands to build your character, earn XP, and climb the leaderboard.\n\n` +
        `📅 Today is **${todayDay}** — class is **${todayClass}**\n🕐 ${currentTime}`
      )
      .addFields(
        {
          name: '🌸 Character Management',
          value: [
            '`/create` — Create a new character. Choose a name, two proficiency classes, an after-school activity (club or work), and starting money.',
            '`/list` — View all your characters in this server: XP, money, proficiencies, and today\'s activity status.',
            '`/rename [character] [new name]` — Rename one of your characters.',
            '`/delete [character]` — Permanently delete a character (requires confirmation).',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚡ Daily Activities  *(once per character per day)*',
          value: [
            '`/class [character]` — Attend today\'s scheduled class and earn **5–20 XP**. Earn a **+5 bonus** if the class matches one of your proficiencies.',
            '`/study [character]` — Hit the books for **5–20 XP**.',
            '`/train [character]` — Push through a training session for **5–20 XP**.',
            '`/afterschool [character]` — Do your after-school activity for **5–20 XP** plus money. Club earns less money; Work earns more.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '💰 Money',
          value: [
            '`/spend [character] [amount]` — Remove money from your wallet.',
            '`/donate [character] [amount]` — Add money to a character\'s wallet *(admin/mod only)*.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📋 Leaderboard',
          value: [
            '`/leaderboard [channel]` — Set a channel for the live leaderboard. The bot posts one message and edits it continuously — no spam *(requires Manage Channels)*.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📅 Class Schedule',
          value: [
            '`Monday` → General Studies',
            '`Tuesday` → Training',
            '`Wednesday` → Search and Rescue',
            '`Thursday` → Front Line',
            '`Friday` → Support',
            '`Saturday` → Power Control',
            '`Sunday` → Field Training',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🌸 Tips',
          value: [
            '• You can have multiple characters per server — each tracks cooldowns independently.',
            '• Daily cooldowns reset at **midnight US Eastern Time**.',
            '• Proficiency bonuses apply when today\'s class matches your character\'s subject1 or subject2.',
            '• All data is server-specific — characters don\'t carry over between servers.',
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: 'Hero School Academy 🌸 • All times in US Eastern' });

    await interaction.reply({ embeds: [embed] });
  },
};
