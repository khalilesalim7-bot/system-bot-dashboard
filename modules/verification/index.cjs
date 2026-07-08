const fs = require('fs');
const path = require('path');
const {
    Client,
    GatewayIntentBits,
    Partials,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    Events,
    PermissionsBitField,
    AttachmentBuilder
} = require('discord.js');
const { renderVerifyCard } = require('./verifyCard.cjs');

function registerVerification(client) {

// ---------------- FILE HELPERS ----------------
function loadJsonFile(filePath, defaultValue) {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`Failed to load ${filePath}:`, err);
        return defaultValue;
    }
}

async function saveJsonFile(filePath, data) {
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Failed to save ${filePath}:`, err);
    }
}

function limitText(text, max = 1024) {
    const value = String(text || 'None');
    if (value.length <= max) return value;
    return value.slice(0, max - 3) + '...';
}

// ---------------- Blacklist ----------------
const BLACKLIST_FILE = path.join(__dirname, 'blacklist.json');
let blacklist = loadJsonFile(BLACKLIST_FILE, []);

async function saveBlacklist() {
    await saveJsonFile(BLACKLIST_FILE, blacklist);
}

function findBlacklistedUser(userId) {
    return blacklist.find(u => u.id === userId);
}

function isBlacklisted(userId) {
    return Boolean(findBlacklistedUser(userId));
}

// ---------------- Verification Counter ----------------
const VERIFICATION_FILE = path.join(__dirname, 'verification_count.json');
let verificationCounter = loadJsonFile(VERIFICATION_FILE, {});

async function saveVerificationCounter() {
    await saveJsonFile(VERIFICATION_FILE, verificationCounter);
}

async function updateVerificationCount(verifierId) {
    verificationCounter[verifierId] = (verificationCounter[verifierId] || 0) + 1;
    await saveVerificationCounter();
}

// ---------------- Verification History ----------------
const VERIFICATION_HISTORY_FILE = path.join(__dirname, 'verification_history.json');
let verificationHistory = loadJsonFile(VERIFICATION_HISTORY_FILE, []);

async function saveVerificationHistory() {
    await saveJsonFile(VERIFICATION_HISTORY_FILE, verificationHistory);
}

async function addVerificationHistory(record) {
    verificationHistory.push(record);

    // Keep the file from becoming too huge. Latest 5000 records only.
    if (verificationHistory.length > 5000) {
        verificationHistory = verificationHistory.slice(-5000);
    }

    await saveVerificationHistory();
}

function getHistoryForUser(userId, limit = 5) {
    return verificationHistory
        .filter(item => item.targetId === userId || item.verifierId === userId)
        .sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime())
        .slice(0, limit);
}

// ---------------- Panel Message Save ----------------
const PANEL_FILE = path.join(__dirname, 'panel_message.json');
let panelData = loadJsonFile(PANEL_FILE, {});

async function savePanelData() {
    await saveJsonFile(PANEL_FILE, panelData);
}

// ---------------- Runtime Verify Locks ----------------
// This prevents two staff members from verifying the same user at the same time.
// Locks are in memory and reset when the bot restarts.
const VERIFY_LOCK_MS = Number(process.env.VERIFY_LOCK_MINUTES || 5) * 60 * 1000;
const verifyLocks = new Map();

function cleanupExpiredLocks() {
    const now = Date.now();
    for (const [userId, lock] of verifyLocks.entries()) {
        if (!lock.expiresAt || lock.expiresAt <= now) {
            verifyLocks.delete(userId);
        }
    }
}

function getActiveLock(userId) {
    cleanupExpiredLocks();
    return verifyLocks.get(userId) || null;
}

function lockUserForVerification(userId, verifier) {
    cleanupExpiredLocks();

    verifyLocks.set(userId, {
        userId,
        verifierId: verifier.id,
        verifierTag: verifier.user ? verifier.user.tag : verifier.displayName,
        startedAt: Date.now(),
        expiresAt: Date.now() + VERIFY_LOCK_MS
    });
}

function releaseVerificationLock(userId) {
    verifyLocks.delete(userId);
}

function isLockOwner(userId, member) {
    const lock = getActiveLock(userId);

    // If no active lock exists, allow the interaction.
    // This avoids breaking old ephemeral interactions after bot restart.
    if (!lock) return true;

    if (lock.verifierId === member.id) return true;

    // Admin can bypass stuck locks.
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

    return false;
}

function lockMessage(userId) {
    const lock = getActiveLock(userId);
    if (!lock) return null;

    const expiresUnix = Math.floor(lock.expiresAt / 1000);
    return `**This user is already being verified by <@${lock.verifierId}>.**\nLock expires <t:${expiresUnix}:R>.`;
}

// ---------------- IDs ----------------
const guildId = process.env.GUILD_ID;
const controlPanelChannelId = process.env.CONTROL_PANEL_CHANNEL;

const verificationLogChannelId = process.env.VERIFICATION_LOG_CHANNEL || '1471106563983806594';
const blacklistLogChannelId = process.env.BLACKLIST_LOG_CHANNEL || '1471106340809216206';
const voiceNotifyChannelId = process.env.VOICE_LOG_CHANNEL || '1471106530777632871';
const girlsVoiceNotifyChannelId = process.env.GIRLS_VOICE_LOG_CHANNEL || '1517940293335515289';

const notVerifiedRoleId = process.env.NOT_VERIFIED_ROLE;
const manRoleId = process.env.MAN_ROLE;
const girlRoleId = process.env.GIRL_ROLE;
const verifiedRoleId = process.env.VERIFIED_ROLE;
const staffRoleId = process.env.STAFF_ROLE;

const verificationTeamRoleId = process.env.VERIFICATION_TEAM_ROLE || '1425872836874211461'; // Verification Team
const notificationRoleId = process.env.NOTIFICATION_ROLE || '1417802581521989642'; // Only this role gets VC notifications
const verificationCategoryId = process.env.VERIFICATION_CATEGORY || '1417802603512729601';

const baseAllowedVoices = process.env.ALLOWED_VOICES
    ? process.env.ALLOWED_VOICES.split(',').map(id => id.trim()).filter(Boolean)
    : [
        '1417802664200110201',
        '1417802666754441369',
        '1417802667744428113'
    ];

const girlsVerificationVoices = process.env.GIRLS_VERIFICATION_VOICES
    ? process.env.GIRLS_VERIFICATION_VOICES.split(',').map(id => id.trim()).filter(Boolean)
    : ['1517940034597294163', '1517940096530251917'];

const allowedVoices = [...new Set([...baseAllowedVoices, ...girlsVerificationVoices])];
const notificationCooldownMs = Number(process.env.VERIFICATION_NOTIFY_COOLDOWN_SECONDS || 180) * 1000;
const verificationNotifyCooldowns = new Map();

// ---------------- English Manual Verification ----------------
const ENGLISH_VERIFICATION_CHANNEL_ID = '1521959707655409674';
const ENGLISH_ROLE_ID = '1417802570168012913';
const ENGLISH_STAFF_ROLE_ID = '1417802568888745995';
const ENGLISH_CHAT_CHANNEL_ID = '';
const ENGLISH_VERIFY_VOICE_IDS = ['1521961229235785840', '1521961303655321811'];
const ENGLISH_VERIFICATION_FILE = path.join(__dirname, 'english_verification_panel.json');
let englishPanelData = loadJsonFile(ENGLISH_VERIFICATION_FILE, {});
async function saveEnglishPanelData() {
    await saveJsonFile(ENGLISH_VERIFICATION_FILE, englishPanelData);
}

const allowedCommandChannels = process.env.ALLOWED_COMMAND_CHANNELS
    ? process.env.ALLOWED_COMMAND_CHANNELS.split(',').map(id => id.trim()).filter(Boolean)
    : [];

const verifyCommandChannels = process.env.VERIFY_COMMAND_CHANNELS
    ? process.env.VERIFY_COMMAND_CHANNELS.split(',').map(id => id.trim()).filter(Boolean)
    : [];

function getVerificationNotifyChannelId(channelId) {
    return girlsVerificationVoices.includes(channelId)
        ? girlsVoiceNotifyChannelId
        : voiceNotifyChannelId;
}

function recentlyNotifiedVerification(memberId, channelId) {
    const key = `${memberId}:${channelId}`;
    const now = Date.now();
    const last = verificationNotifyCooldowns.get(key) || 0;

    if (now - last < notificationCooldownMs) return true;

    verificationNotifyCooldowns.set(key, now);
    return false;
}
const DmGif = 'https://media.discordapp.net/attachments/1503073201264267395/1521879110836682933/video_202607010701.gif?ex=6a466fdf&is=6a451e5f&hm=2d424d5ea6c3cb4e4c31fafe0c1f10924acdc8abb92c3237a2d6c1aff585cd5b&=&width=600&height=58';
const DmGif22 = 'https://media.discordapp.net/attachments/1477629389238960261/1516500112522612966/4b62a44b-e32a-491b-94db-487673f8c6a3_0_1.gif?ex=6a32de4a&is=6a318cca&hm=87f5ba1de3da6e88e68bebb5c8907c56c64ddfaea30ecd32cb1bc7ad78eebde6&=&width=512&height=220';

// ---------------- PERMISSION CHECK ----------------
function canUseBot(member) {
    if (!member) return false;

    // Admin يقدر يخدم من أي بلاصة
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return true;
    }

    // خاص يكون عندو Verification Team role
    if (!member.roles.cache.has(verificationTeamRoleId)) {
        return false;
    }

    // خاص يكون داخل voice
    if (!member.voice.channelId) return false;

    // خاص يكون داخل واحد من voices المسموحين
    if (!allowedVoices.includes(member.voice.channelId)) return false;

    return true;
}

async function getGuild() {
    const guildFromCache = client.guilds.cache.get(guildId);
    if (guildFromCache) return guildFromCache;
    return client.guilds.fetch(guildId);
}

async function fetchMember(guild, userId) {
    try {
        return await guild.members.fetch(userId);
    } catch (err) {
        return null;
    }
}

function isValidSnowflake(id) {
    return /^\d{17,20}$/.test(id);
}

// ---------------- ACCOUNT INFO + RISK HELPERS ----------------
function getDaysSince(timestamp) {
    if (!timestamp) return null;
    return Math.floor((Date.now() - timestamp) / 86400000);
}

function discordTime(timestamp, style = 'F') {
    if (!timestamp) return 'Unknown';
    return `<t:${Math.floor(timestamp / 1000)}:${style}>`;
}

function formatAgeStatus(days) {
    if (days === null || Number.isNaN(days)) return 'Unknown';

    if (days < 1) {
        return '<a:warninggh:1521229272411410442> **NEW ACCOUNT — less than 1 day old**';
    }

    if (days < 3) {
        return `<a:warninggh:1521229272411410442> **UNDER 3 DAYS** — ${days} day(s) old`;
    }

    return `<:586735checkmark:1472282353337368587> **3+ DAYS** — ${days} day(s) old`;
}

function formatJoinStatus(days) {
    if (days === null || Number.isNaN(days)) return 'Unknown';

    if (days < 1) {
        return '<a:warninggh:1521229272411410442> Joined this server less than 1 day ago';
    }

    if (days < 7) {
        return `<a:warninggh:1521229272411410442> Joined this server ${days} day(s) ago`;
    }

    return `<:586735checkmark:1472282353337368587> Joined this server ${days} day(s) ago`;
}

function getNormalRoleCount(member) {
    // minus @everyone
    return Math.max(member.roles.cache.size - 1, 0);
}

function getHighestRole(member) {
    const highest = member.roles.highest;
    if (!highest || highest.id === member.guild.id) return '@everyone';
    return `<@&${highest.id}>`;
}

function getRiskInfo(member) {
    const accountDays = getDaysSince(member.user.createdTimestamp);
    const joinDays = getDaysSince(member.joinedTimestamp);
    const roleCount = getNormalRoleCount(member);

    const warnings = [];

    if (accountDays !== null && accountDays < 1) {
        warnings.push('<a:warninggh:1521229272411410442> Account is less than 1 day old.');
    } else if (accountDays !== null && accountDays < 3) {
        warnings.push('<a:warninggh:1521229272411410442> Account is less than 3 days old.');
    }

    if (warnings.length === 0) {
        warnings.push('**<:586735checkmark:1472282353337368587> No major warning detected.**');
    }

    return {
        level: 'LOW',
        color: 0x1f8b4c,
        warnings,
        accountDays,
        joinDays,
        roleCount
    };
}

function buildAccountInfoEmbed(member, verifier) {
    const risk = getRiskInfo(member);

    const embed = new EmbedBuilder()
        .setTitle('<a:lottieflowmultimedia84f5dc1cease:1516352164589731890> Account Information')
        .setDescription(`**Review this info before choosing the gender role.**\n\nUser: <@${member.id}>`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: 'User Tag', value: `${member.user.tag}`, inline: true },
            { name: 'User ID', value: `${member.id}`, inline: true },

            { name: 'Account Created', value: `${discordTime(member.user.createdTimestamp, 'F')}\n${discordTime(member.user.createdTimestamp, 'R')}`, inline: false },

            { name: '<:94851login:1472373093535322199> Joined Server', value: member.joinedTimestamp ? `${discordTime(member.joinedTimestamp, 'F')}\n${discordTime(member.joinedTimestamp, 'R')}` : 'Unknown', inline: false },

            { name: '<:874346wrong:1468911435986894900> Blacklist Status', value: isBlacklisted(member.id) ? 'Blacklisted ❌' : 'Not blacklisted <:586735checkmark:1472282353337368587>', inline: true }
        )
        .setFooter({
            text: `Requested by ${verifier.user.tag} • Choose gender below if everything looks okay.`,
            iconURL: verifier.user.displayAvatarURL({ dynamic: true })
        })
        .setColor(0xd3d3d3)
        .setTimestamp();

    return embed;
}

function buildRiskContent(member) {
    const risk = getRiskInfo(member);
    return risk.warnings.join('\n');
}

// ---------------- DM WELCOME ----------------
async function sendWelcomeDM(target) {
    try {
        const dmEmbed = new EmbedBuilder()
            .setDescription(`## <a:DVcwcrown:1417989123859546203> WELCOME TO NYXEN
**
## <:23:1473011496446464112> 𝐋𝐄𝐕𝐄𝐋 𝐑𝐎𝐋𝐄𝐒 :

**<a:arewws:1516459068519223326> Discover available ranks and how to unlock them.** https://discord.com/channels/1417800065967325216/1417802733213450323

## <a:3685yellowsparklingstars:1467927818548678850> 𝐒𝐄𝐋𝐅 𝐑𝐎𝐋𝐄𝐒 :

**<a:arewws:1516459068519223326> Customize your profile with self-assignable roles.** https://discord.com/channels/1417800065967325216/1417802752695734362

## <a:36514gameboy:1467957183869095986> 𝐆𝐀𝐌𝐈𝐍𝐆 𝐑𝐎𝐋𝐄𝐒 :

**<a:arewws:1516459068519223326> Choose your favorite games and get notified when it matters.** https://discord.com/channels/1417800065967325216/1417802761696837642

### Welcome aboard! <a:DVcheartbo:1417989110567665766> 
`)
            .setColor(0xc7c7c7)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setImage(DmGif)
            .setTimestamp();

        await target.send({ embeds: [dmEmbed] });
        return true;
    } catch (err) {
        return false;
    }
}

// ---------------- LOGS ----------------
async function logVerification(guild, verifier, target, data) {
    const logChannel = guild.channels.cache.get(verificationLogChannelId);
    if (!logChannel) return;

    const risk = getRiskInfo(target);

    const fields = [
        { name: '**<:AR_shield:1463435777894781071> Verified By :**', value: `<@${verifier.id}>`, inline: true },
        { name: '**<:membr:1464331396284809364> User :**', value: `<@${target.id}>`, inline: true },
        { name: '**<a:arrowhite:1463491321741185133> Gender :**', value: data.gender || 'Unknown', inline: true },
        { name: '**<a:arrowgold:1463491747303657520> Staff Answer :**', value: data.staffAnswer || 'Unknown', inline: true },
        { name: '**Risk Level :**', value: risk.level, inline: true },
        { name: '**DM Status :**', value: data.dmSent ? 'Sent <:586735checkmark:1472282353337368587>' : 'Failed / Closed DMs ⚠️', inline: true },
        { name: '**Account Created :**', value: `${discordTime(target.user.createdTimestamp, 'F')}\n${formatAgeStatus(risk.accountDays)}`, inline: false },
        { name: '**<:94851login:1472373093535322199>  Joined Server :**', value: target.joinedTimestamp ? `${discordTime(target.joinedTimestamp, 'F')}\n${formatJoinStatus(risk.joinDays)}` : 'Unknown', inline: false },
        { name: '**Verify Notes :**', value: limitText(data.notes || 'No notes.'), inline: false }
    ];

    if (data.serverName) {
        fields.push({ name: '**<a:Dvee:1469295057944182889> Server :**', value: limitText(data.serverName), inline: true });
    }

    const embed = new EmbedBuilder()
        .setTitle('Verification Done <a:lottieflowcheckbox05fffffflinear:1516504402599346309>')
        .setThumbnail(verifier.user.displayAvatarURL({ dynamic: true }))
        .addFields(fields)
        .setColor(data.staffAnswer === 'Yes' ? 0x800e0e : 0xbdbdbd)
        .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
}

async function logBlacklistedAttempt(guild, moderator, target, blacklistedUser) {
    const logChannel = guild.channels.cache.get(blacklistLogChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle('<a:alertttt:1465708147711807571> Blacklisted User')
        .setDescription(`**<@${target.id}> tried to verify but is blacklisted.**`)
        .addFields(
            { name: '**<:reas:1464333026065518843> Reason :**', value: limitText(blacklistedUser.reason || 'No reason saved.') },
            { name: '**<:membr:1464331396284809364> User :**', value: `<@${target.id}>`, inline: true },
            { name: '**<:525884securityshield:1468921416081604648> Moderator :**', value: `<@${moderator.id}>`, inline: true }
        )
        .setColor(0xff0000)
        .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(console.error);
}

async function completeVerification({ interaction, guild, verifier, target, staffAnswer, serverName = null, notes = '' }) {
    if (!isLockOwner(target.id, verifier)) {
        const msg = lockMessage(target.id) || 'This verification lock belongs to another staff member.';
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({ content: msg, embeds: [], components: [] });
        }
        return interaction.reply({ content: msg, ephemeral: true });
    }

    if (isBlacklisted(target.id)) {
        const blacklistedUser = findBlacklistedUser(target.id);
        await logBlacklistedAttempt(guild, verifier, target, blacklistedUser);
        releaseVerificationLock(target.id);

        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({
                content: '**<:92042no:1467300968491253993> This user is blacklisted and cannot be verified.**',
                embeds: [],
                components: []
            });
        }

        return interaction.reply({
            content: '**<:92042no:1467300968491253993> This user is blacklisted and cannot be verified.**',
            ephemeral: true
        });
    }

    await target.roles.add(verifiedRoleId);
    await target.roles.remove(notVerifiedRoleId).catch(() => {});

    await updateVerificationCount(verifier.id);
    const dmSent = await sendWelcomeDM(target);

    const risk = getRiskInfo(target);
    const gender = target.roles.cache.has(manRoleId) ? 'Man' : target.roles.cache.has(girlRoleId) ? 'Girl' : 'Unknown';

    const record = {
        id: `${Date.now()}_${target.id}`,
        targetId: target.id,
        targetTag: target.user.tag,
        verifierId: verifier.id,
        verifierTag: verifier.user.tag,
        gender,
        staffAnswer,
        serverName: serverName || null,
        notes: notes || '',
        dmSent,
        riskLevel: risk.level,
        riskWarnings: risk.warnings,
        accountCreatedAt: new Date(target.user.createdTimestamp).toISOString(),
        accountAgeDays: risk.accountDays,
        joinedServerAt: target.joinedTimestamp ? new Date(target.joinedTimestamp).toISOString() : null,
        joinAgeDays: risk.joinDays,
        verifiedAt: new Date().toISOString()
    };

    await addVerificationHistory(record);

    await logVerification(guild, verifier, target, {
        gender,
        staffAnswer,
        serverName,
        notes,
        dmSent
    });

    releaseVerificationLock(target.id);

    const successMessage = serverName
        ? `${target.user.username} **<:9d8af2a4f37e0ea4b9e20a897ab52fed:1516038505048969258> verified successfully with staff server info.**`
        : `${target.user.username} **<:9d8af2a4f37e0ea4b9e20a897ab52fed:1516038505048969258> verified successfully.**`;

    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
            content: successMessage,
            embeds: [],
            components: []
        });
    }

    return interaction.reply({
        content: successMessage,
        ephemeral: true
    });
}

// ---------------- LEADERBOARDS ----------------
function getLeaderboardRange(mode) {
    const now = Date.now();

    if (mode === 'weekly') {
        return {
            title: 'Weekly Verifiers Leaderboard',
            since: now - 7 * 24 * 60 * 60 * 1000
        };
    }

    if (mode === 'monthly') {
        return {
            title: 'Monthly Verifiers Leaderboard',
            since: now - 30 * 24 * 60 * 60 * 1000
        };
    }

    return {
        title: 'All-Time Verifiers Leaderboard',
        since: 0
    };
}

function buildLeaderboard(mode = 'all') {
    const range = getLeaderboardRange(mode);
    const counts = {};

    if (mode === 'all') {
        for (const [userId, count] of Object.entries(verificationCounter)) {
            counts[userId] = count;
        }
    } else {
        for (const item of verificationHistory) {
            const verifiedAt = new Date(item.verifiedAt).getTime();
            if (!verifiedAt || verifiedAt < range.since) continue;
            counts[item.verifierId] = (counts[item.verifierId] || 0) + 1;
        }
    }

    const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    return { title: range.title, top };
}

// ---------------- Control Panel ----------------
function buildControlPanelPayload() {
    const embed = new EmbedBuilder()
        .setColor(0x6f0d0d)
        .setImage(DmGif22);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('verify_user')
                .setLabel('Verify User')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<a:lottieflowcheckbox05fffffflinear:1516504402599346309>'),

            new ButtonBuilder()
                .setCustomId('blacklist_user')
                .setLabel('Blacklist')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<a:lottieflowmenunav115f30202easey:1516352802933444639>'),

            new ButtonBuilder()
                .setCustomId('unblacklist_user')
                .setLabel('Unblacklist')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<a:lottieflowmultimedia84f5dc1cease:1516352164589731890>')
        );

    return { embeds: [embed], components: [row] };
}

// ---------------- English Manual Verification Panel ----------------
function buildEnglishVerificationPanel(guild) {
    const embed = new EmbedBuilder()
        .setColor(0xbbbbbb)
        .setTitle('<:23:1473011496446464112> English Section Verification')
        .setDescription(`
**<a:3685yellowsparklingstars:1467927818548678850> Secure • Fast • Staff-Only Verification**

<a:arewws:1516459068519223326>our verification system is made to keep the section clean, safe, and organized.  

       `)
        .setFooter({ text: 'NYXEN Community  •  English Verification' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('english_verify_open')
            .setLabel('Verify Member')
            .setEmoji('<a:lottieflowcheckbox05fffffflinear:1516504402599346309>')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

async function ensureEnglishVerificationPanel(guild) {
    try {
        const channel = await client.channels.fetch(ENGLISH_VERIFICATION_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.warn('English verification panel skipped: channel not found.');
            return;
        }

        const payload = buildEnglishVerificationPanel(guild);

        if (englishPanelData.messageId) {
            try {
                const oldMessage = await channel.messages.fetch(englishPanelData.messageId);
                if (oldMessage.author?.id === client.user.id) {
                    await oldMessage.edit(payload);
                    console.log('English verification panel updated.');
                    return;
                }
            } catch (_) {
                // Saved message not found, will send new one
            }
        }

        const sent = await channel.send(payload);
        englishPanelData = { messageId: sent.id, channelId: ENGLISH_VERIFICATION_CHANNEL_ID, savedAt: new Date().toISOString() };
        await saveEnglishPanelData();
        console.log('English verification panel sent and saved.');
    } catch (err) {
        console.warn('English verification panel error:', err?.message || err);
    }
}

async function sendOrUpdateControlPanel() {
    try {
        if (!controlPanelChannelId) {
            console.warn('Verification control panel skipped: CONTROL_PANEL_CHANNEL is not set.');
            return;
        }

        const channel = await client.channels.fetch(controlPanelChannelId);
        if (!channel) return console.warn('Verification control panel skipped: channel not found.');

        const payload = buildControlPanelPayload();

        if (panelData.channelId === controlPanelChannelId && panelData.messageId) {
            try {
                const oldMessage = await channel.messages.fetch(panelData.messageId);
                if (oldMessage.author?.id !== client.user.id) {
                    console.log('Saved panel belongs to another bot. Sending a new verification panel...');
                } else {
                await oldMessage.edit(payload);
                console.log('Control panel updated.');
                return;
                }
            } catch (err) {
                console.log('Saved panel message not found. Sending a new panel...');
            }
        }

        const sent = await channel.send(payload);
        panelData = {
            channelId: controlPanelChannelId,
            messageId: sent.id,
            savedAt: new Date().toISOString()
        };
        await savePanelData();

        console.log('Control panel sent and saved.');
    } catch (err) {
        const reason = err?.code === 50001
            ? 'missing access to CONTROL_PANEL_CHANNEL'
            : (err?.message || 'unknown error');
        console.warn(`Verification control panel skipped: ${reason}.`);
    }
}

// ---------------- READY ----------------
client.once(Events.ClientReady, async () => {
    const guild = await getGuild().catch(() => null);
    await sendOrUpdateControlPanel();
    await ensureEnglishVerificationPanel(guild).catch(err => console.error('English verification panel error:', err));
});

// ---------------- COMMAND HANDLER ----------------
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const args = content.split(/\s+/);
    const command = args[0].toLowerCase();

    // .verify works anywhere for Verification Team/Admin.
    // Other verification text commands still follow ALLOWED_COMMAND_CHANNELS.
    if (command !== '.verify' && allowedCommandChannels.length > 0 && !allowedCommandChannels.includes(message.channel.id)) return;

    const member = message.member;
    const canUseVerifyStats = member && (
        member.roles.cache.has(verificationTeamRoleId) ||
        member.permissions.has(PermissionsBitField.Flags.Administrator)
    );
    if (!canUseVerifyStats) return;

    if (command === '.verify') {
        if (verifyCommandChannels.length > 0 && !verifyCommandChannels.includes(message.channel.id)) {
            return message.reply('This command is not enabled in this channel.');
        }

        try {
            const count = verificationCounter[member.id] || 0;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const todayCount = verificationHistory.filter(
                item => item.verifierId === member.id && new Date(item.verifiedAt).getTime() >= todayStart
            ).length;
            const totalCount = Object.values(verificationCounter).reduce((sum, c) => sum + c, 0);

            const cardBuffer = await renderVerifyCard({
                username: member.user.username,
                avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
                userVerifications: count,
                todayVerifications: todayCount,
                totalVerifications: totalCount
            });

            const attachment = new AttachmentBuilder(cardBuffer, { name: 'verify-card.png' });
            return message.reply({ files: [attachment] });
        } catch (err) {
            console.error('.verify error:', err);
            const count = verificationCounter[member.id] || 0;
            return message.reply(`You have completed **${count} verifications**.`);
        }
    }

    if (command === '.topverify') {
        const mode = (args[1] || 'all').toLowerCase();

        if (!['all', 'weekly', 'monthly'].includes(mode)) {
            return message.reply('Usage: `.topverify`, `.topverify weekly`, or `.topverify monthly`');
        }

        const leaderboard = buildLeaderboard(mode);

        if (leaderboard.top.length === 0) {
            return message.reply(`No verification data yet for **${mode}**.`);
        }

        const description = leaderboard.top
            .map(([userId, count], index) => `**${index + 1}.** <@${userId}> — **${count}** verifications`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle(leaderboard.title)
            .setDescription(description)
            .setColor(0x192a61)
            .setFooter({ text: 'Modes: .topverify all | .topverify weekly | .topverify monthly' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    if (command === '.history') {
        const userId = args[1];

        if (!userId || !isValidSnowflake(userId)) {
            return message.reply('Usage: `.history USER_ID`');
        }

        const history = getHistoryForUser(userId, 5);

        if (history.length === 0) {
            return message.reply(`No verification history found for <@${userId}>.`);
        }

        const embed = new EmbedBuilder()
            .setTitle('Verification History')
            .setDescription(`Latest records related to <@${userId}>`)
            .setColor(0x192a61)
            .setTimestamp();

        history.forEach((item, index) => {
            const verifiedUnix = Math.floor(new Date(item.verifiedAt).getTime() / 1000);

            embed.addFields({
                name: `#${index + 1} • <t:${verifiedUnix}:R>`,
                value:
                    `**User:** <@${item.targetId}> (${item.targetTag || 'Unknown'})\n` +
                    `**Verified By:** <@${item.verifierId}> (${item.verifierTag || 'Unknown'})\n` +
                    `**Gender:** ${item.gender || 'Unknown'}\n` +
                    `**Staff Answer:** ${item.staffAnswer || 'Unknown'}\n` +
                    `**Risk:** ${item.riskLevel || 'Unknown'}\n` +
                    `**Notes:** ${limitText(item.notes || 'No notes.', 500)}`,
                inline: false
            });
        });

        return message.reply({ embeds: [embed] });
    }

    if (command === '.blacklistcheck') {
        const userId = args[1];

        if (!userId || !isValidSnowflake(userId)) {
            return message.reply('Usage: `.blacklistcheck USER_ID`');
        }

        const blacklistedUser = findBlacklistedUser(userId);
        if (!blacklistedUser) {
            return message.reply(`User <@${userId}> is not blacklisted.`);
        }

        const embed = new EmbedBuilder()
            .setTitle('Blacklist Check')
            .addFields(
                { name: 'User', value: `<@${userId}> (${userId})` },
                { name: 'Reason', value: limitText(blacklistedUser.reason || 'No reason saved.') },
                { name: 'Blacklisted By', value: blacklistedUser.moderatorId ? `<@${blacklistedUser.moderatorId}>` : 'Unknown' },
                { name: 'Date', value: blacklistedUser.createdAt ? `<t:${Math.floor(new Date(blacklistedUser.createdAt).getTime() / 1000)}:F>` : 'Unknown' }
            )
            .setColor(0xff0000)
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    if (command === '.userinfo') {
        const userId = args[1];

        if (!userId || !isValidSnowflake(userId)) {
            return message.reply('Usage: `.userinfo USER_ID`');
        }

        const guild = await getGuild().catch(() => null);
        if (!guild) return message.reply('Guild not found.');

        const target = await fetchMember(guild, userId);
        if (!target) return message.reply('User not found in this server.');

        const embed = buildAccountInfoEmbed(target, member);
        return message.reply({ embeds: [embed] });
    }
});

