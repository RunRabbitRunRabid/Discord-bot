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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afterschool')
    .setDescription('Do your after-school activity and earn XP and money')
    .addStringOption(opt =>
      opt.setName('character').setDescription('Your character\'s name').setRequired(true)
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
      return interaction.reply({ content: `🌸 **${charName}** has already done their after-school activity today!` });
    }

    const isWork = character.afterschool === 'work';
    const earnedXP = randomXP();
    const earnedMoney = isWork ? randomMoney(8, 20) : randomMoney(2, 8);

    db.prepare('UPDATE characters SET xp = xp + ?, money = money + ? WHERE id = ?').run(earnedXP, earnedMoney, character.id);
    db.prepare(
      'INSERT INTO cooldowns (guild_id, character_id, command, used_on) VALUES (?, ?, ?, ?)'
    ).run(guildId, character.id, 'afterschool', todayKey);

    const activityLabel = isWork ? '🌸 Work' : '🌸 Club';
    const embed = new EmbedBuilder()
      .setTitle(`After-School — ${activityLabel}`)
      .setColor(0xff9ec8)
      .setDescription(`**${charName}** completed their after-school ${character.afterschool}!`)
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
