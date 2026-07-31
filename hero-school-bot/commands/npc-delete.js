const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('npc-delete')
    .setDescription('(Admin) Delete an NPC character')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('NPC character name to delete')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const guildId = interaction.guildId;
    const focusedValue = interaction.options.getFocused();

    const npcs = db.prepare(
      'SELECT name FROM characters WHERE guild_id = ? AND is_npc = 1 ORDER BY name'
    ).all(guildId);

    const filtered = npcs
      .map(row => row.name)
      .filter(name => name.toLowerCase().includes(focusedValue.toLowerCase()))
      .slice(0, 25);

    await interaction.respond(
      filtered.map(name => ({ name, value: name }))
    );
  },

  async execute(interaction) {
    const name = interaction.options.getString('name').trim();
    const guildId = interaction.guildId;

    const npc = db.prepare(
      'SELECT id, name, xp, money FROM characters WHERE guild_id = ? AND is_npc = 1 AND name = ?'
    ).get(guildId, name);

    if (!npc) {
      return interaction.reply({
        content: `🌸 No NPC named **${name}** found in this server.`,
        ephemeral: true,
      });
    }

    try {
      db.prepare('DELETE FROM characters WHERE id = ?').run(npc.id);

      const embed = new EmbedBuilder()
        .setTitle('🤖 NPC Deleted')
        .setColor(0x7289da)
        .setDescription(`The NPC **${npc.name}** has been permanently removed.`)
        .addFields(
          { name: 'Name', value: npc.name, inline: true },
          { name: 'Final XP', value: String(npc.xp), inline: true },
          { name: 'Final Money', value: `$${Number(npc.money).toFixed(2)}`, inline: true }
        )
        .setFooter({ text: `Deleted by ${interaction.user.username} • Hero School Academy` });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error deleting NPC:', err);
      await interaction.reply({
        content: `🌸 Failed to delete NPC. Please try again.`,
        ephemeral: true,
      });
    }
  },
};

