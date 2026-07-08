const { EmbedBuilder } = require('discord.js');
const modlogs = require('../data/modlogs.json');

// ROLE اللي مسموح
const allowedRoleId = '1417802492187512932';

module.exports = {
    name: 'modlog',
    description: 'Show logs membre',
    async execute(message, args) {

        // === PERMISSION CHECK (ROLE OR ADMIN) ===
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member) return;

        if (
            !member.roles.cache.has(allowedRoleId) &&
            !member.permissions.has('Administrator')
        ) {
            return; // ❌ silent (ما يبان حتى والو)
        }
        // =======================================

        const userId = args[0];
        if (!userId) return message.reply('<a:DVvxXx:1467408812083253258> **Missed  \'MEMBER ID**.');

        // Essayer de récupérer le membre du serveur pour mentionner
        let targetMember;
        try {
            targetMember = await message.guild.members.fetch(userId);
        } catch {
            targetMember = null;
        }

        const userLogs = modlogs[userId];

        if (!userLogs || !userLogs.history || userLogs.history.length === 0) {
            const noLogsEmbed = new EmbedBuilder()
                .setTitle(`MOD LOGS ${targetMember ? targetMember.user.tag : userId}`)
                .setDescription('**No logs for this member**')
                .setColor(0x806262)
                .setTimestamp();

            return message.channel.send({ embeds: [noLogsEmbed] });
        }

        // Trier logs par date décroissante
        const sortedLogs = userLogs.history.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        const fields = sortedLogs.slice(0, 10).map((log, index) => {
            const actionUpper = log.action.toUpperCase();
            const date = new Date(log.date).toLocaleDateString('fr-FR');
            const mod = log.by || 'UNKNOWN';
            let reason = log.reason || '**No reason provided**';
            if (reason.length > 1024) reason = reason.substring(0, 1021) + '...';
            const id = log.id || `<:criminal1:1422637514413576252>${index + 1}`;

            return {
                name: `${id} | ${actionUpper} | ${date}`,
                value: `**Responsible:** ${mod}\n**Reason:** ${reason}`
            };
        });

        const embed = new EmbedBuilder()
            .setTitle(`MOD LOGS ${targetMember ? targetMember.user.tag : userId}`)
            .addFields(fields)
            .setColor(0x000000)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }
};
