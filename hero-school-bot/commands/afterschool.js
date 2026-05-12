const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { getTodayKey } = require('../utils/time');
const { updateAllLeaderboards } = require('../utils/leaderboard');

function randomXP(min = 5, max = 20) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMoney(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

const CLUB_FLAVOR = [
  'spent the afternoon with their club — laughing, bonding, and growing stronger together.',
  "attended the club meeting and wouldn't have missed it for the world. Great vibes all around.",
  'helped organize today\'s club event. The team spirit was absolutely contagious!',
  'had a productive club afternoon full of snacks, strategy, and good company.',
  'made some new friends at club today. Social skills: leveling up. 🌸',
];

const WORK_FLAVOR = [
  'clocked out after a solid shift. Another day, another paycheck.',
  'finished their shift and pocketed some well-earned cash. Hard work pays off.',
  'handled every task without complaint. The manager definitely noticed.',
  'powered through a busy shift. The wallet is looking a lot healthier now.',
  'picked up an extra task at work today. The extra effort shows on the balance sheet.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afterschool')
    .setDescription('Do your after-school activity and earn XP and money')
    .addStringOption(opt =>
      opt.setName('character').setDescription("Your character's name").setRequired(true)
    ),

  async execute(interaction) {
    const charName = interaction.options.getString('character').trim();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
    ).get(guildId, charName);

    if (!character) {
      return interaction.reply({ content: `🌸 No character named **${charName}** found in this server.` });
    }
    if (character.user_id !== userId) {
      return interaction.reply({ content: `🌸 **${charName}** doesn't belong to you.` });
    }

    const todayKey = getTodayKey();
    const used = db.prepare(
      'SELECT id FROM cooldowns WHERE guild_id = ? AND character_id = ? AND command = ? AND used_on = ?'
    ).get(guildId, character.id, 'afterschool', todayKey);

    if (used) {
      return interaction.reply({ content: 'Hey now! You already did that today. You can try again tomorrow 🌸' });
    }

    const isWork = character.afterschool === 'work';
    const earnedXP = randomXP();
    const earnedMoney = isWork ? randomMoney(8, 20) : randomMoney(2, 8);

    db.prepare('UPDATE characters SET xp = xp + ?, money = money + ? WHERE id = ?').run(earnedXP, earnedMoney, character.id);
    db.prepare(
      'INSERT INTO cooldowns (guild_id, character_id, command, used_on) VALUES (?, ?, ?, ?)'
    ).run(guildId, character.id, 'afterschool', todayKey);

    const flavorPool = isWork ? WORK_FLAVOR : CLUB_FLAVOR;
    const flavorText = `**${charName}** ${flavorPool[Math.floor(Math.random() * flavorPool.length)]}`;
    const activityLabel = isWork ? '🌸 Work' : '🌸 Club';

    const embed = new EmbedBuilder()
      .setTitle(`After-School — ${activityLabel}`)
      .setColor(0xff9ec8)
      .setDescription(flavorText)
      .addFields(
        { name: 'XP Earned', value: `+${earnedXP}`, inline: true },
        { name: 'Money Earned', value: `+$${earnedMoney.toFixed(2)}`, inline: true },
        { name: 'Total XP', value: `${character.xp + earnedXP}`, inline: true },
        { name: 'Total Money', value: `$${(character.money + earnedMoney).toFixed(2)}`, inline: true },
      )
      .setFooter({ text: 'Hero School Academy' });

    await interaction.reply({ embeds: [embed] });
    await updateAllLeaderboards(interaction.client).catch(() => {});
  },
};
