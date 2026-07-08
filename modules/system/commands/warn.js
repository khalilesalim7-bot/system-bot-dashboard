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

const logChannelId = '1519422796604903465'; // logs channel

module.exports = {
  name: 'warn',
  description: '**WARN A MEMBER**',
  async execute(message, args) {
    const modlogs = readModlogs();
    // ---------------- PERMISSION CHECK ----------------
    const hasRole = message.member.roles.cache.some(role => allowedRoles.includes(role.id));
    if (!message.member.permissions.has('Administrator') && !hasRole) return;

    // ---------------- ARGUMENT CHECK ----------------
    const userId = args[0];
    if (!userId) return message.reply('**<a:DVvxXx:1467408812083253258> Missed MEMBER ID.**');

    const user = await message.guild.members.fetch(userId).catch(() => null);
    if (!user) return message.reply('**<a:DVvxXx:1467408812083253258> Invalid MEMBER ID.**');

    if (user.id === message.guild.ownerId) {
      return message.reply('**You cannot warn the server owner!**');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (reason.length > 1024) reason = reason.substring(0, 1021) + '...';

    // ---------------- DM THE MEMBER ----------------
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('<:MOD:1463435550265577564> You got warned!')
        .setDescription(`**Server:** ${message.guild.name}\n**Reason:** ${reason}`)
        .setColor('Yellow')
        .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await user.send({ embeds: [dmEmbed] });
    } catch {
      console.log(`Could not DM ${user.user.tag}`);
    }

    // ---------------- SUCCESS EMBED ----------------
    const successEmbed = new EmbedBuilder()
      .setTitle('⚠️ Member Warned')
      .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
      .setColor(0x916ca5)
      .addFields(
        { name: 'Moderator', value: `${message.author}`, inline: true },
        { name: 'Member', value: `${user}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp();

    message.channel.send({ embeds: [successEmbed] });

    // ---------------- UPDATE MODLOGS ----------------
    if (!modlogs[user.id]) {
      modlogs[user.id] = {
        ban: 0,
        unban: 0,
        timeout: 0,
        removetimeout: 0,
        mute: 0,
        unmute: 0,
        warn: 0,
        history: []
      };
    }

    modlogs[user.id].warn += 1;
    modlogs[user.id].history.push({
      action: 'Warn',
      reason,
      date: new Date().toISOString(),
      by: message.author.tag
    });

    await fs.promises.writeFile(require('path').join(__dirname, '../data/modlogs.json'), JSON.stringify(modlogs, null, 2)).catch(() => {});

    // ---------------- LOG CHANNEL ----------------
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (logChannel && logChannel.isTextBased()) {
      logChannel.send({ embeds: [successEmbed] }).catch(console.error);
    }
  }
};
