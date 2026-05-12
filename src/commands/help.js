const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const PINK = 0xFFB7C5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all Hero Academy bot commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🌸 Hero Academy — Command Directory')
      .setColor(PINK)
      .setDescription('Welcome! Below is everything you can do. Daily activities reset at **midnight Ohio (Eastern) time**.')
      .addFields(
        {
          name: '🌸 Character Management',
          value: [
            '`/register` — Enroll a new character into the academy',
            '`/list` — View all your characters and their daily status',
            '`/rename` — Give a character a new name',
            '`/delete` — Permanently remove a character',
          ].join('\n'),
        },
        {
          name: '🌸 Daily Activities',
          value: [
            'Each action has its own **once-per-day** cooldown per character.',
            '`/class [character]` — Attend today\'s class *(+5 XP bonus if proficient)*',
            '`/study [character]` — Study for XP',
            '`/train [character]` — Train for XP',
            '`/afterschool [character]` — Club or work for XP and money',
          ].join('\n'),
        },
        {
          name: '🌸 Money',
          value: [
            '`/spend [character] [amount]` — Deduct money from a character',
            '`/donate [character] [amount]` — Add money to a character',
          ].join('\n'),
        },
        {
          name: '🌸 Leaderboards',
          value: '`/leaderboard [channel]` — Set a channel for the live leaderboard *(requires Manage Channels)*',
        },
        {
          name: '🌸 Class Schedule (Ohio Time)',
          value: [
            '`Monday` → General Studies',
            '`Tuesday` → Training',
            '`Wednesday` → Search and Rescue',
            '`Thursday` → Front Line',
            '`Friday` → Support',
            '`Saturday` → Quirk Control',
            '`Sunday` → Field Training',
          ].join('\n'),
        },
      )
      .setFooter({ text: 'Hero Academy Bot · Daily cooldowns reset at midnight Ohio time' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
