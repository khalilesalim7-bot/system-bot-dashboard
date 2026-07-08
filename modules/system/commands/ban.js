const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const modlogsPath = path.join(__dirname, '../data/modlogs.json');
function readModlogs() { try { return JSON.parse(fs.readFileSync(modlogsPath, 'utf8') || '{}'); } catch { return {}; } }

const logChannels = {
  ban: '1519422796604903465',
  unban: '1417802912096325692',
  timeout: '1417802913622786069'
};

// Allowed IDs or Admin
const allowedIDs = ['1417802492187512932'];

module.exports = {
  name: 'ban',
  description: '**Ban a member**',
  async execute(message, args) {
    const modlogs = readModlogs();
    // ---------------- PERMISSION CHECK ----------------
    if (!allowedIDs.includes(message.author.id) &&
        !message.member.permissions.has('Administrator')) return;

    // ---------------- ARGUMENT CHECK ----------------
    if (!args[0]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('<a:Dvee:1469295057944182889> Cancelled')
            .setDescription('**Missing Member ID.**')
            .setColor('Red')
            .setTimestamp()
        ]
      });
    }

    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (reason.length > 1024) reason = reason.substring(0, 1021) + '...';

    let userTag = userId;
    let avatarURL = null;

    try {
      // Try fetching member in server
      const member = await message.guild.members.fetch(userId);
      userTag = member.user.tag;
      avatarURL = member.user.displayAvatarURL({ dynamic: true });

      if (!member.bannable) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Error')
              .setDescription('<a:Dvee:1469295057944182889> I cannot ban this member.')
              .setColor('Red')
              .setTimestamp()
          ]
        });
      }

      // DM the member
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('<:378490ban:1469295126055620710> You have been banned!')
          .setDescription(`**<a:Earthd:1464307651323363529> Server :** ${message.guild.name}
            \n**<:reas:1464333026065518843> Reason :** ${reason}`)
          .setColor(0x201111)
          .setThumbnail(avatarURL)
          .setTimestamp();
        await member.send({ embeds: [dmEmbed] });
      } catch {
        console.log(`Cannot DM ${userTag}`);
      }

      // Ban the member
      await member.ban({ reason });

    } catch {
      // Member not in server, still try to ban
      try {
        await message.guild.members.ban(userId, { reason });

        // Try to DM user via fetch if possible
        try {
          const user = await message.client.users.fetch(userId);
          userTag = user.tag;
          avatarURL = user.displayAvatarURL({ dynamic: true });
          const dmEmbed = new EmbedBuilder()
            .setTitle('<:378490ban:1469295126055620710> You have been banned!')
            .setDescription(`**<a:Earthd:1464307651323363529> Server :** ${message.guild.name}
              \n**<:reas:1464333026065518843> Reason :** ${reason}`)
            .setColor(0x201111)
            .setThumbnail(avatarURL)
            .setTimestamp();
          await user.send({ embeds: [dmEmbed] });
        } catch {
          console.log(`Cannot DM user ${userId}`);
        }

      } catch {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Error')
              .setDescription('**Impossible to ban this user.**')
              .setColor(0x8f0b0b)
              .setTimestamp()
          ]
        });
      }
    }

    // ---------------- SUCCESS EMBED ----------------
    const successEmbed = new EmbedBuilder()
      .setTitle('<:Ban:1464323808491212909>  Banned')
      .setDescription(`**<@${userId}> (${userTag}) has been banned successfully.**`)
      .addFields(
  { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: `<@${message.author.id}>`, inline: true },
  { name: '**<:membr:1464331396284809364> Member :**', value: `<@${userId}> (${userTag})`, inline: true },
  { name: '**<:reas:1464333026065518843> Reason :**', value: reason, inline: false },
)

      .setColor(0x201111)
      .setThumbnail(avatarURL)
      .setTimestamp();

    message.channel.send({ embeds: [successEmbed] });

    // ---------------- UPDATE MODLOGS ----------------
    if (!modlogs[userId]) modlogs[userId] = { ban: 0, unban: 0, timeout: 0, removetimeout: 0, mute: 0, unmute: 0, warn: 0, history: [] };
    modlogs[userId].ban += 1;
    modlogs[userId].history.push({
      action: 'Ban',
      reason,
      date: new Date().toISOString(),
      by: message.author.tag
    });
    await fs.promises.writeFile(require('path').join(__dirname, '../data/modlogs.json'), JSON.stringify(modlogs, null, 2)).catch(() => {});

    // ---------------- LOG CHANNEL ----------------
    const logChannel = message.guild.channels.cache.get(logChannels.ban);
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setTitle('<:Ban:1464323808491212909>  Ban Log')
        .setColor(0xff0000)
        .setThumbnail(avatarURL)
        .addFields(
          { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: message.author.tag, inline: true },
          { name: '**<:membr:1464331396284809364> Member :**', value: `${userTag} (<@${userId}>)`, inline: true },
          { name: '**<:reas:1464333026065518843> Reason :**', value: reason, inline: false },
          { name: '**<a:Earthd:1464307651323363529> Date :**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp();

      logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    }
  }
};
