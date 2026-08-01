const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { applyLuck, clearLuck, getLuck, applyLuckToRoll } = require('../utils/luck');

// CORN! is a hidden admin-only system. These commands are only for the bot creator
// and people reading the source code. They are completely hidden from normal users.

const CORN_PREFIX = 'CORN!';

// You should set this to the Discord ID of the bot creator/owner in your environment
const CREATOR_ID = process.env.CREATOR_ID || null;

/**
 * CORN! commands are hidden message-based commands for admins only.
 * They should never be discoverable through normal Discord interfaces.
 */
const cornCommands = {
  /**
   * CORN!luck <character name>
   * Grants Good Luck to a character. Lasts 1 in-game day.
   * While active, rolls are randomly forced to 12–20.
   */
  luck: async (message, args) => {
    if (!args.length) {
      return message.reply({
        content: '❌ Usage: `CORN!luck <character name>`',
        flags: ['SuppressNotifications'],
      });
    }

    const charName = args.join(' ').trim();
    const guildId = message.guildId;

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
    ).get(guildId, charName);

    if (!character) {
      return message.reply({
        content: `❌ Character **${charName}** not found.`,
        flags: ['SuppressNotifications'],
      });
    }

    applyLuck(character.id, 'good');
    const luck = getLuck(character.id);
    const expiresIn = Math.ceil((luck.expires_at - Math.floor(Date.now() / 1000)) / 3600);

    const embed = new EmbedBuilder()
      .setTitle('🍀 CORN! Good Luck Applied')
      .setColor(0x00ff00)
      .setDescription(`**${charName}** now has Good Luck (12–20 rolls).`)
      .addFields({ name: 'Expires In', value: `${expiresIn} hour(s)` })
      .setFooter({ text: 'Hidden CORN! system' });

    return message.reply({ embeds: [embed], flags: ['SuppressNotifications'] });
  },

  /**
   * CORN!badluck <character name>
   * Grants Bad Luck to a character. Lasts 1 in-game day.
   * While active, rolls are randomly forced to 1–9.
   */
  badluck: async (message, args) => {
    if (!args.length) {
      return message.reply({
        content: '❌ Usage: `CORN!badluck <character name>`',
        flags: ['SuppressNotifications'],
      });
    }

    const charName = args.join(' ').trim();
    const guildId = message.guildId;

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
    ).get(guildId, charName);

    if (!character) {
      return message.reply({
        content: `❌ Character **${charName}** not found.`,
        flags: ['SuppressNotifications'],
      });
    }

    applyLuck(character.id, 'bad');
    const luck = getLuck(character.id);
    const expiresIn = Math.ceil((luck.expires_at - Math.floor(Date.now() / 1000)) / 3600);

    const embed = new EmbedBuilder()
      .setTitle('☘️ CORN! Bad Luck Applied')
      .setColor(0xff0000)
      .setDescription(`**${charName}** now has Bad Luck (1–9 rolls).`)
      .addFields({ name: 'Expires In', value: `${expiresIn} hour(s)` })
      .setFooter({ text: 'Hidden CORN! system' });

    return message.reply({ embeds: [embed], flags: ['SuppressNotifications'] });
  },

  /**
   * CORN!clearluck <character name>
   * Immediately removes any active luck modifier from the character.
   */
  clearluck: async (message, args) => {
    if (!args.length) {
      return message.reply({
        content: '❌ Usage: `CORN!clearluck <character name>`',
        flags: ['SuppressNotifications'],
      });
    }

    const charName = args.join(' ').trim();
    const guildId = message.guildId;

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
    ).get(guildId, charName);

    if (!character) {
      return message.reply({
        content: `❌ Character **${charName}** not found.`,
        flags: ['SuppressNotifications'],
      });
    }

    const hadLuck = clearLuck(character.id);

    const embed = new EmbedBuilder()
      .setTitle('✨ CORN! Luck Cleared')
      .setColor(0xffff00)
      .setDescription(hadLuck ? `**${charName}**'s luck modifier has been removed.` : `**${charName}** had no active luck modifier.`)
      .setFooter({ text: 'Hidden CORN! system' });

    return message.reply({ embeds: [embed], flags: ['SuppressNotifications'] });
  },

  /**
   * CORN!luckstatus <character name>
   * Displays the character's current luck modifier and remaining duration.
   */
  luckstatus: async (message, args) => {
    if (!args.length) {
      return message.reply({
        content: '❌ Usage: `CORN!luckstatus <character name>`',
        flags: ['SuppressNotifications'],
      });
    }

    const charName = args.join(' ').trim();
    const guildId = message.guildId;

    const character = db.prepare(
      'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
    ).get(guildId, charName);

    if (!character) {
      return message.reply({
        content: `❌ Character **${charName}** not found.`,
        flags: ['SuppressNotifications'],
      });
    }

    const luck = getLuck(character.id);

    if (!luck) {
      const embed = new EmbedBuilder()
        .setTitle('📊 CORN! Luck Status')
        .setColor(0x808080)
        .setDescription(`**${charName}** has no active luck modifier.`)
        .setFooter({ text: 'Hidden CORN! system' });

      return message.reply({ embeds: [embed], flags: ['SuppressNotifications'] });
    }

    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = luck.expires_at - now;
    const hoursLeft = Math.ceil(secondsLeft / 3600);
    const modifierLabel = luck.modifier_type === 'good' ? '🍀 Good Luck (12–20 rolls)' : '☘️ Bad Luck (1–9 rolls)';

    const embed = new EmbedBuilder()
      .setTitle('📊 CORN! Luck Status')
      .setColor(luck.modifier_type === 'good' ? 0x00ff00 : 0xff0000)
      .setDescription(`**${charName}** has an active modifier.`)
      .addFields({ name: 'Modifier', value: modifierLabel, inline: true }, { name: 'Expires In', value: `${hoursLeft} hour(s)`, inline: true })
      .setFooter({ text: 'Hidden CORN! system' });

    return message.reply({ embeds: [embed], flags: ['SuppressNotifications'] });
  },

  /**
   * CORN!help
   * Displays every hidden CORN! command. This command is also hidden and admin-only.
   */
  help: async (message) => {
    const embed = new EmbedBuilder()
      .setTitle('🌽 CORN! Hidden Commands')
      .setColor(0xffa500)
      .setDescription('Admin-only hidden commands for internal use only.')
      .addFields(
        {
          name: 'CORN!luck <character name>',
          value: 'Grants Good Luck (12–20 rolls) for 1 in-game day.',
          inline: false,
        },
        {
          name: 'CORN!badluck <character name>',
          value: 'Grants Bad Luck (1–9 rolls) for 1 in-game day.',
          inline: false,
        },
        {
          name: 'CORN!clearluck <character name>',
          value: 'Immediately removes any active luck modifier.',
          inline: false,
        },
        {
          name: 'CORN!luckstatus <character name>',
          value: 'Displays the character\'s current luck modifier and remaining duration.',
          inline: false,
        },
        {
          name: 'CORN!help',
          value: 'Displays this hidden command list.',
          inline: false,
        }
      )
      .setFooter({ text: 'These commands are hidden and should never be discovered by normal users.' });

    return message.reply({ embeds: [embed], flags: ['SuppressNotifications'] });
  },
};

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Ignore bot messages and messages without the CORN prefix
    if (message.author.bot || !message.content.startsWith(CORN_PREFIX)) return;

    // Restrict to bot creator only (if CREATOR_ID is set) or server admins
    const isCreator = CREATOR_ID && message.author.id === CREATOR_ID;
    const isAdmin = message.member && message.member.permissions.has('Administrator');

    if (!isCreator && !isAdmin) {
      // Silently ignore — never hint that hidden commands exist
      return;
    }

    // Parse the command
    const content = message.content.slice(CORN_PREFIX.length).trim();
    const [commandName, ...args] = content.split(/\s+/);

    if (!commandName) return;

    const command = cornCommands[commandName.toLowerCase()];
    if (!command) {
      // Never hint about unknown commands — just silently ignore
      return;
    }

    try {
      await command(message, args);
    } catch (err) {
      console.error(`[CORN! Error] ${commandName}:`, err);
      message
        .reply({
          content: '❌ An error occurred.',
          flags: ['SuppressNotifications'],
        })
        .catch(() => {});
    }
  },
};

