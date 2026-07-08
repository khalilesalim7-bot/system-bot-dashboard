const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const modlogsPath = path.join(__dirname, '../data/modlogs.json');
function readModlogs() { try { return JSON.parse(fs.readFileSync(modlogsPath, 'utf8') || '{}'); } catch { return {}; } }

const allowedRoles = [
  '1417802492187512932',
  '1417802494846963846',
  '1417938769192943646',
  '1417802493928149124',
  '1417802493085220914'
];

const logChannelId = '1519422796604903465';

module.exports = {
  name: 'timeout',
  description: '**Putting a member on timeout**',
  async execute(message, args) {
    const modlogs = readModlogs();
    // ---------------- PERMISSION CHECK ----------------
    if (
      !message.member.roles.cache.some(r => allowedRoles.includes(r.id)) &&
      !message.member.permissions.has('ModerateMembers')
    ) return;

    if (args.length < 2) 
      return message.reply('**Usage: .timeout <duration> <userID> [reason]**');

    const durationStr = args[0];
    const userId = args[1];
    const reason = args.slice(2).join(' ') || '**No reason provided**';
    if (reason.length > 1024) reason = reason.substring(0, 1021) + '...';

    // ---------------- DURATION PARSING ----------------
    const match = durationStr.match(/^(\d+)([mhd])$/);
    if (!match) return message.reply('Invalid duration. Use 1-100m, 1-50h, 1-50d.');

    const amount = parseInt(match[1]);
    const unit = match[2];
    let durationMs;

    if (unit === 'm') {
      if (amount < 1 || amount > 100) return message.reply('Minutes must be 1-100.');
      durationMs = amount * 60000;
    } else if (unit === 'h') {
      if (amount < 1 || amount > 50) return message.reply('Hours must be 1-50.');
      durationMs = amount * 3600000;
    } else if (unit === 'd') {
      if (amount < 1 || amount > 50) return message.reply('Days must be 1-50.');
      durationMs = amount * 86400000;
    }

    // ---------------- GET TARGET MEMBER ----------------
    let member;
    try {
      member = await message.guild.members.fetch(userId);
    } catch {
      member = null;
    }

    // ---------------- APPLY TIMEOUT ----------------
    if (member) {
      if (!member.moderatable)
        return message.reply('**Cannot timeout this member.**');

      await member.timeout(durationMs, reason).catch(err => {
        console.error(err);
        return message.reply('**Unable to timeout member.**');
      });

      // ---------------- DM EMBED ----------------
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('**<:MOD:1463435550265577564> YOU GOT TIMED OUT!**')
          .setDescription(`**<a:Earthd:1464307651323363529> Server:** ${message.guild.name}\n**<a:clockss:1464333581798346834> Duration:** ${durationStr}\n**<:AR_Ques:1463435480434606255> Reason:** ${reason}`)
          .setColor(0x6a1b1b)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch {}

    }

    // ---------------- MODLOGS ----------------
    if (!modlogs[userId]) 
      modlogs[userId] = { ban:0, unban:0, timeout:0, removetimeout:0, warn:0, history:[] };

    modlogs[userId].timeout += 1;
    modlogs[userId].history.push({
      action: 'Timeout',
      reason,
      duration: durationStr,
      date: new Date().toISOString(),
      by: message.author.tag
    });

    await fs.promises.writeFile(require('path').join(__dirname, '../data/modlogs.json'), JSON.stringify(modlogs, null, 2)).catch(() => {});

    // ---------------- LOG EMBED ----------------
    const logEmbed = new EmbedBuilder()
      .setTitle('⏱ Timeout Applied')
      .setThumbnail(member ? member.user.displayAvatarURL({ dynamic: true }) : null)
      .setColor(0xff5500)
      .setDescription(member ? `${member} has been timed out.` : `Member not in server. Action logged.`)
      .addFields(
        { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: `${message.author}`, inline: true },
        { name: '**<:membr:1464331396284809364> Member :**', value: member ? `${member}` : userId, inline: true },
        { name: '**<a:clockss:1464333581798346834> Duration :**', value: durationStr, inline: true },
        { name: '**<:reas:1464333026065518843> Reason :**', value: reason, inline: false },
        { name: '**<a:Earthd:1464307651323363529> Date :**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp();

    // ---------------- SEND LOG ----------------
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (logChannel && logChannel.isTextBased()) {
      logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    }

    // ---------------- CONFIRMATION ----------------
    message.channel.send({ embeds: [logEmbed] });
  }
};
