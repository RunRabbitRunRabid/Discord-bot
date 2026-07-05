const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('point-add')
    .setDescription('(Admin) Add QuickTime points to a character')
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
        .setDescription('Number of points to add')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(opt =>
      opt
        .setName('reason')
        .setDescription('Optional reason for the point award')
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

    // Upsert points
    db.prepare(`
      INSERT INTO quicktime_points (guild_id, user_id, character_id, character_name, points)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id, character_id) DO UPDATE SET points = points + excluded.points
    `).run(guildId, targetUser.id, character.id, character.name, amount);

    const newTotal = db.prepare(
      'SELECT points FROM quicktime_points WHERE guild_id = ? AND character_id = ?'
    ).get(guildId, character.id).points;

    const embed = new EmbedBuilder()
      .setTitle('⚡ Points Added')
      .setColor(0xffd700)
      .addFields(
        { name: 'Character', value: charName, inline: true },
        { name: 'Player', value: `${targetUser}`, inline: true },
        { name: 'Points Added', value: `+${amount}`, inline: true },
        { name: 'New Total', value: `${newTotal} pts`, inline: true },
        ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : []),
      )
      .setFooter({ text: `Awarded by ${interaction.user.tag} • Hero School Academy` });

    await interaction.reply({ embeds: [embed] });
  },
};
