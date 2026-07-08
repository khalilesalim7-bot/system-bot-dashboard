const { joinVoiceChannel } = require("@discordjs/voice");
const { ActivityType } = require("discord.js");
const fs = require("fs");
const path = require("path");

const GUILD_ID = process.env.SYSTEM_GUILD_ID || process.env.GUILD_ID || null;
const VOICE_CHANNEL_ID = process.env.SYSTEM_VOICE_CHANNEL_ID || "1417802588669087798";

const invitesPath = path.join(process.cwd(), "invites.json");
const memberInviterPath = path.join(process.cwd(), "memberInviter.json");
const inviteHistoryPath = path.join(process.cwd(), "inviteHistory.json");

async function loadJson(filePath, defaultValue) {
    try {
        if (!fs.existsSync(filePath)) {
            await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
            return defaultValue;
        }

        const raw = fs.readFileSync(filePath, "utf8");
        return raw ? JSON.parse(raw) : defaultValue;
    } catch (err) {
        console.error(`Failed to load ${filePath}:`, err);
        return defaultValue;
    }
}

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
    name: "ready",
    once: true,

    async execute(client) {
        console.log(`🤖 Logged in as ${client.user.tag}`);

        // Join voice
        const guild = client.guilds.cache.get(GUILD_ID);
        const voiceChannel = guild?.channels.cache.get(VOICE_CHANNEL_ID);

        if (guild && voiceChannel) {
            joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfMute: true,
                selfDeaf: false
            });
        }

        // Presence
        client.user.setPresence({
            status: "dnd",
            activities: [
                {
                    name: "NevertrustahoE",
                    type: ActivityType.Playing
                }
            ]
        });

        // Load invite data
        client.inviteData = await loadJson(invitesPath, {});
        client.memberInviter = await loadJson(memberInviterPath, {});
        client.inviteHistory = await loadJson(inviteHistoryPath, []);
        if (!Array.isArray(client.inviteHistory)) client.inviteHistory = [];
        client.invitesCache = new Map();

        // Cache invites per guild
        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch();
                const cache = buildInviteCache(invites);

                client.invitesCache.set(guild.id, cache);

                invites.forEach(invite => {
                    if (!invite.inviter) return;

                    const inviterId = invite.inviter.id;

                    if (!client.inviteData[inviterId]) {
                        client.inviteData[inviterId] = { invites: 0, leaves: 0 };
                    } else {
                        client.inviteData[inviterId].invites = Number(client.inviteData[inviterId].invites || 0);
                        client.inviteData[inviterId].leaves = Number(client.inviteData[inviterId].leaves || 0);
                    }
                });

                console.log(`✅ Cached ${cache.size} invites for ${guild.name}`);
            } catch (err) {
                console.error(`❌ Error fetching invites for guild ${guild.id}:`, err);
            }
        }

        // Set up debounced invite file writer to prevent race conditions
        const inviteWriteQueue = new Map();
        let inviteWriteTimer = null;
        client.flushInviteWrites = async function () {
            if (inviteWriteTimer) { clearTimeout(inviteWriteTimer); inviteWriteTimer = null; }
            const toWrite = [...inviteWriteQueue.entries()];
            inviteWriteQueue.clear();
            for (const [fp, data] of toWrite) {
                try { await fs.promises.writeFile(fp, JSON.stringify(data, null, 2)); } catch (e) { console.error('Invite write error:', fp, e); }
            }
        };
        client.queueInviteWrite = function (filePath, data) {
            inviteWriteQueue.set(filePath, data);
            if (inviteWriteTimer) clearTimeout(inviteWriteTimer);
            inviteWriteTimer = setTimeout(() => client.flushInviteWrites().catch(() => {}), 2000);
        };

        await client.flushInviteWrites();

        console.log("✅ Invite system ready.");
    }
};