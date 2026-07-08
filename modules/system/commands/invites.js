const { AttachmentBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { renderInviteCard } = require('./inviteCard.cjs');

const allowedRoles = [
    '1417802492187512932',
    '1417802501654052935',
    '1417802499728998541'
];

module.exports = {
    name: 'invites',
    async execute(message, args, client) {
        const hasRole = message.member.roles.cache.some(r => allowedRoles.includes(r.id));
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasRole && !isAdmin) return;

        if (args[0] === 'leaderboard' || args[0] === 'lb' || args[0] === 'top') {
            return showInviteLeaderboard(message, client);
        }

        const target = message.mentions.members.first()
            || await resolveMemberFromId(message, args[0])
            || message.member;

        const data = normalizeInviteStats(client.inviteData?.[target.id]);
        const realInvites = Math.max(0, data.invites - data.leaves);
        const todayInvites = getTodayInvites(client, target.id);

        const cardBuffer = await renderInviteCard({
            username: target.user.username,
            avatarUrl: target.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
            invites: data.invites,
            todayInvites,
            leaves: data.leaves,
            realInvites
        });

        const attachment = new AttachmentBuilder(cardBuffer, { name: 'invite-card.png' });
        return message.channel.send({ files: [attachment] });
    }
};

async function resolveMemberFromId(message, value) {
    const id = String(value || '').replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(id)) return null;
    return message.guild.members.fetch(id).catch(() => null);
}

function normalizeInviteStats(stats) {
    return {
        invites: Number(stats?.invites || 0),
        leaves: Number(stats?.leaves || 0)
    };
}

function getTodayStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function getTodayInvites(client, inviterId) {
    const start = getTodayStart();
    const history = Array.isArray(client.inviteHistory) ? client.inviteHistory : [];

    return history.filter(record => {
        if (!record || record.inviterId !== inviterId) return false;
        const ts = new Date(record.joinedAt || record.createdAt || 0).getTime();
        return Number.isFinite(ts) && ts >= start;
    }).length;
}

async function showInviteLeaderboard(message, client) {
    const data = client.inviteData || {};

    const entries = Object.entries(data)
        .map(([id, stats]) => {
            const normalized = normalizeInviteStats(stats);
            return {
                id,
                invites: normalized.invites,
                todayInvites: getTodayInvites(client, id),
                leaves: normalized.leaves,
                realInvites: Math.max(0, normalized.invites - normalized.leaves)
            };
        })
        .sort((a, b) => b.realInvites - a.realInvites || b.todayInvites - a.todayInvites || b.invites - a.invites)
        .slice(0, 10);

    const lines = [];
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const user = await client.users.fetch(e.id).catch(() => null);
        const name = user ? user.tag : `Unknown (${e.id.slice(0, 6)})`;
        const medal = i === 0 ? '<a:DEv1:1468912308473430136>' : i === 1 ? '<a:30646secondplacetrophy:1468917487449014501>' : i === 2 ? '<a:DV3ww:1468912628830175264>' : `#${i + 1}`;
        lines.push(`${medal} **${name}** — **${e.realInvites} real** • ${e.invites} total • ${e.todayInvites} today • ${e.leaves} leaves`);
    }

    const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle('<a:DVwings:1417989070667255859> Invite Leaderboard')
        .setDescription(lines.length > 0 ? lines.join('\n') : 'No invite data yet.')
        .setFooter({
            text: 'NYXEN Invite System',
            iconURL: client.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    return message.channel.send({ embeds: [embed] });
}
