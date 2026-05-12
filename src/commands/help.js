const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all Hero Academy bot commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Hero Academy Bot — Commands')
      .setColor(0x5865F2)
      .addFields(
        {
          name: '🎓 Character Management',
          value: [
            '`/register` — Create a new character',
            '`/list` — View all your characters with stats',
            '`/rename` — Rename one of your characters',
            '`/delete` — Permanently delete a character',
          ].join('\n'),
        },
        {
          name: '📚 Daily Activities (once per character per day)',
          value: [
            '`/class [character]` — Attend today\'s class for XP (bonus if proficient)',
            '`/study [character]` — Study for XP',
            '`/train [character]` — Train for XP',
            '`/afterschool [character]` — After-school club or work for XP and money',
          ].join('\n'),
        },
        {
          name: '💰 Money',
          value: [
            '`/spend [character] [amount]` — Spend money',
            '`/donate [character] [amount]` — Receive a money donation',
          ].join('\n'),
        },
        {
          name: '🏆 Leaderboards',
          value: [
            '`/leaderboard [channel]` — Set a channel for the live leaderboard',
          ].join('\n'),
        },
        {
          name: '📅 Class Schedule (Ohio Eastern Time)',
          value: [
            'Monday → General Studies',
            'Tuesday → Training',
            'Wednesday → Search and Rescue',
            'Thursday → Front Line',
            'Friday → Support',
            'Saturday → Quirk Control',
            'Sunday → Field Training',
          ].join('\n'),
        }
      )
      .setFooter({ text: 'Daily cooldowns reset at midnight Ohio (Eastern) time.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
