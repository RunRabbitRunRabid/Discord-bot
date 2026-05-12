const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PINK } = require('../constants');
const { getChar, updateChar, isOnCooldown, setCooldown } = require('../database');
const { rollXp, trainMessage } = require('../utils/random');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('train')
    .setDescription('Push your limits in the training hall and earn XP')
    .addStringOption(o => o
      .setName('character')
      .setDescription('Your character\'s name')
      .setRequired(true)
    ),

  async execute(interaction) {
    const guildId  = interaction.guildId;
    const userId   = interaction.user.id;
    const charName = interaction.options.getString('character').trim();

    let char;
    try { char = getChar(guildId, userId, charName); }
    catch (err) {
      console.error('[/train]', err);
      return interaction.reply({ embeds: [errorEmbed('Database Error', `Could not look up **${charName}**. Try again in a moment.`)], ephemeral: true });
    }

    if (!char) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Character Not Found',
          `No character named **${charName}** was found on your account in this server.\n\n` +
          `**Try:**\n— Check the spelling (names are exact, spaces included)\n— Use \`/list\` to see your characters`
        )],
        ephemeral: true,
      });
    }

    if (isOnCooldown(guildId, char.id, 'train')) {
      return interaction.reply({
        embeds: [errorEmbed(
          'Already Done Today',
          `Hey now! **${char.name}** already trained today.\n\n` +
          `**Try:** Come back after midnight Ohio time. You can still use \`/class\`, \`/study\`, or \`/afterschool\`.`
        )],
        ephemeral: true,
      });
    }

    try {
      const xp    = rollXp();
      const newXp = char.xp + xp;
      updateChar(char.id, { xp: newXp });
      setCooldown(guildId, char.id, 'train');

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 Training Session')
            .setColor(PINK)
            .setDescription(`**${char.name}** ${trainMessage()}`)
            .addFields(
              { name: 'XP Earned', value: `+${xp}`,  inline: true },
              { name: 'Total XP',  value: `${newXp}`, inline: true },
            )
            .setFooter({ text: 'Hero Academy · Cooldown resets at midnight Ohio time' })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[/train]', err);
      await interaction.reply({
        embeds: [errorEmbed('Something Went Wrong', `**${char.name}**'s training session could not be saved.\n\n**Try:** Run \`/train\` again. Your XP was not changed.`)],
        ephemeral: true,
      });
    }
  },
};