// ---------------- INTERACTION HANDLER ----------------
function isVerificationInteraction(interaction) {
    const id = interaction.customId || '';

    if (interaction.isButton()) {
        return [
            'verify_user',
            'blacklist_user',
            'unblacklist_user',
            'english_verify_open'
        ].includes(id) ||
            id.startsWith('gender_') ||
            id.startsWith('staff_') ||
            id.startsWith('cancel_verify_');
    }

    if (interaction.isStringSelectMenu()) {
        return id === 'select_user_for_verification' || id === 'english_verify_select';
    }

    if (interaction.isModalSubmit()) {
        return id === 'blacklist_modal' ||
            id === 'unblacklist_modal' ||
            id.startsWith('staff_server_modal_') ||
            id.startsWith('verify_notes_no_');
    }

    return false;
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;
    if (!isVerificationInteraction(interaction)) return;

    const guild = interaction.guild || await getGuild().catch(() => null);
    if (!guild) {
        return interaction.reply({
            content: 'Verification server not found. Check GUILD_ID in .env.',
            ephemeral: true
        }).catch(() => {});
    }

    const member = interaction.member;

    // -------- English Manual Verification (staff only) --------
    if (interaction.customId === 'english_verify_open' || interaction.customId === 'english_verify_select') {
        try {
            if (!member.roles.cache.has(ENGLISH_STAFF_ROLE_ID) && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ You are not allowed to verify members.', ephemeral: true });
            }

            const vcId = member.voice.channelId;
            if (!vcId || !ENGLISH_VERIFY_VOICE_IDS.includes(vcId)) {
                return interaction.reply({ content: '❌ You must be inside an English verification voice channel to verify a member.', ephemeral: true });
            }

            const vc = guild.channels.cache.get(vcId);

            // -------- Button: Show select menu --------
            if (interaction.customId === 'english_verify_open') {
                const options = [];
                for (const m of vc.members.values()) {
                    if (m.user.bot) continue;
                    if (m.id === member.id) continue;
                    if (m.roles.cache.has(ENGLISH_ROLE_ID)) continue;
                    if (options.length >= 25) break;
                    options.push({
                        label: m.user.username.slice(0, 100),
                        description: m.id.slice(0, 100),
                        value: m.id
                    });
                }

                if (options.length === 0) {
                    return interaction.reply({ content: '❌ No unverified members found in your verification voice channel.', ephemeral: true });
                }

                const select = new StringSelectMenuBuilder()
                    .setCustomId('english_verify_select')
                    .setPlaceholder('Select a member to verify')
                    .addOptions(options);

                return interaction.reply({
                    content: '**Select a member to verify:**',
                    components: [new ActionRowBuilder().addComponents(select)],
                    ephemeral: true
                });
            }

            // -------- Select Menu: Verify the chosen member --------
            if (interaction.customId === 'english_verify_select') {
                const targetId = interaction.values[0];

                const targetMember = vc?.members.get(targetId);
                if (!targetMember) {
                    return interaction.reply({ content: '❌ This member is no longer in your verification voice channel.', ephemeral: true });
                }

                if (targetMember.roles.cache.has(ENGLISH_ROLE_ID)) {
                    return interaction.reply({ content: '⚠️ This member is already verified for the English section.', ephemeral: true });
                }

                try {
                    await targetMember.roles.add(ENGLISH_ROLE_ID);
                } catch (err) {
                    if (err?.code === 50013) {
                        return interaction.reply({ content: 'I do not have permission to manage roles. Please contact an admin.', ephemeral: true });
                    }
                    console.error('English verify role add error:', err);
                    if (err?.message?.includes('role hierarchy')) {
                        console.error('Bot role must be higher than the English role.');
                    }
                    return interaction.reply({ content: 'Failed to assign the English role. Check bot permissions and role hierarchy.', ephemeral: true });
                }

                if (ENGLISH_CHAT_CHANNEL_ID) {
                    const welcomeChannel = guild.channels.cache.get(ENGLISH_CHAT_CHANNEL_ID);
                    if (welcomeChannel?.isTextBased()) {
                        welcomeChannel.send(`Say hi to <@${targetId}>! Welcome to the English section.`).catch(() => {});
                    } else {
                        console.error('English welcome channel not found or invalid:', ENGLISH_CHAT_CHANNEL_ID);
                    }
                }

                const logChannel = guild.channels.cache.get('1478436050073423964');
                if (logChannel?.isTextBased()) {
                    logChannel.send(`Say **HI** to <@${targetId}> <a:24260congratulations:1470456458872230010>`).catch(() => {});
                }

                const englishLogChannel = guild.channels.cache.get('1521969406471704716');
                if (englishLogChannel?.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0x0b0b0f)
                        .setTitle('🌐 English Verification')
                        .addFields(
                            { name: 'Verified User', value: `${targetMember.user.tag} (<@${targetId}>)`, inline: true },
                            { name: 'Verified By', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                        )
                        .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        .setTimestamp();
                    englishLogChannel.send({ embeds: [logEmbed] }).catch(() => {});
                }

                return interaction.reply({
                    content: `<:586735checkmark:1472282353337368587> <@${targetId}> has been verified successfully and received the English role.`,
                    ephemeral: true
                });
            }
        } catch (err) {
            console.error('English manual verify error:', err);
            return interaction.reply({ content: 'Something went wrong. Please try again later.', ephemeral: true }).catch(() => {});
        }
    }

    if (!canUseBot(member)) {
        return interaction.reply({
            content: 'You must have the Verification Team role and be in a designated voice channel to use the bot (Admins bypass).',
            ephemeral: true
        }).catch(() => {});
    }

    try {
        // -------- BUTTONS --------
        if (interaction.isButton()) {
            if (interaction.customId === 'verify_user') {
                const vcId = member.voice.channelId;
                if (!vcId) {
                    return interaction.reply({
                        content: 'You must be in a voice channel to verify users.',
                        ephemeral: true
                    });
                }

                const vc = guild.channels.cache.get(vcId);
                if (!vc) {
                    return interaction.reply({
                        content: 'Voice channel not found.',
                        ephemeral: true
                    });
                }

                let users = [];
                vc.members.forEach(m => {
                    if (m.roles.cache.has(notVerifiedRoleId)) {
                        const lock = getActiveLock(m.id);

                        users.push({
                            label: m.user.username.slice(0, 100),
                            description: lock ? `LOCKED by ${lock.verifierTag}`.slice(0, 100) : `ID: ${m.id}`,
                            value: m.id
                        });
                    }
                });

                if (users.length === 0) {
                    return interaction.reply({
                        content: '**<:92042no:1467300968491253993> No users found for verification in your voice channel.**',
                        ephemeral: true
                    });
                }

                if (users.length > 25) users = users.slice(0, 25);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_user_for_verification')
                    .setPlaceholder('Select a user')
                    .addOptions(users);

                return interaction.reply({
                    content: '**<:Screenshot_20260615_000851remove:1516038437252239462> Select a user from your voice channel :**',
                    components: [new ActionRowBuilder().addComponents(selectMenu)],
                    ephemeral: true
                });
            }

            if (interaction.customId === 'blacklist_user') {
                const modal = new ModalBuilder()
                    .setCustomId('blacklist_modal')
                    .setTitle('Blacklist a User');

                const idInput = new TextInputBuilder()
                    .setCustomId('blacklist_id')
                    .setLabel('User ID :')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const reasonInput = new TextInputBuilder()
                    .setCustomId('blacklist_reason')
                    .setLabel('Reason :')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(idInput),
                    new ActionRowBuilder().addComponents(reasonInput)
                );

                return interaction.showModal(modal);
            }

            if (interaction.customId === 'unblacklist_user') {
                const modal = new ModalBuilder()
                    .setCustomId('unblacklist_modal')
                    .setTitle('Unblacklist a User');

                const idInput = new TextInputBuilder()
                    .setCustomId('unblacklist_id')
                    .setLabel('User ID :')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const reasonInput = new TextInputBuilder()
                    .setCustomId('unblacklist_reason')
                    .setLabel('Reason for removing blacklist :')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(idInput),
                    new ActionRowBuilder().addComponents(reasonInput)
                );

                return interaction.showModal(modal);
            }

            if (interaction.customId.startsWith('gender_')) {
                await interaction.deferUpdate();

                const [, gender, userId] = interaction.customId.split('_');
                const target = await fetchMember(guild, userId);

                if (!target) {
                    return interaction.editReply({
                        content: '**User not found.**',
                        embeds: [],
                        components: []
                    });
                }

                if (!isLockOwner(userId, member)) {
                    return interaction.editReply({
                        content: lockMessage(userId) || 'This verification lock belongs to another staff member.',
                        embeds: [],
                        components: []
                    });
                }

                const blacklistedUser = findBlacklistedUser(target.id);
                if (blacklistedUser) {
                    await logBlacklistedAttempt(guild, member, target, blacklistedUser);
                    releaseVerificationLock(target.id);

                    return interaction.editReply({
                        content: '**<:92042no:1467300968491253993> This user is blacklisted.**',
                        embeds: [],
                        components: []
                    });
                }

                if (gender === 'man') {
                    await target.roles.add(manRoleId);
                    await target.roles.remove(girlRoleId).catch(() => {});
                } else {
                    await target.roles.add(girlRoleId);
                    await target.roles.remove(manRoleId).catch(() => {});
                }

                const risk = getRiskInfo(target);

                const embed = new EmbedBuilder()
                    .setTitle('<a:lottieflowmultimedia84f5dc1cease:1516352164589731890> Staff Verification')
                    .setDescription(
                        `**Is this user staff in another server?**\n\n` +
                        `**User**: <@${userId}>\n` +
                        `**Selected Gender** : ${gender === 'man' ? 'Man' : 'Girl'}\n\n`
                    )
                    .setColor(0xce2f2f)
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`staff_yes_${userId}`)
                            .setLabel('Yes staff')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('<:Screenshot_20260615_000421remove:1516038456193843310>'),

                        new ButtonBuilder()
                            .setCustomId(`staff_no_${userId}`)
                            .setLabel('Not staff')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('<a:lottieflowmenunav115f30202easey:1516352802933444639> '),

                        new ButtonBuilder()
                            .setCustomId(`cancel_verify_${userId}`)
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('<:298685ex:1467929031617020009>')
                    );

                return interaction.editReply({
                    content: '',
                    embeds: [embed],
                    components: [row]
                });
            }

            if (interaction.customId.startsWith('staff_')) {
                const [, answer, userId] = interaction.customId.split('_');

                if (!isLockOwner(userId, member)) {
                    return interaction.reply({
                        content: lockMessage(userId) || 'This verification lock belongs to another staff member.',
                        ephemeral: true
                    });
                }

                if (answer === 'yes') {
                    const modal = new ModalBuilder()
                        .setCustomId(`staff_server_modal_${userId}`)
                        .setTitle('Staff Verification Info');

                    const serverNameInput = new TextInputBuilder()
                        .setCustomId('server_name_input')
                        .setLabel('Server Name')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const notesInput = new TextInputBuilder()
                        .setCustomId('verify_notes_input')
                        .setLabel('Verify Notes')
                        .setPlaceholder('Example: account sounds normal, answered questions, old friend, suspicious but accepted...')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(serverNameInput),
                        new ActionRowBuilder().addComponents(notesInput)
                    );

                    return interaction.showModal(modal);
                }

                if (answer === 'no') {
                    const modal = new ModalBuilder()
                        .setCustomId(`verify_notes_no_${userId}`)
                        .setTitle('Verification Notes');

                    const notesInput = new TextInputBuilder()
                        .setCustomId('verify_notes_input')
                        .setLabel('Verify Notes')
                        .setPlaceholder('Example: answered all questions, voice matched, no red flags...')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
                    return interaction.showModal(modal);
                }
            }

            if (interaction.customId.startsWith('cancel_verify_')) {
                await interaction.deferUpdate();

                const userId = interaction.customId.split('_').pop();

                if (!isLockOwner(userId, member)) {
                    return interaction.editReply({
                        content: lockMessage(userId) || 'This verification lock belongs to another staff member.',
                        embeds: [],
                        components: []
                    });
                }

                releaseVerificationLock(userId);

                return interaction.editReply({
                    content: `Verification cancelled for <@${userId}>. Lock released.`,
                    embeds: [],
                    components: []
                });
            }
        }

        // -------- SELECT MENU --------
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_user_for_verification') {
            await interaction.deferUpdate();

            const userId = interaction.values[0];
            const target = await fetchMember(guild, userId);

            if (!target) {
                return interaction.editReply({
                    content: 'User not found.',
                    embeds: [],
                    components: []
                });
            }

            const existingLock = getActiveLock(userId);
            if (existingLock && existingLock.verifierId !== member.id && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply({
                    content: lockMessage(userId),
                    embeds: [],
                    components: []
                });
            }

            lockUserForVerification(userId, member);

            const blacklistedUser = findBlacklistedUser(target.id);
            if (blacklistedUser) {
                await logBlacklistedAttempt(guild, member, target, blacklistedUser);
                releaseVerificationLock(userId);

                return interaction.editReply({
                    content: '**This user is blacklisted.**',
                    embeds: [],
                    components: []
                });
            }

            const embed = buildAccountInfoEmbed(target, member);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`gender_man_${userId}`)
                        .setLabel('Gentel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('<a:Gender_Male:1522660573639082196>'),

                    new ButtonBuilder()
                        .setCustomId(`gender_girl_${userId}`)
                        .setLabel('lady')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('<a:Gender_Female:1522660554785685514>'),

                    new ButtonBuilder()
                        .setCustomId(`cancel_verify_${userId}`)
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:298685ex:1467929031617020009>')
                );

            return interaction.editReply({
                content: buildRiskContent(target),
                embeds: [embed],
                components: [row]
            });
        }

        // -------- MODALS --------
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('staff_server_modal_')) {
                await interaction.deferReply({ ephemeral: true });

                const userId = interaction.customId.split('_').pop();

                if (!isLockOwner(userId, member)) {
                    return interaction.editReply({
                        content: lockMessage(userId) || 'This verification lock belongs to another staff member.'
                    });
                }

                const serverName = interaction.fields.getTextInputValue('server_name_input');
                const notes = interaction.fields.getTextInputValue('verify_notes_input') || '';
                const target = await fetchMember(guild, userId);

                if (!target) {
                    releaseVerificationLock(userId);
                    return interaction.editReply({ content: 'User not found.' });
                }

                return completeVerification({
                    interaction,
                    guild,
                    verifier: member,
                    target,
                    staffAnswer: 'Yes',
                    serverName,
                    notes
                });
            }

            if (interaction.customId.startsWith('verify_notes_no_')) {
                await interaction.deferReply({ ephemeral: true });

                const userId = interaction.customId.split('_').pop();

                if (!isLockOwner(userId, member)) {
                    return interaction.editReply({
                        content: lockMessage(userId) || 'This verification lock belongs to another staff member.'
                    });
                }

                const notes = interaction.fields.getTextInputValue('verify_notes_input') || '';
                const target = await fetchMember(guild, userId);

                if (!target) {
                    releaseVerificationLock(userId);
                    return interaction.editReply({ content: 'User not found.' });
                }

                return completeVerification({
                    interaction,
                    guild,
                    verifier: member,
                    target,
                    staffAnswer: 'No',
                    notes
                });
            }

            if (interaction.customId === 'blacklist_modal') {
                await interaction.deferReply({ ephemeral: true });

                const userId = interaction.fields.getTextInputValue('blacklist_id').trim();
                const reason = interaction.fields.getTextInputValue('blacklist_reason').trim();

                if (!isValidSnowflake(userId)) {
                    return interaction.editReply({ content: 'Invalid User ID.' });
                }

                if (findBlacklistedUser(userId)) {
                    return interaction.editReply({ content: `User <@${userId}> is already blacklisted.` });
                }

                blacklist.push({
                    id: userId,
                    reason,
                    moderatorId: member.id,
                    createdAt: new Date().toISOString()
                });

                await saveBlacklist();
                releaseVerificationLock(userId);

                const logChannel = guild.channels.cache.get(blacklistLogChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('<:Ban:1464323808491212909> User Blacklisted')
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '**<:membr:1464331396284809364> User ID :**', value: `<@${userId}> (${userId})` },
                            { name: '**<:reas:1464333026065518843> Reason :**', value: limitText(reason) },
                            { name: '**<:525884securityshield:1468921416081604648> Moderator :**', value: `<@${member.id}>`, inline: true }
                        )
                        .setColor(0x530101)
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] }).catch(console.error);
                }

                return interaction.editReply({ content: `User <@${userId}> added to blacklist.` });
            }

            if (interaction.customId === 'unblacklist_modal') {
                await interaction.deferReply({ ephemeral: true });

                const userId = interaction.fields.getTextInputValue('unblacklist_id').trim();
                const reason = interaction.fields.getTextInputValue('unblacklist_reason').trim();

                if (!isValidSnowflake(userId)) {
                    return interaction.editReply({ content: 'Invalid User ID.' });
                }

                const oldEntry = findBlacklistedUser(userId);
                if (!oldEntry) {
                    return interaction.editReply({ content: `User <@${userId}> is not blacklisted.` });
                }

                blacklist = blacklist.filter(u => u.id !== userId);
                await saveBlacklist();

                const logChannel = guild.channels.cache.get(blacklistLogChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ User Unblacklisted')
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '**<:membr:1464331396284809364> User ID :**', value: `<@${userId}> (${userId})` },
                            { name: '**Old blacklist reason :**', value: limitText(oldEntry.reason || 'No old reason saved.') },
                            { name: '**Unblacklist reason :**', value: limitText(reason) },
                            { name: '**Moderator :**', value: `<@${member.id}>`, inline: true }
                        )
                        .setColor(0x1f8b4c)
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] }).catch(console.error);
                }

                return interaction.editReply({
                    content: `User <@${userId}> removed from blacklist. Reason: **${limitText(reason, 1800)}**`
                });
            }
        }
    } catch (err) {
        console.error('Interaction error:', err);

        const errorMessage = 'Something went wrong. Check bot permissions / role hierarchy / console logs.';

        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({
                content: errorMessage,
                embeds: [],
                components: []
            }).catch(() => {});
        }

        return interaction.reply({
            content: errorMessage,
            ephemeral: true
        }).catch(() => {});
    }
});

