const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const modlogsPath = path.join(__dirname, '../data/modlogs.json');
function readModlogs() { try { return JSON.parse(fs.readFileSync(modlogsPath, 'utf8') || '{}'); } catch { return {}; } }

const allowedRoles = [
  '1417938769192943646',
  '1417802493928149124',
  '1417802493085220914'
];

const logChannelId = '1417802910124736532'; // logs channel
const muteRoleId = '1417802528187355249'; // mute role

module.exports = {
  name: 'mute',
  description: '**Mute a member**',
  async execute(message, args) {
    const modlogs = readModlogs();
    // ---------------- PERMISSION CHECK ----------------
    if (
      !message.member.roles.cache.some(r => allowedRoles.includes(r.id)) &&
      !message.member.permissions.has('Administrator')
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

    // ---------------- APPLY MUTE ROLE ----------------
    try {
      await member.roles.add(muteRoleId, reason);
    } catch {
      return message.reply('**<:298685ex:1467929031617020009> Cannot mute member.**');
    }

    // ---------------- MODLOGS ----------------
    if (!modlogs[member.id]) 
      modlogs[member.id] = { ban:0, unban:0, timeout:0, removetimeout:0, mute:0, unmute:0, warn:0, history:[] };

    modlogs[member.id].mute += 1;
    modlogs[member.id].history.push({
      action: 'Mute',
      reason,
      date: new Date().toISOString(),
      by: message.author.tag
    });

    await fs.promises.writeFile(require('path').join(__dirname, '../data/modlogs.json'), JSON.stringify(modlogs, null, 2)).catch(() => {});

    // ---------------- LOG EMBED ----------------
    const logEmbed = new EmbedBuilder()
      .setTitle('<:2757mute:1471459762259361912> Member Muted')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setColor(0xff0000)
      .addFields(
        { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: `${message.author}`, inline: true },
        { name: '**<:membr:1464331396284809364> Member :**', value: `${member}`, inline: true },
        { name: '**<:reas:1464333026065518843> Reason :**', value: reason, inline: false },
        { name: '**<a:Earthd:1464307651323363529> Date :**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp();

    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (logChannel && logChannel.isTextBased()) logChannel.send({ embeds: [logEmbed] }).catch(console.error);

    // ---------------- DM EMBED ----------------
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('<:2757mute:1471459762259361912> YOU GOT MUTED!')
        .setDescription(`**<a:Earthd:1464307651323363529> Server :** ${message.guild.name}
            \n**<:reas:1464333026065518843> Reason :** ${reason}`)
        .setColor(0xff0000)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await member.send({ embeds: [dmEmbed] });
    } catch {
      console.log(`Could not DM ${member.user.tag}`);
    }

    // ---------------- CONFIRMATION ----------------
    message.channel.send({ embeds: [logEmbed] });
  }
};
