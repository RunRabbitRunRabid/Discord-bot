const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { getTodayClass, getTodayKey } = require('../utils/time');
const { updateAllLeaderboards } = require('../utils/leaderboard');

function randomXP(min = 5, max = 20) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('class')
    .setDescription('Attend today\'s class and earn XP')
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
    ).get(guildId, character.id, 'class', todayKey);

    if (used) {
      return interaction.reply({ content: `Hey now! You already did that today. You can try again tomorrow 🌸` });
    }

    const todayClass = getTodayClass();
    const baseXP = randomXP();
    const isProficient = character.subject1 === todayClass || character.subject2 === todayClass;
    const bonusXP = isProficient ? 5 : 0;
    const totalXP = baseXP + bonusXP;

    db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?').run(totalXP, character.id);
    db.prepare(
      'INSERT INTO cooldowns (guild_id, character_id, command, used_on) VALUES (?, ?, ?, ?)'
    ).run(guildId, character.id, 'class', todayKey);

    const embed = new EmbedBuilder()
      .setTitle(`🌸 Class — ${todayClass}`)
      .setColor(0xff9ec8)
      .setDescription(`**${charName}** attended **${todayClass}** today!`)
      .addFields(
        { name: 'Base XP', value: `+${baseXP}`, inline: true },
        { name: 'Proficiency Bonus', value: isProficient ? `+5 (${todayClass})` : 'None', inline: true },
        { name: 'Total XP Earned', value: `+${totalXP}`, inline: true },
        { name: 'Total XP', value: `${character.xp + totalXP}`, inline: true },
      )
      .setFooter({ text: 'Hero School Academy' });

    await interaction.reply({ embeds: [embed] });
    await updateAllLeaderboards(interaction.client).catch(() => {});
  },
};