// ---------------- VOICE STATE ----------------
client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;
    if (!newState.channelId) return;

    const channel = newState.channel;
    if (!channel) return;

    const isAllowedVoice = allowedVoices.includes(channel.id);
    const isConfiguredCategory = channel.parentId && channel.parentId === verificationCategoryId;
    if (!isAllowedVoice && !isConfiguredCategory) return;

    if (!member.roles.cache.has(notificationRoleId)) return;

    const oldWasWatched = oldState.channelId && (
        allowedVoices.includes(oldState.channelId) ||
        oldState.channel?.parentId === verificationCategoryId
    );
    if (oldWasWatched) return;

    if (recentlyNotifiedVerification(member.id, channel.id)) return;

    const notifyChannelId = getVerificationNotifyChannelId(channel.id);
    const notifyChannel = newState.guild.channels.cache.get(notifyChannelId);
    if (!notifyChannel) return;

    const embed = new EmbedBuilder()
        .setTitle('<:Screenshot_20260615_000851remove:1516038437252239462> Verification Required')
        .setDescription(`**<@${member.id}> joined a verification channel.**`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor(0x910000)
        .addFields(
            { name: '**<:membr:1464331396284809364> Member :**', value: `<@${member.id}>`, inline: true },
            { name: '**<:6619megaphone:1467936758087028970> Voice Channel :**', value: `<#${channel.id}>`, inline: true },
            { name: '**<:529614vb:1468921406950473738> Time Joined :**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    notifyChannel.send({
        content: `**<@&${staffRoleId}> SOMEONE NEEDS VERIFICATION!**`,
        embeds: [embed]
    }).catch(() => {});
});

// ---------------- LOGIN ----------------
}

module.exports = { registerVerification };
