const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const fs = require("fs");
const path = require("path");

const invitesPath = path.join(process.cwd(), "invites.json");
const memberInviterPath = path.join(process.cwd(), "memberInviter.json");
const inviteHistoryPath = path.join(process.cwd(), "inviteHistory.json");

const OWNER_ID = "1146193819159773254";
const INVITE_LOG_CHANNEL_ID = "1417802662958727230";

async function saveJson(filePath, data) {
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Failed to save ${filePath}:`, err);
    }
}

function buildInviteCache(invites) {
    const map = new Map();

    invites.forEach(invite => {
        map.set(invite.code, invite.uses ?? 0);
    });

    return map;
}

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {
        const client = member.client;
        const guild = member.guild;

        if (!client || !guild) return;

        const logChannel = guild.channels.cache.get(INVITE_LOG_CHANNEL_ID);

        try {
            // ================= Anti Bot Protection =================
            if (member.user.bot) {
                let executor = null;

                try {
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    const fetchedLogs = await guild.fetchAuditLogs({
                        type: AuditLogEvent.BotAdd,
                        limit: 5
                    });

                    const botAddLog = fetchedLogs.entries.find(log =>
                        log.target?.id === member.id &&
                        Date.now() - log.createdTimestamp < 20000
                    );

                    executor = botAddLog?.executor || null;
                } catch (err) {
                    console.error("Error fetching bot audit logs:", err);
                }

                if (!executor) {
                    await logChannel?.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Anti-Bot Warning")
                                .setColor(0xFFA500)
                                .setDescription(`⚠️ Bot **${member.user.tag}** joined, but I could not detect who added it.`)
                                .setTimestamp()
                        ]
                    }).catch(() => {});

                    return;
                }

                if (executor.id !== OWNER_ID) {
                    try {
                        await member.ban({
                            reason: `Anti-bot: added by non-owner (${executor.tag})`
                        });

                        await logChannel?.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("Anti-Bot Action")
                                    .setColor(0xFF0000)
                                    .setDescription(`🚫 Bot **${member.user.tag}** was banned because it was added by **${executor.tag}**.`)
                                    .setTimestamp()
                            ]
                        }).catch(() => {});
                    } catch (err) {
                        console.error("Failed to ban bot:", err);

                        await logChannel?.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("Anti-Bot Error")
                                    .setColor(0xFF0000)
                                    .setDescription(`❌ I could not ban bot **${member.user.tag}**. Check **Ban Members** permission and bot role position.`)
                                    .setTimestamp()
                            ]
                        }).catch(() => {});
                    }

                    return;
                }

                await logChannel?.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Bot Added by Owner")
                            .setColor(0x00FF00)
                            .setDescription(`✅ Bot **${member.user.tag}** was added by allowed owner **${executor.tag}**.`)
                            .setTimestamp()
                    ]
                }).catch(() => {});

                return;
            }

            // ================= Invite Tracking =================
            if (!client.invitesCache) client.invitesCache = new Map();
            if (!client.inviteData) client.inviteData = {};
            if (!client.memberInviter) client.memberInviter = {};
            if (!Array.isArray(client.inviteHistory)) client.inviteHistory = [];

            const oldInvites = client.invitesCache.get(guild.id);

            let newInvites;

            try {
                newInvites = await guild.invites.fetch();
            } catch (err) {
                console.error("Error fetching invites:", err);

                await logChannel?.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Invite Log Error")
                            .setColor(0xFF0000)
                            .setDescription(`❌ <@${member.id}> joined, but I could not fetch invites.\n\nCheck permission: **Manage Server**.`)
                            .setTimestamp()
                    ]
                }).catch(() => {});

                return;
            }

            if (!oldInvites) {
                client.invitesCache.set(guild.id, buildInviteCache(newInvites));

                await logChannel?.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Invite Log")
                            .setColor(0xFFA500)
                            .setThumbnail(member.user.displayAvatarURL())
                            .setDescription(`👤 <@${member.id}> joined, but invite cache was missing.\n\nCache is updated now. Next joins should be detected.`)
                            .setTimestamp()
                    ]
                }).catch(() => {});

                return;
            }

            const usedInvite = newInvites.find(invite => {
                const oldUses = oldInvites.get(invite.code) ?? 0;
                const newUses = invite.uses ?? 0;

                return newUses > oldUses;
            });

            // Update cache always
            client.invitesCache.set(guild.id, buildInviteCache(newInvites));

            if (!usedInvite || !usedInvite.inviter) {
                await logChannel?.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Invite Log")
                            .setColor(0xFFA500)
                            .setThumbnail(member.user.displayAvatarURL())
                            .setDescription(`👤 <@${member.id}> joined, but I could not detect the invite.`)
                            .addFields({
                                name: "Possible reasons",
                                value: "Vanity invite, deleted invite, max-use invite, temporary invite, or cache issue."
                            })
                            .setTimestamp()
                    ]
                }).catch(() => {});

                return;
            }

            const inviter = usedInvite.inviter;
            const inviterId = inviter.id;

            if (!client.inviteData[inviterId]) {
                client.inviteData[inviterId] = { invites: 0, leaves: 0 };
            }

            client.inviteData[inviterId].invites = Number(client.inviteData[inviterId].invites || 0) + 1;
            client.inviteData[inviterId].leaves = Number(client.inviteData[inviterId].leaves || 0);
            client.memberInviter[member.id] = inviterId;

            client.inviteHistory.push({
                id: `${Date.now()}_${member.id}`,
                guildId: guild.id,
                memberId: member.id,
                memberTag: member.user.tag,
                inviterId,
                inviterTag: inviter.tag,
                inviteCode: usedInvite.code,
                joinedAt: new Date().toISOString()
            });
            if (client.inviteHistory.length > 10000) client.inviteHistory = client.inviteHistory.slice(-10000);

            if (typeof client.queueInviteWrite === 'function') {
                client.queueInviteWrite(invitesPath, client.inviteData);
                client.queueInviteWrite(memberInviterPath, client.memberInviter);
                client.queueInviteWrite(inviteHistoryPath, client.inviteHistory);
            } else {
                await saveJson(invitesPath, client.inviteData);
                await saveJson(memberInviterPath, client.memberInviter);
                await saveJson(inviteHistoryPath, client.inviteHistory);
            }

            await logChannel?.send({
                content: `<@${member.id}> joined! Invited by <@${inviterId}>`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Invite Log")
                        .setColor(0xae5f5f)
                        .setThumbnail(member.user.displayAvatarURL())
                        .addFields(
                            {
                                name: "Member",
                                value: `<@${member.id}>`,
                                inline: true
                            },
                            {
                                name: "Invited by",
                                value: `<@${inviterId}>`,
                                inline: true
                            },
                            {
                                name: "Total Invites",
                                value: `${client.inviteData[inviterId].invites}`,
                                inline: true
                            },
                            {
                                name: "Leaves",
                                value: `${client.inviteData[inviterId].leaves}`,
                                inline: true
                            },
                            {
                                name: "Invite Code",
                                value: `${usedInvite.code}`,
                                inline: true
                            },
                            {
                                name: "Invite Uses",
                                value: `${usedInvite.uses ?? 0}`,
                                inline: true
                            },
                            {
                                name: "Joined at",
                                value: `<t:${Math.floor(Date.now() / 1000)}:F>`
                            }
                        )
                        .setTimestamp()
                        .setFooter({
                            text: "Draven System",
                            iconURL: client.user.displayAvatarURL()
                        })
                ]
            }).catch(() => {});

        } catch (err) {
            console.error("guildMemberAdd error:", err);

            await logChannel?.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("guildMemberAdd Error")
                        .setColor(0xFF0000)
                        .setDescription(`❌ Unexpected error while tracking <@${member.id}>.`)
                        .setTimestamp()
                ]
            }).catch(() => {});
        }
    }
};