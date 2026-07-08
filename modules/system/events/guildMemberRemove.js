const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const invitesPath = path.join(process.cwd(), "invites.json");
const memberInviterPath = path.join(process.cwd(), "memberInviter.json");
const inviteHistoryPath = path.join(process.cwd(), "inviteHistory.json");

const LEAVE_LOG_CHANNEL_ID = "1417802658923810839";

async function saveJson(filePath, data) {
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Failed to save ${filePath}:`, err);
    }
}

module.exports = {
    name: "guildMemberRemove",

    async execute(member) {
        const client = member.client;
        const guild = member.guild;

        if (!client || !guild) return;

        const channel = guild.channels.cache.get(LEAVE_LOG_CHANNEL_ID);

        try {
            if (!client.inviteData) client.inviteData = {};
            if (!client.memberInviter) client.memberInviter = {};
            if (!Array.isArray(client.inviteHistory)) client.inviteHistory = [];

            const inviterId = client.memberInviter[member.id] || null;

            if (inviterId) {
                if (!client.inviteData[inviterId]) {
                    client.inviteData[inviterId] = { invites: 0, leaves: 0 };
                }

                client.inviteData[inviterId].invites = Number(client.inviteData[inviterId].invites || 0);
                client.inviteData[inviterId].leaves = Number(client.inviteData[inviterId].leaves || 0) + 1;

                const historyRecord = [...client.inviteHistory].reverse().find(record =>
                    record && record.memberId === member.id && record.inviterId === inviterId && !record.leftAt
                );
                if (historyRecord) historyRecord.leftAt = new Date().toISOString();

                delete client.memberInviter[member.id];

                if (typeof client.queueInviteWrite === 'function') {
                    client.queueInviteWrite(invitesPath, client.inviteData);
                    client.queueInviteWrite(memberInviterPath, client.memberInviter);
                    client.queueInviteWrite(inviteHistoryPath, client.inviteHistory);
                } else {
                    await saveJson(invitesPath, client.inviteData);
                    await saveJson(memberInviterPath, client.memberInviter);
                    await saveJson(inviteHistoryPath, client.inviteHistory);
                }
            }

            console.log(`Member leaving: ${member.user.tag} (${member.id}), invited by: ${inviterId || "Unknown"}`);

            const roles = member.roles.cache
                .filter(role => role.id !== guild.id)
                .map(role => role.toString());

            let rolesText = roles.length ? roles.join(", ") : "None";
            if (rolesText.length > 1024) rolesText = rolesText.substring(0, 1021) + "...";

            let memberFor = "Unknown";

            if (member.joinedTimestamp) {
                const diff = Date.now() - member.joinedTimestamp;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const months = Math.floor(days / 30);

                memberFor = months > 0
                    ? `${months} month${months > 1 ? "s" : ""}`
                    : `${days} day${days > 1 ? "s" : ""}`;
            }

            const inviterMention = inviterId ? `<@${inviterId}>` : "Unknown";

            const embed = new EmbedBuilder()
                .setColor(0x584444)
                .setAuthor({
                    name: member.user.username,
                    iconURL: member.user.displayAvatarURL()
                })
                .setDescription(`**<:NOOO:1467939153009311847> ${member.user} left the server. Invited by: ${inviterMention}**`)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    {
                        name: "Member for",
                        value: memberFor,
                        inline: false
                    },
                    {
                        name: "Roles",
                        value: rolesText,
                        inline: false
                    },
                    {
                        name: "IDs",
                        value: `${member.user.tag} (${member.user.id})`,
                        inline: false
                    }
                )
                .setFooter({
                    text: guild.name,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            await channel?.send({ embeds: [embed] }).catch(() => {});

        } catch (err) {
            console.error("guildMemberRemove error:", err);
        }
    }
};