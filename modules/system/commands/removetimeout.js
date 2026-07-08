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

const logChannelId = '1519422796604903465'; // channel log

module.exports = {
  name: 'removetimeout',
  description: '**Remove timeout from a member**',
  async execute(message, args) {
    const modlogs = readModlogs();
    if (
      !message.member.roles.cache.some(r => allowedRoles.includes(r.id)) &&
      !message.member.permissions.has('ModerateMembers')
    ) return;

    const userId = args[0];
    if (!userId) return message.reply('**You missed the Member ID.**');

    let member;
    try {
      member = await message.guild.members.fetch({ user: userId, force: true });
    } catch {
      return message.reply('**<:298685ex:1467929031617020009> Member not in the server.**');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (reason.length > 1024) reason = reason.substring(0, 1021) + '...';

    try {
      await member.timeout(null, reason);
    } catch {
      return message.reply('**<:298685ex:1467929031617020009> Cannot remove timeout.**');
    }

    // ---------------- DM TO MEMBER ----------------
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('<:wingblue:1469265461991575606>  Your timeout has been removed!')
        .setDescription(`**<a:Earthd:1464307651323363529> Server:** ${message.guild.name}\n**<:AR_Ques:1463435480434606255> Reason:** ${reason}`)
        .setColor(0x0d323d)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await member.send({ embeds: [dmEmbed] });
    } catch {}

    // ---------------- MODLOGS ----------------
    if (!modlogs[member.id]) 
      modlogs[member.id] = { ban:0, unban:0, timeout:0, removetimeout:0, warn:0, history:[] };

    modlogs[member.id].removetimeout += 1;
    modlogs[member.id].history.push({
      action: 'RemoveTimeout',
      reason,
      date: new Date().toISOString(),
      by: message.author.tag
    });

    await fs.promises.writeFile(require('path').join(__dirname, '../data/modlogs.json'), JSON.stringify(modlogs, null, 2)).catch(() => {});

    // ---------------- LOG EMBED ----------------
    const logEmbed = new EmbedBuilder()
      .setTitle('⏱ Timeout Removed')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setColor(0x124d21)
      .addFields(
        { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: `${message.author}`, inline: true },
        { name: '**<:membr:1464331396284809364> Member :**', value: `${member}`, inline: true },
        { name: '**<:reas:1464333026065518843> Reason :**', value: reason, inline: false },
        { name: '**<a:Earthd:1464307651323363529> Date :**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp();

    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (logChannel && logChannel.isTextBased()) {
      logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    }

    // ---------------- CONFIRMATION ----------------
    message.channel.send({ embeds: [logEmbed] });
  }
};
