const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const modlogsPath = path.join(__dirname, '../data/modlogs.json');
function readModlogs() { try { return JSON.parse(fs.readFileSync(modlogsPath, 'utf8') || '{}'); } catch { return {}; } }

const allowedRoles = [
    '1417938769192943646',
    '1417802493928149124',
    '1417802493085220914'
];

const logChannelId = '1417802910124736532'; // modlog channel
const muteRoleId = '1417802528187355249'; // role muted

module.exports = {
    name: 'unmute',
    description: '**Unmute a member**',
    async execute(message, args) {
        const modlogs = readModlogs();
        // ---------------- PERMISSION CHECK ----------------
        if (
            !message.member.roles.cache.some(r => allowedRoles.includes(r.id)) &&
            !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
        ) return; // silently ignore if user is not allowed

        // ---------------- GET MEMBER ID ----------------
        const userId = args[0];
        if (!userId) return message.reply('**Missed Member ID.**');

        // ---------------- FETCH MEMBER ----------------
        let member;
        try {
            member = await message.guild.members.fetch({ user: userId, force: true });
        } catch {
            return message.reply('**Member not found in server.**');
        }

        // ---------------- REMOVE MUTE ROLE ----------------
        const muteRole = message.guild.roles.cache.get(muteRoleId);
        if (!muteRole) return;

        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (reason.length > 1024) reason = reason.substring(0, 1021) + '...';

        try {
            await member.roles.remove(muteRole, reason);
        } catch {
            return message.reply('**Cannot remove mute role from this member.**');
        }

        // ---------------- DM TO USER ----------------
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('<:4767voiceevent:1471460087758327992> You have been unmuted!')
                .setDescription(`**<a:Earthd:1464307651323363529> Server :** ${message.guild.name}
                    \n**<:reas:1464333026065518843> Reason :** ${reason}`)
                .setColor(0x0c3718)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] });
        } catch {}

        // ---------------- MODLOGS ----------------
        if (!modlogs[member.id]) modlogs[member.id] = { mute: 0, unmute: 0, history: [] };
        modlogs[member.id].unmute = (modlogs[member.id].unmute || 0) + 1;
        modlogs[member.id].history.push({
            action: 'Unmute',
            reason,
            date: new Date().toISOString(),
            by: message.author.tag
        });
        await fs.promises.writeFile(require('path').join(__dirname, '../data/modlogs.json'), JSON.stringify(modlogs, null, 2)).catch(() => {});

        // ---------------- LOG EMBED ----------------
        const logEmbed = new EmbedBuilder()
            .setTitle('<:4767voiceevent:1471460087758327992> Member Unmuted')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setColor(0x0c3718)
            .addFields(
                { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: `${message.author}`, inline: true },
                { name: '**<:membr:1464331396284809364> Member :**', value: `${member}`, inline: true },
                { name: '**<:reas:1464333026065518843> Reason:**', value: reason, inline: false },
                { name: '**<a:Earthd:1464307651323363529> Date:**', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: false }
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
