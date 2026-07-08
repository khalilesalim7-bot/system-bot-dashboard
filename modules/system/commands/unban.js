const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const modlogsPath = path.join(__dirname, '../data/modlogs.json');
function readModlogs() { try { return JSON.parse(fs.readFileSync(modlogsPath, 'utf8') || '{}'); } catch { return {}; } }

const logChannels = {
  unban: '1519422796604903465'
};

// Role allowed to use the command
const allowedRoleId = '1417802492187512932';

module.exports = {
  name: 'unban',
  description: 'Unban a member even if they are not on the server.',
  async execute(message, args, client) {
    const modlogs = readModlogs();
    // ---------------- PERMISSION CHECK ----------------
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;
    if (!member.roles.cache.has(allowedRoleId) && !member.permissions.has('Administrator')) return;

    // ---------------- ARGUMENT CHECK ----------------
    if (!args[0]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Error')
            .setDescription('**Missed Member ID.**')
            .setColor('Red')
            .setTimestamp()
        ]
      });
    }

    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (reason.length > 1024) reason = reason.substring(0, 1021) + '...';

    let bannedUser, userTag, avatarURL;

    try {
      // Fetch ban info
      const bans = await message.guild.bans.fetch();
      bannedUser = bans.get(userId);
      if (!bannedUser) throw new Error('Not banned');

      userTag = bannedUser.user.tag;
      avatarURL = bannedUser.user.displayAvatarURL({ dynamic: true });

      // DM user if possible
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('<:378490ban:1469295126055620710> You have been unbanned!')
          .setDescription(`**<a:Earthd:1464307651323363529> Server :** ${message.guild.name}
            \n**<:reas:1464333026065518843> Reason :** ${reason}`)
          .setColor(0x13350f)
          .setThumbnail(avatarURL)
          .setTimestamp();
        await bannedUser.user.send({ embeds: [dmEmbed] });
      } catch {
        console.log(`Cannot DM ${userTag}`);
      }

      // Remove ban
      await message.guild.bans.remove(userId, reason);

    } catch {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Error')
            .setDescription('**This user is not banned.**')
            .setColor('Red')
            .setTimestamp()
        ]
      });
    }

    // ---------------- SUCCESS EMBED ----------------
    const successEmbed = new EmbedBuilder()
      .setTitle('<a:90559tgdove:1468015118058262588> Unbanned')
      .setDescription(`**<@${userId}> (${userTag}) has been unbanned successfully.**`)
      .setThumbnail(avatarURL)
      .addFields(
  { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: `<@${message.author.id}>`, inline: true },
  { name: '**<:membr:1464331396284809364> Member :**', value: `<@${userId}>`, inline: true },
  { name: '**<:reas:1464333026065518843> Reason :**', value: reason, inline: false }
)

      .setColor(0x13350f)
      .setTimestamp();

    message.channel.send({ embeds: [successEmbed] });

    // ---------------- UPDATE MODLOGS ----------------
    if (!modlogs[userId]) modlogs[userId] = { ban:0, unban:0, timeout:0, removetimeout:0, mute:0, unmute:0, warn:0, history:[] };
    modlogs[userId].unban += 1;
    modlogs[userId].history.push({
      action: 'Unban',
      reason,
      date: new Date().toISOString(),
      by: message.author.tag
    });
    await fs.promises.writeFile(require('path').join(__dirname, '../data/modlogs.json'), JSON.stringify(modlogs, null, 2)).catch(() => {});

    // ---------------- LOG CHANNEL ----------------
    const logChannel = message.guild.channels.cache.get(logChannels.unban);
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setTitle('⚠️ Unban Log')
        .setColor(0x3f2f0e)
        .setThumbnail(avatarURL)
        .addFields(
          { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: message.author.tag, inline: true },
          { name: '**<:membr:1464331396284809364> Member :**', value: `${userTag} (<@${userId}>)`, inline: true },
          { name: '**<:reas:1464333026065518843> Reason :**', value: reason, inline: false },
          { name: '**<a:Earthd:1464307651323363529> Date :**', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: false }
        )
        .setTimestamp();

      logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    }
  }
};
