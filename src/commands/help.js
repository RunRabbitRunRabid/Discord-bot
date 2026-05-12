const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PINK } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all Hero Academy bot commands'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌸 Hero Academy — Command Directory')
          .setColor(PINK)
          .setDescription('Daily activities reset at **midnight Ohio (Eastern) time**.')
          .addFields(
            {
              name: '🌸 Character Management',
              value: [
                '`/register` — Enroll a new character',
                '`/list` — View all your characters and daily status',
                '`/rename` — Give a character a new name',
                '`/delete` — Permanently remove a character',
              ].join('\n'),
            },
            {
              name: '🌸 Daily Activities (once per character per day)',
              value: [
                '`/class [character]` — Attend today\'s class *(+5 XP bonus if proficient)*',
                '`/study [character]` — Study for XP',
                '`/train [character]` — Train for XP',
                '`/afterschool [character]` — Club or work for XP and money',
              ].join('\n'),
            },
            {
              name: '🌸 Money',
              value: [
                '`/spend [character] [amount]` — Deduct money',
                '`/donate [character] [amount]` — Add money',
              ].join('\n'),
            },
            {
              name: '🌸 Leaderboards',
              value: '`/leaderboard [channel]` — Set the live leaderboard channel *(Manage Channels required)*',
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
          .setFooter({ text: 'Hero Academy · Cooldowns reset at midnight Ohio time' })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
