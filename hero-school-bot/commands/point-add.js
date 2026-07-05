const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('point-add')
    .setDescription('(Admin) Add QuickTime XP to a character')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt
        .setName('player')
        .setDescription('The player who owns the character')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('character')
        .setDescription('The character\'s name')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Number of XP to add')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(opt =>
      opt
        .setName('reason')
        .setDescription('Optional reason for the XP award')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('player');
    const charName = interaction.options.getString('character').trim();
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') ?? null;
    const guildId = interaction.guildId;

    // Validate the character exists and belongs to the target user
    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ? AND is_npc = 0'
    ).get(guildId, charName);

    if (!character) {
      return interaction.reply({
        content: `🌸 No character named **${charName}** found in this server.`,
        ephemeral: true,
      });
    }

    if (character.user_id !== targetUser.id) {
      return interaction.reply({
        content: `🌸 **${charName}** does not belong to ${targetUser}.`,
        ephemeral: true,
      });
    }

    // Award XP directly to the character
    db.prepare(`
      UPDATE characters SET xp = xp + ? WHERE id = ?
    `).run(amount, character.id);

    const newTotal = db.prepare(
      'SELECT xp FROM characters WHERE id = ?'
    ).get(character.id).xp;

    const embed = new EmbedBuilder()
      .setTitle('⚡ XP Awarded')
      .setColor(0xffd700)
      .addFields(
        { name: 'Character', value: charName, inline: true },
        { name: 'Player', value: `${targetUser}`, inline: true },
        { name: 'XP Added', value: `+${amount} XP`, inline: true },
        { name: 'New Total', value: `${newTotal} XP`, inline: true },
        ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : []),
      )
      .setFooter({ text: `Awarded by ${interaction.user.tag} • Hero School Academy` });

    await interaction.reply({ embeds: [embed] });
  },
};

