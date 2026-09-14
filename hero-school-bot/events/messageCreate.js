const { EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../database/db');
const { applyLuck, clearLuck, getLuck, applyLuckToRoll } = require('../utils/luck');
const { getTodayClass, getTodayKey } = require('../utils/time');
const { updateAllLeaderboards } = require('../utils/leaderboard');

// CORN! is a hidden admin-only system. These commands are only for the bot creator
// and people reading the source code. They are completely hidden from normal users.

const CORN_PREFIX = 'CORN!';

// You should set this to the Discord ID of the bot creator/owner in your environment
const CREATOR_ID = process.env.CREATOR_ID || null;

function randomXP(min = 5, max = 20) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMoney(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

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
   * CORN!autoroll [name], [name], [name] #channel
   * Automatically rolls class, afterschool, train, and study for multiple characters in a specified channel.
   * Usage: CORN!autoroll Alice, Bob, Charlie #general
   */
  autoroll: async (message, args) => {
    if (!args.length) {
      return message.reply({
        content: '❌ Usage: `CORN!autoroll [name], [name], [name] #channel`',
        flags: ['SuppressNotifications'],
      });
    }

    // Find the channel mention at the end
    let channelMention = null;
    let channelArg = args[args.length - 1];

    if (channelArg.startsWith('<#') && channelArg.endsWith('>')) {
      channelMention = channelArg.slice(2, -1); // Extract ID from <#ID>
    }

    if (!channelMention) {
      return message.reply({
        content: '❌ You must specify a channel: `CORN!autoroll [names] #channel`',
        flags: ['SuppressNotifications'],
      });
    }

    // Get the channel
    const targetChannel = await message.client.channels.fetch(channelMention).catch(() => null);
    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      return message.reply({
        content: '❌ Invalid channel or channel is not a text channel.',
        flags: ['SuppressNotifications'],
      });
    }

    // Parse character names (remove last arg which is the channel)
    const namesRaw = args.slice(0, -1).join(' ');
    const charNames = namesRaw.split(',').map(n => n.trim()).filter(n => n.length > 0);

    if (!charNames.length) {
      return message.reply({
        content: '❌ No character names provided.',
        flags: ['SuppressNotifications'],
      });
    }

    const guildId = message.guildId;
    const todayKey = getTodayKey();
    const todayClass = getTodayClass();

    // Validate and collect characters
    const validChars = [];
    for (const charName of charNames) {
      const character = db.prepare(
        'SELECT * FROM characters WHERE guild_id = ? AND name = ?'
      ).get(guildId, charName);

      if (!character) {
        // Skip invalid character, but don't fail the whole command
        continue;
      }
      validChars.push(character);
    }

    if (!validChars.length) {
      return message.reply({
        content: '❌ No valid characters found.',
        flags: ['SuppressNotifications'],
      });
    }

    // Roll for each character and collect results
    const results = [];

    for (const character of validChars) {
      const charName = character.name;
      const rolls = {};

      // CLASS
      const classUsed = db.prepare(
        'SELECT id FROM cooldowns WHERE guild_id = ? AND character_id = ? AND command = ? AND used_on = ?'
      ).get(guildId, character.id, 'class', todayKey);

      if (!classUsed) {
        let classXP = randomXP();
        const luck = getLuck(character.id);
        classXP = applyLuckToRoll(classXP, luck);
        const isProficient = character.subject1 === todayClass || character.subject2 === todayClass;
        const bonusXP = isProficient ? 5 : 0;
        const totalXP = classXP + bonusXP;

        db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?').run(totalXP, character.id);
        db.prepare(
          'INSERT INTO cooldowns (guild_id, character_id, command, used_on) VALUES (?, ?, ?, ?)'
        ).run(guildId, character.id, 'class', todayKey);

        rolls.class = `+${totalXP} XP`;
      } else {
        rolls.class = 'Already done';
      }

      // STUDY
      const studyUsed = db.prepare(
        'SELECT id FROM cooldowns WHERE guild_id = ? AND character_id = ? AND command = ? AND used_on = ?'
      ).get(guildId, character.id, 'study', todayKey);

      if (!studyUsed) {
        let studyXP = randomXP();
        const luck = getLuck(character.id);
        studyXP = applyLuckToRoll(studyXP, luck);

        db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?').run(studyXP, character.id);
        db.prepare(
          'INSERT INTO cooldowns (guild_id, character_id, command, used_on) VALUES (?, ?, ?, ?)'
        ).run(guildId, character.id, 'study', todayKey);

        rolls.study = `+${studyXP} XP`;
      } else {
        rolls.study = 'Already done';
      }

      // TRAIN
      const trainUsed = db.prepare(
        'SELECT id FROM cooldowns WHERE guild_id = ? AND character_id = ? AND command = ? AND used_on = ?'
      ).get(guildId, character.id, 'train', todayKey);

      if (!trainUsed) {
        let trainXP = randomXP();
        const luck = getLuck(character.id);
        trainXP = applyLuckToRoll(trainXP, luck);

        db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?').run(trainXP, character.id);
        db.prepare(
          'INSERT INTO cooldowns (guild_id, character_id, command, used_on) VALUES (?, ?, ?, ?)'
        ).run(guildId, character.id, 'train', todayKey);

        rolls.train = `+${trainXP} XP`;
      } else {
        rolls.train = 'Already done';
      }

      // AFTERSCHOOL
      const afterschoolUsed = db.prepare(
        'SELECT id FROM cooldowns WHERE guild_id = ? AND character_id = ? AND command = ? AND used_on = ?'
      ).get(guildId, character.id, 'afterschool', todayKey);

      if (!afterschoolUsed) {
        let afterschoolXP = randomXP();
        const luck = getLuck(character.id);
        afterschoolXP = applyLuckToRoll(afterschoolXP, luck);
        const isWork = character.afterschool === 'work';
        const earnedMoney = isWork ? randomMoney(8, 20) : randomMoney(2, 8);

        db.prepare('UPDATE characters SET xp = xp + ?, money = money + ? WHERE id = ?').run(afterschoolXP, earnedMoney, character.id);
        db.prepare(
          'INSERT INTO cooldowns (guild_id, character_id, command, used_on) VALUES (?, ?, ?, ?)'
        ).run(guildId, character.id, 'afterschool', todayKey);

        rolls.afterschool = `+${afterschoolXP} XP, +$${earnedMoney.toFixed(2)}`;
      } else {
        rolls.afterschool = 'Already done';
      }

      results.push({ name: charName, rolls });
    }

    // Send results to target channel
    const embed = new EmbedBuilder()
      .setTitle('🌽 CORN! Autoroll Complete')
      .setColor(0xffa500)
      .setDescription(`Autorolled ${validChars.length} character(s)`);

    for (const result of results) {
      embed.addFields({
        name: `**${result.name}**`,
        value: `Class: ${result.rolls.class}\nStudy: ${result.rolls.study}\nTrain: ${result.rolls.train}\nAfter-School: ${result.rolls.afterschool}`,
        inline: false,
      });
    }

    embed.setFooter({ text: 'Hidden CORN! system' });

    try {
      await targetChannel.send({ embeds: [embed] });
      await updateAllLeaderboards(message.client).catch(() => {});
      return message.reply({
        content: `✅ Autoroll complete! Results posted to ${targetChannel}`,
        flags: ['SuppressNotifications'],
      });
    } catch (err) {
      console.error('[CORN! Autoroll Error]', err);
      return message.reply({
        content: '❌ Failed to post results to channel.',
        flags: ['SuppressNotifications'],
      });
    }
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
          name: 'CORN!autoroll [name], [name], [name] #channel',
          value: 'Automatically rolls class, study, train, and afterschool for multiple characters and posts results to a channel.',
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

