// Imports
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AuditLogEvent,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const { joinVoiceChannel } = require("@discordjs/voice");
const config = require("./config.json");
const { debouncedWrite, writeNow, flushAll } = require('./data/writer.js');
config.token = process.env.DISCORD_TOKEN || config.token;

const TOP_5_ROLE = config.TOP_5_ROLE;
const TOP_100K_ROLE = config.TOP_100K_ROLE;
const TOP_200K_ROLE = config.TOP_200K_ROLE;

// ================= CLIENT =================
function registerSystem(client) {

const { renderClanInfoCard, renderClanPointsCard, renderClanMembersCard, renderClanboardCard } = require('./clanCard.js');

const CLAN_PANEL_CHANNEL_ID = '1519396664627036261';
const CLAN_CREATE_MODAL_ID = 'clan_create_modal';
const CLAN_DELETE_SELECT_ID = 'clan_delete_select';
const NORMAL_JOIN_CHANNEL_ID = '1519407718048469062';
const TOP_JOIN_CHANNEL_ID = '1519407782909051064';
const JOIN_CLAN_MODAL_ID = 'join_clan_modal';
const MAX_CLAN_MEMBERS = 50;
const ADD_REMOVE_PANEL_CHANNEL_ID = '1519414901096054834';

// ================= CONFIG =================
const LEADER_ROLE_ID = "1417802513842966538";
const CO_LEADER_ROLE_ID = "1419023058450120754";

const CLAN_LEAVE_PANEL_CHANNEL_ID = "1470738739453100175";
const WELCOME_CHANNEL_ID = "1469015523596439612";

const ADS_LOG_CHANNEL_ID = "1417802595623501834";

const CLANBOARD_CHANNEL_ID = "1468923957901262871";
const CLANBOARD_CLANS_PER_PAGE = 5;

const NORMAL_CLANS_CATEGORY_ID = "1417802626963079178";
const TOP_CLANS_CATEGORY_ID = "1468892270765015172";
const APPLY_CLAN_PANEL_CHANNEL_ID = "1521164456569340044";

// ================= AMONG US MUTE PANEL CONFIG =================
const AMONG_US_PANEL_CHANNEL_ID = "1467900695452582082";
const AMONG_US_VOICE_CHANNEL_IDS = [
  "1417802712422154393",
  "1417802715408371732"
];
const AMONG_US_PANEL_ROLE_ID = "1417802543504949299";
const AMONG_US_UNMUTE_COOLDOWN_MS = 30 * 1000;
const AMONG_US_MEMBER_ROLE_ID = "1417802544750792745";
const AMONG_US_BLACKLIST_ROLE_ID = "1523059589401153536";
const AMONG_US_BLACKLIST_LOG_CHANNEL_ID = "1522906209978421338";
const AMONG_US_BLACKLIST_MANAGER_ROLE_ID = "1417802492187512932";
const AMONG_US_BLACKLIST_FILE = path.join(__dirname, "data", "amongBlacklist.json");

const amongUsVoiceMuteCooldowns = new Map();

// If a muted player leaves an Among Us voice, remove the mute after 10s.
// If they come back to the same Among Us voice before the 10s finishes, keep them muted.
const AMONG_US_AUTO_UNMUTE_AFTER_LEAVE_MS = 10 * 1000;
const amongUsLeaveUnmuteTimers = new Map();
const amongUsPendingAutoUnmutes = new Map();

// ================= STAFF APPLY SYSTEM =================
const STAFF_APPLY_PANEL_CHANNEL_ID = "1466918418283499631";
const STAFF_APPLY_REVIEW_CHANNEL_ID = "1466932404278137014";
const STAFF_ACCEPTED_CHANNEL_ID = "1475257871003549948";
const STAFF_LOG_CHANNEL_ID = "1475249204279382016";
const STAFF_REVIEWER_ROLE_ID = "1417802492187512932";
const STAFF_WAITING_VOICE_CHANNEL_ID = "1417802683137523715";
const STAFF_WAITING_ROLE_ID = "1417802580645380176";
const STAFF_APPLY_ALLOWED_ROLE_ID = STAFF_WAITING_ROLE_ID;
const STAFF_APPLY_BLOCKED_ROLE_IDS = new Set([
  "1417802501654052935",
  "1417802495693951079",
  "1417802492187512932"
]);
const VOICE_TEAM_ROLE_ID = "1474006227896897608";
const STAFF_APPLY_MODAL_ID = "staff_apply_modal";
const JOIN_CHANNEL_LINK = "https://discord.com/channels/1417800065967325216/1417802683137523715";
const STAFF_VOICE_NOTIFY_CHANNEL_ID = "1483136723218333727";

// ================= PRIVATE OWNER VOICE CONFIG =================
const PRIVATE_OWNER_VOICE_CHANNEL_ID = "1478770723853045822";
const PRIVATE_OWNER_ALLOWED_USER_IDS = new Set([
  "1084793381491834890",
  "1336400123713949856"
]);
const PRIVATE_OWNER_MOVE_AUDIT_WINDOW_MS = 7000;

// Top Clans limit = 3
const TOP_CLANS_LIMIT = 3;
const CLAN_ROLE_PARENT_ID = process.env.CLAN_ROLE_PARENT_ID || "1417933292736479304";

const SERVER_OWNER_ID = "1084793381491834890";

const DELETE_BLACKLIST_ROLE_IDS = [
  "1470923452759281789",
  "1473442424519921706",
  "1429174785258291362",
  "1417802490094817294",
  "1469813447020773522",
  "1417802492187512932",
  "1425870997382496276",
  "1417802504267239466"
];

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
const CLANBOARD_REFRESH_USER_ID = "1084793381491834890";

const CLAN_JOIN_LOG_CHANNEL_ID = "1524376577700397086";
const ADMIN_DASHBOARD_CHANNEL_ID = "1524377520135209071";
const CLAN_REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const CLAN_CAPACITY_WARNING_THRESHOLD = 45;
const VOICE_POINTS_COOLDOWN_MS = 5 * 60 * 1000;

const STAFF_APPLICATIONS_FILE = path.join(__dirname, "data", "staffApplications.json");

const CLAN_MANAGER_ROLE_IDS = new Set([
  "1417802486735175793",
  "1470923452759281789"
]);

const DEFAULT_SECTIONS = [
  {
    sectionId: NORMAL_CLANS_CATEGORY_ID,
    name: "Normal Clans",
    channels: [
      { id: "1468714476357423256", clanRoleId: "1429968558573490196" },
      { id: "1468714442828025866", clanRoleId: "1427591792131571763" },
      { id: "1468718777397936356", clanRoleId: "1427684816417198100" },

      // Normal Clans extra slots
      { id: "EMPTY", clanRoleId: "EMPTY" },
      { id: "EMPTY", clanRoleId: "EMPTY" },
      { id: "EMPTY", clanRoleId: "EMPTY" },
      { id: "EMPTY", clanRoleId: "EMPTY" },
      { id: "EMPTY", clanRoleId: "EMPTY" },
      { id: "EMPTY", clanRoleId: "EMPTY" },
      { id: "EMPTY", clanRoleId: "EMPTY" }
    ]
  },
  {
    sectionId: TOP_CLANS_CATEGORY_ID,
    name: "Top Clans",
    channels: [
      { id: "1428023224184213546", clanRoleId: "1428023317603946649" },

      // Top Clans extra slots
      { id: "EMPTY", clanRoleId: "EMPTY" },
      { id: "EMPTY", clanRoleId: "EMPTY" }
    ]
  }
];

// ================= DATA =================
const clanConfigFile = path.join(__dirname, "clanConfig.json");
const clanPointsFile = path.join(__dirname, "clanPoints.json");
const clanFirstJoinFile = path.join(__dirname, "clanFirstJoin.json");
const clanPanelsFile = path.join(__dirname, "clanPanels.json");
const clanMemberPointsFile = path.join(__dirname, "clanMemberPoints.json");

function cloneSections(sections) {
  return JSON.parse(JSON.stringify(sections));
}

function loadClanConfig() {
  if (!fs.existsSync(clanConfigFile)) return cloneSections(DEFAULT_SECTIONS);

  try {
    const saved = JSON.parse(fs.readFileSync(clanConfigFile, "utf8") || "[]");
    return Array.isArray(saved) && saved.length > 0 ? saved : cloneSections(DEFAULT_SECTIONS);
  } catch (err) {
    console.error("Failed to load clanConfig.json:", err);
    return cloneSections(DEFAULT_SECTIONS);
  }
}

let SECTIONS = loadClanConfig();
let trackedVoiceChannels = SECTIONS.flatMap(section => section.channels);

let clanPoints = fs.existsSync(clanPointsFile)
  ? JSON.parse(fs.readFileSync(clanPointsFile, "utf8") || "{}")
  : {};

let clanFirstJoin = fs.existsSync(clanFirstJoinFile)
  ? JSON.parse(fs.readFileSync(clanFirstJoinFile, "utf8") || "{}")
  : {};

let clanMemberPoints = fs.existsSync(clanMemberPointsFile)
  ? JSON.parse(fs.readFileSync(clanMemberPointsFile, "utf8") || "{}")
  : {};

let clanPanels = fs.existsSync(clanPanelsFile)
  ? JSON.parse(fs.readFileSync(clanPanelsFile, "utf8") || "{}")
  : {};

clanPanels = {
  leavePanelMessageId: clanPanels.leavePanelMessageId || null,
  clanboardMessageId: clanPanels.clanboardMessageId || null,
  amongUsMutePanelMessageId: clanPanels.amongUsMutePanelMessageId || null,
  clanboardRefreshAt: clanPanels.clanboardRefreshAt || 0,
  clanboardNotified: clanPanels.clanboardNotified || false
};

function saveData() {
  debouncedWrite(clanPointsFile, clanPoints);
  debouncedWrite(clanFirstJoinFile, clanFirstJoin);
  debouncedWrite(clanMemberPointsFile, clanMemberPoints);
}

function saveClanConfig() {
  debouncedWrite(clanConfigFile, SECTIONS);
  trackedVoiceChannels = SECTIONS.flatMap(section => section.channels);
}

function savePanels() {
  debouncedWrite(clanPanelsFile, clanPanels);
}

async function saveAll() {
  await writeNow(clanPointsFile, clanPoints);
  await writeNow(clanFirstJoinFile, clanFirstJoin);
  await writeNow(clanMemberPointsFile, clanMemberPoints);
  await writeNow(clanPanelsFile, clanPanels);
}

const clanboardPages = new Map();
const voiceMembers = new Map();
const userMessageCounts = new Map();
const clanMembersCache = new Map();
const pendingJoinClan = new Map();
const clanRequestCooldowns = new Map();
const voicePointsCooldowns = new Map();

// ================= HELPERS =================
function isValidClanEntry(entry) {
  return entry && entry.id !== "EMPTY" && entry.clanRoleId !== "EMPTY";
}

async function ensureClanCache(guild) {
  const fetches = [];
  for (const entry of trackedVoiceChannels) {
    if (!isValidClanEntry(entry)) continue;
    if (!guild.channels.cache.has(entry.id)) {
      fetches.push(guild.channels.fetch(entry.id).catch(() => {}));
    }
    if (!guild.roles.cache.has(entry.clanRoleId)) {
      fetches.push(guild.roles.fetch(entry.clanRoleId).catch(() => {}));
    }
  }
  await Promise.all(fetches);
  await guild.members.fetch().catch(() => {});
}

function getAllClanEntries(guild) {
  return trackedVoiceChannels
    .filter(isValidClanEntry)
    .map(entry => {
      const channel = guild.channels.cache.get(entry.id);
      const role = guild.roles.cache.get(entry.clanRoleId);
      return {
        channelId: entry.id,
        clanRoleId: entry.clanRoleId,
        channel,
        role,
        points: clanPoints[entry.clanRoleId] || 0
      };
    })
    .filter(entry => entry.channel && entry.role);
}

function getSortedClanEntries(guild) {
  return getAllClanEntries(guild).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.role.name.localeCompare(b.role.name);
  });
}

function getTopClanEntries(guild) {
  return getSortedClanEntries(guild).slice(0, TOP_CLANS_LIMIT);
}

function getNormalClanEntries(guild) {
  const topIds = new Set(getTopClanEntries(guild).map(entry => entry.channelId));
  return getSortedClanEntries(guild).filter(entry => !topIds.has(entry.channelId));
}

function canManageClanCommands(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return [...CLAN_MANAGER_ROLE_IDS].some(roleId => member.roles.cache.has(roleId));
}

function getClanAutocompleteChoices(guild, query = "") {
  const normalizedQuery = query.toLowerCase();

  return getSortedClanEntries(guild)
    .filter(entry =>
      !normalizedQuery ||
      entry.role.name.toLowerCase().includes(normalizedQuery) ||
      entry.clanRoleId.includes(normalizedQuery)
    )
    .slice(0, 25)
    .map(entry => ({
      name: `${entry.role.name} (${formatPoints(entry.points)} pts)`.slice(0, 100),
      value: entry.clanRoleId
    }));
}

function findClanEntryByRoleId(clanRoleId) {
  return trackedVoiceChannels.find(entry =>
    isValidClanEntry(entry) &&
    entry.clanRoleId === clanRoleId
  ) || null;
}

function findEmptyNormalClanSlot() {
  const normalSection = SECTIONS.find(section => section.sectionId === NORMAL_CLANS_CATEGORY_ID);
  if (!normalSection) return null;

  return normalSection.channels.find(entry => !isValidClanEntry(entry)) || null;
}

function sanitizeClanName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

async function sendClanCommandReply(interaction, content) {
  if (interaction.deferred || interaction.replied) {
    const edited = await interaction.editReply(content).then(() => true).catch(() => false);
    if (edited) return;
  } else {
    const replied = await interaction.reply({ content, flags: 64 }).then(() => true).catch(() => false);
    if (replied) return;
  }

  await interaction.channel?.send({
    content: `${interaction.user}: ${content}`,
    allowedMentions: { users: [interaction.user.id], roles: [] }
  }).catch(() => {});
}

async function sendClanJoinLog(guild, type, data) {
  try {
    const logChannel = guild.channels.cache.get(CLAN_JOIN_LOG_CHANNEL_ID) ||
      await guild.channels.fetch(CLAN_JOIN_LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel || !logChannel.isTextBased()) return;

    const colors = { request: 0xf1c40f, accept: 0x2ecc71, reject: 0xe74c3c };
    const titles = { request: 'Clan Join Request', accept: 'Clan Join Accepted', reject: 'Clan Join Rejected' };

    const embed = new EmbedBuilder()
      .setColor(colors[type] || 0x5865f2)
      .setTitle(titles[type] || 'Clan Join Log')
      .addFields(
        { name: 'Member', value: `${data.memberTag}\n<@${data.memberId}>\nID: \`${data.memberId}\``, inline: true },
        { name: 'Clan', value: data.clanName || 'Unknown', inline: true }
      )
      .setTimestamp();

    if (data.reason) embed.addFields({ name: 'Reason', value: data.reason, inline: false });
    if (data.reviewer) embed.addFields({ name: 'Reviewed by', value: data.reviewer, inline: false });

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('Error sending clan join log:', err);
  }
}

async function checkClanCapacityAndWarn(guild, clanRoleId) {
  try {
    const membersWithRole = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId));
    if (membersWithRole.size >= CLAN_CAPACITY_WARNING_THRESHOLD && membersWithRole.size < MAX_CLAN_MEMBERS) {
      const leaders = guild.members.cache.filter(m =>
        m.roles.cache.has(clanRoleId) &&
        (m.roles.cache.has(LEADER_ROLE_ID) || m.roles.cache.has(CO_LEADER_ROLE_ID))
      );
      const clanRole = guild.roles.cache.get(clanRoleId);
      const remaining = MAX_CLAN_MEMBERS - membersWithRole.size;
      for (const leader of leaders.values()) {
        await leader.send({
          content: `**⚠️ Clan Capacity Warning**\nYour clan **${clanRole?.name || 'Unknown'}** has **${membersWithRole.size}/${MAX_CLAN_MEMBERS}** members. Only **${remaining}** slot(s) remaining!`
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error checking clan capacity:', err);
  }
}

async function loadStaffApplications() {
  try {
    if (!fs.existsSync(STAFF_APPLICATIONS_FILE)) return {};
    return JSON.parse(fs.readFileSync(STAFF_APPLICATIONS_FILE, 'utf8') || '{}');
  } catch (err) {
    console.error('Error loading staff applications:', err);
    return {};
  }
}

async function saveStaffApplications(data) {
  await writeNow(STAFF_APPLICATIONS_FILE, data);
}

async function moveClanRoleUnderParent(guild, clanRole) {
  const parentRole = guild.roles.cache.get(CLAN_ROLE_PARENT_ID) ||
    await guild.roles.fetch(CLAN_ROLE_PARENT_ID).catch(() => null);

  if (!parentRole) {
    console.warn(`Clan role parent not found: ${CLAN_ROLE_PARENT_ID}`);
    return;
  }

  await clanRole.setPosition(Math.max(parentRole.position - 1, 1), 'Place clan role under parent role').catch(err => {
    console.warn(`Could not move clan role under ${parentRole.name}: ${err?.message || err}`);
  });
}

async function handleCreateClanCommand(interaction) {
  if (!canManageClanCommands(interaction.member)) {
    await interaction.reply({
      content: "**You do not have permission to use clan management commands.**",
      flags: 64
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const guild = interaction.guild;
  const ownerUser = interaction.options.getUser("owner", true);
  const coOwnerUser = interaction.options.getUser("co_owner", true);
  const owner = await guild.members.fetch(ownerUser.id).catch(() => null);
  const coOwner = await guild.members.fetch(coOwnerUser.id).catch(() => null);
  const roleName = sanitizeClanName(interaction.options.getString("role_name", true));

  if (!owner || !coOwner) {
    await interaction.editReply("**Owner or co-owner was not found in this server.**");
    return;
  }

  if (!roleName) {
    await interaction.editReply("**Role name is required.**");
    return;
  }

  const emptySlot = findEmptyNormalClanSlot();
  if (!emptySlot) {
    await interaction.editReply("**No empty normal clan slot is available.**");
    return;
  }

  if (guild.roles.cache.some(role => role.name.toLowerCase() === roleName.toLowerCase())) {
    await interaction.editReply("**A role with this clan name already exists.**");
    return;
  }

  const clanRole = await guild.roles.create({
    name: roleName,
    mentionable: true,
    reason: `Clan created by ${interaction.user.tag}`
  });

  await moveClanRoleUnderParent(guild, clanRole);

  const clanChannel = await guild.channels.create({
    name: `| ${roleName}`,
    type: ChannelType.GuildVoice,
    parent: NORMAL_CLANS_CATEGORY_ID,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.Connect]
      },
      {
        id: clanRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream
        ]
      }
    ],
    reason: `Clan created by ${interaction.user.tag}`
  });

  emptySlot.id = clanChannel.id;
  emptySlot.clanRoleId = clanRole.id;
  clanPoints[clanRole.id] = 0;
  clanFirstJoin[clanRole.id] = Date.now();
  saveClanConfig();
  saveData();

  await owner.roles.add([clanRole.id, LEADER_ROLE_ID], "Clan owner").catch(err => {
    console.error("Failed to add owner clan roles:", err);
  });
  await coOwner.roles.add([clanRole.id, CO_LEADER_ROLE_ID], "Clan co-owner").catch(err => {
    console.error("Failed to add co-owner clan roles:", err);
  });

  await sendClanCommandReply(interaction,
    `**Clan created.**\nRole: ${clanRole}\nVoice: ${clanChannel}\nOwner: ${owner}\nCo-owner: ${coOwner}`
  );

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`Welcome to ${clanRole.name}`)
    .setDescription(
      `**Clan Commands**\n` +
      `\`\`.pclan\`\` — View the clan points card\n` +
      `\`\`.claninfo\`\` — View clan information\n` +
      `\`\`.clanmembers\`\` — View clan members\n\n` +
      `Owner: ${owner}\n` +
      `Co-Owner: ${coOwner}`
    )
    .setFooter({ text: `Clan created by ${interaction.user.tag}` })
    .setTimestamp();

  await clanChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});

  await refreshClanSystem(guild).catch(err => {
    console.warn(`Clan refresh after create skipped: ${err?.message || err}`);
  });
}

async function handleDeleteClanCommand(interaction) {
  if (!canManageClanCommands(interaction.member)) {
    await interaction.reply({
      content: "**You do not have permission to use clan management commands.**",
      flags: 64
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const guild = interaction.guild;
  const clanRoleId = interaction.options.getString("clan", true);
  const clanEntry = findClanEntryByRoleId(clanRoleId);

  if (!clanEntry) {
    await interaction.editReply("**Clan not found. Choose one from autocomplete.**");
    return;
  }

  const channel = guild.channels.cache.get(clanEntry.id) ||
    await guild.channels.fetch(clanEntry.id).catch(() => null);
  const role = guild.roles.cache.get(clanEntry.clanRoleId) ||
    await guild.roles.fetch(clanEntry.clanRoleId).catch(() => null);

  const roleName = role?.name || clanEntry.clanRoleId;

  if (channel) {
    await channel.delete(`Clan deleted by ${interaction.user.tag}`).catch(err => {
      console.error("Failed to delete clan channel:", err);
    });
  }

  const clanMembers = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId));
  for (const member of clanMembers.values()) {
    await member.roles.remove([LEADER_ROLE_ID, CO_LEADER_ROLE_ID]).catch(() => {});
  }

  if (role) {
    await role.delete(`Clan deleted by ${interaction.user.tag}`).catch(err => {
      console.error("Failed to delete clan role:", err);
    });
  }

  clanEntry.id = "EMPTY";
  clanEntry.clanRoleId = "EMPTY";
  delete clanPoints[clanRoleId];
  delete clanFirstJoin[clanRoleId];
  saveClanConfig();
  saveData();

  await sendClanCommandReply(interaction, `**Clan deleted:** ${roleName}`);

  await refreshClanSystem(guild).catch(err => {
    console.warn(`Clan refresh after delete skipped: ${err?.message || err}`);
  });
}

function formatPoints(points) {
  return Number(points || 0).toLocaleString("en-US");
}

function formatClanOpenedAt(clanRoleId) {
  const openedAt = clanFirstJoin[clanRoleId];

  if (!openedAt) {
    return "Not recorded yet";
  }

  return `<t:${Math.floor(openedAt / 1000)}:f>`;
}

function getMemberClanVoiceEntry(member) {
  if (!member || !member.voice || !member.voice.channelId) return null;

  return trackedVoiceChannels.find(entry =>
    isValidClanEntry(entry) &&
    entry.id === member.voice.channelId &&
    member.roles.cache.has(entry.clanRoleId)
  ) || null;
}

function isMemberAfk(member) {
  if (!member) return true;

  const voiceAfk = Boolean(member.voice?.afk);
  const inServerAfkChannel = Boolean(
    member.guild?.afkChannelId &&
    member.voice?.channelId === member.guild.afkChannelId
  );
  const idleStatus = member.presence?.status === "idle";

  return voiceAfk || inServerAfkChannel || idleStatus;
}

function isMemberPlaying(member) {
  if (!member || isMemberAfk(member)) return false;

  return member.presence?.activities?.some(activity => activity.type === 0) || false;
}

function getVoicePointsForMember(member) {
  return isMemberPlaying(member) ? 2 : 1;
}

async function safeFetchMessage(channel, messageId) {
  if (!channel || !messageId) return null;
  return channel.messages.fetch(messageId).catch(() => null);
}

async function findBotButtonMessage(channel, customId) {
  if (!channel || !channel.isTextBased()) return null;

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return null;

  return messages.find(message => {
    if (!client.user || message.author.id !== client.user.id) return false;

    return message.components?.some(row =>
      row.components?.some(component => component.customId === customId)
    );
  }) || null;
}

async function findBotEmbedMessage(channel, titleText) {
  if (!channel || !channel.isTextBased()) return null;

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return null;

  return messages.find(message => {
    if (!client.user || message.author.id !== client.user.id) return false;
    return message.embeds?.some(embed => embed.title && embed.title.includes(titleText));
  }) || null;
}

// ================= ANTI ADS / INVITE LINKS =================
const DISCORD_INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[A-Za-z0-9-]+/i;

function getDiscordInviteFromMessage(content) {
  if (!content) return null;

  const match = content.match(DISCORD_INVITE_REGEX);
  return match ? match[0] : null;
}

async function sendAdsLog(guild, data) {
  try {
    const logChannel = guild.channels.cache.get(ADS_LOG_CHANNEL_ID) ||
      await guild.channels.fetch(ADS_LOG_CHANNEL_ID).catch(() => null);

    if (!logChannel || !logChannel.isTextBased()) {
      console.log("ADS log channel not found or not text based.");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(data.banned ? "#ff0000" : "#ff9900")
      .setTitle(data.banned ? "Anti ADS Ban Log" : "Anti ADS Alert")
      .addFields(
        {
          name: "User",
          value: `${data.userTag}\n<@${data.userId}>\nID: \`${data.userId}\``,
          inline: false
        },
        {
          name: "Channel",
          value: `<#${data.channelId}>\nID: \`${data.channelId}\``,
          inline: true
        },
        {
          name: "Reason",
          value: "`ADS`",
          inline: true
        },
        {
          name: "Invite Link",
          value: `\`${data.inviteLink}\``,
          inline: false
        },
        {
          name: "Action",
          value: data.banned ? "**Banned**" : `**Failed:** ${data.error || "Unknown error"}`,
          inline: false
        }
      )
      .setTimestamp();

    if (data.messageContent) {
      embed.addFields({
        name: "Message",
        value: data.messageContent.length > 1000
          ? `${data.messageContent.slice(0, 1000)}...`
          : data.messageContent,
        inline: false
      });
    }

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error("Error sending ADS log:", err);
  }
}

async function handleAntiAdsInvite(message) {
  try {
    if (!message.guild || !message.member) return false;
    if (message.author.bot) return false;
    if (message.channel.id !== WELCOME_CHANNEL_ID) return false;

    const inviteLink = getDiscordInviteFromMessage(message.content);
    if (!inviteLink) return false;

    await message.delete().catch(() => {});

    const targetMember = message.member ||
      await message.guild.members.fetch(message.author.id).catch(() => null);

    let banned = false;
    let error = null;

    if (!targetMember) {
      error = "Member not found.";
    } else if (!targetMember.bannable) {
      error = "I cannot ban this member. Check my role position and Ban Members permission.";
    } else {
      await targetMember.ban({
        reason: "ADS"
      });

      banned = true;
    }

    await sendAdsLog(message.guild, {
      banned,
      error,
      userTag: message.author.tag,
      userId: message.author.id,
      channelId: message.channel.id,
      inviteLink,
      messageContent: message.content
    });

    console.log(`Anti ADS: ${message.author.tag} sent invite link in ${message.channel.id}. Banned: ${banned}`);

    return true;
  } catch (err) {
    console.error("Anti ADS invite error:", err);

    if (message.guild) {
      await sendAdsLog(message.guild, {
        banned: false,
        error: err.message || "Unknown error",
        userTag: message.author?.tag || "Unknown",
        userId: message.author?.id || "Unknown",
        channelId: message.channel?.id || "Unknown",
        inviteLink: getDiscordInviteFromMessage(message.content) || "Unknown",
        messageContent: message.content || ""
      }).catch(() => {});
    }

    return false;
  }
}

client.on("messageCreate", async message => {
  await handleAntiAdsInvite(message);
});

// ================= ANTI DELETE CHANNEL / VOICE =================
function memberHasDeleteBlacklistRole(member) {
  return DELETE_BLACKLIST_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

function getChannelTypeName(channel) {
  if (!channel) return "Unknown";

  switch (channel.type) {
    case ChannelType.GuildText:
      return "Text Channel";
    case ChannelType.GuildVoice:
      return "Voice Channel";
    case ChannelType.GuildAnnouncement:
      return "Announcement Channel";
    case ChannelType.GuildStageVoice:
      return "Stage Voice";
    case ChannelType.GuildForum:
      return "Forum Channel";
    case ChannelType.GuildCategory:
      return "Category";
    default:
      return "Channel";
  }
}

async function clearMemberRoles(member, reason) {
  const removableRoles = member.roles.cache.filter(role =>
    role.id !== member.guild.id &&
    !role.managed &&
    role.editable
  );

  if (removableRoles.size === 0) return 0;

  await member.roles.remove(removableRoles, reason).catch(err => {
    console.error("Error clearing roles:", err);
  });

  return removableRoles.size;
}

async function restoreDeletedChannel(channel) {
  try {
    if (!channel || !channel.guild) return null;

    const restoredChannel = await channel.clone({
      name: channel.name,
      reason: "Anti Delete Protection: restored deleted channel"
    });

    if (channel.parentId && restoredChannel.setParent) {
      await restoredChannel.setParent(channel.parentId, { lockPermissions: false }).catch(() => {});
    }

    if (typeof channel.rawPosition === "number" && restoredChannel.setPosition) {
      await restoredChannel.setPosition(channel.rawPosition).catch(() => {});
    }

    return restoredChannel;
  } catch (err) {
    console.error("Error restoring deleted channel:", err);
    return null;
  }
}

async function sendDeleteAlertToOwner(guild, executorMember, channel, restoredChannel, removedRolesCount) {
  try {
    const ownerUser = await client.users.fetch(SERVER_OWNER_ID).catch(() => null);
    if (!ownerUser) return;

    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("Anti Delete Alert")
      .setDescription("A member with a blacklisted role tried to delete a channel or voice channel.")
      .addFields(
        {
          name: "User",
          value: `${executorMember.user.tag}\n<@${executorMember.id}>\nID: \`${executorMember.id}\``,
          inline: false
        },
        {
          name: "Deleted Channel",
          value: `${channel.name}\nID: \`${channel.id}\`\nType: \`${getChannelTypeName(channel)}\``,
          inline: false
        },
        {
          name: "Roles Cleared",
          value: `${removedRolesCount} roles`,
          inline: true
        },
        {
          name: "Channel Restored",
          value: restoredChannel ? `Yes\n<#${restoredChannel.id}>` : "Failed",
          inline: true
        },
        {
          name: "Server",
          value: `${guild.name}\nID: \`${guild.id}\``,
          inline: false
        }
      )
      .setTimestamp();

    await ownerUser.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error("Error sending owner alert:", err);
  }
}

client.on("channelDelete", async channel => {
  try {
    if (!channel || !channel.guild) return;

    const guild = channel.guild;

    const auditLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.ChannelDelete
    }).catch(err => {
      console.error("Error fetching audit logs:", err);
      return null;
    });

    const log = auditLogs?.entries?.first();
    if (!log) return;

    const executor = log.executor;
    const target = log.target;

    if (!executor) return;
    if (executor.bot) return;
    if (!target || target.id !== channel.id) return;

    const logIsFresh = Date.now() - log.createdTimestamp < 10000;
    if (!logIsFresh) return;

    const executorMember = await guild.members.fetch(executor.id).catch(() => null);
    if (!executorMember) return;

    if (!memberHasDeleteBlacklistRole(executorMember)) return;

    const reason = "Anti Delete Protection: blacklisted role tried to delete channel/voice";

    const removedRolesCount = await clearMemberRoles(executorMember, reason);
    const restoredChannel = await restoreDeletedChannel(channel);

    await sendDeleteAlertToOwner(
      guild,
      executorMember,
      channel,
      restoredChannel,
      removedRolesCount
    );

    console.log(`Anti Delete: ${executor.tag} tried to delete ${channel.name}. Roles cleared: ${removedRolesCount}`);
  } catch (err) {
    console.error("Anti delete channel error:", err);
  }
});

// ================= COMMANDS MAP =================
client.commands = new Map();

// Load commands
const commandsDir = path.join(__dirname, "commands");
if (fs.existsSync(commandsDir)) {
  fs.readdirSync(commandsDir)
    .filter(file => file.endsWith(".js"))
    .forEach(file => {
      try {
        const command = require(path.join(commandsDir, file));
        if (!command.name) {
          console.log(`Skipped command ${file}: missing name`);
          return;
        }

        client.commands.set(command.name, command);
      } catch (err) {
        console.error(`Error loading command ${file}:`, err);
      }
    });
}

// Load events
const eventsDir = path.join(__dirname, "events");
if (fs.existsSync(eventsDir)) {
  fs.readdirSync(eventsDir)
    .filter(file => file.endsWith(".js"))
    .forEach(file => {
      try {
        const event = require(path.join(eventsDir, file));

        if (!event.name || typeof event.execute !== "function") {
          console.log(`Skipped event/helper file: ${file}`);
          return;
        }

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }

        console.log(`Loaded event: ${file}`);
      } catch (err) {
        console.error(`Error loading event ${file}:`, err);
      }
    });
}

// ================= PANELS =================
function buildAmongUsMutePanel() {
  const embed = new EmbedBuilder()
    .setTitle("Among Us Mute Panel")
    .setDescription(
      [
        "**<:64211pluslogo:1472282370869694514>Important:** after Mute, Unmute is locked for **30 seconds**."
      ].join("\n")
    )
    .setColor("#040303");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("amongus_mute")
      .setLabel("Mute")
      .setEmoji("<:7562mutedbadge:1503885079045476442>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("amongus_unmute")
      .setLabel("Unmute")
      .setEmoji("<:43295voicemicrophone:1503885067305357523>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("among_blacklist")
      .setLabel("Blacklist")
      .setEmoji("<:92042no:1470786991451930735>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("among_unblacklist")
      .setLabel("Unblacklist")
      .setEmoji("<:1144silververify:1468928751000621136>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("blacklist_check_btn")
      .setLabel("Check Blacklist")
      .setEmoji("🔍")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function ensureAmongUsMutePanel(guild) {
  try {
    const channel = guild.channels.cache.get(AMONG_US_PANEL_CHANNEL_ID) ||
      await guild.channels.fetch(AMONG_US_PANEL_CHANNEL_ID).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      return;
    }

    let message = await safeFetchMessage(channel, clanPanels.amongUsMutePanelMessageId);

    if (!message) {
      message = await findBotButtonMessage(channel, "amongus_mute");
    }

    const panelPayload = buildAmongUsMutePanel();

    if (message) {
      clanPanels.amongUsMutePanelMessageId = message.id;
      savePanels();
      await message.edit(panelPayload).catch(err => {
        console.error("Error editing Among Us mute panel:", err);
      });
      console.log("Among Us mute panel already exists. Updated old panel, no spam.");
      return;
    }

    const sent = await channel.send(panelPayload).catch(err => {
      console.error("Error sending Among Us mute panel:", err);
      return null;
    });

    if (sent) {
      clanPanels.amongUsMutePanelMessageId = sent.id;
      savePanels();
      console.log("Among Us mute panel sent once and saved.");
    }
  } catch (err) {
    console.error("Error ensuring Among Us mute panel:", err);
  }
}

// ================= STAFF APPLY SYSTEM =================
function buildStaffApplyPanel() {
  const embed = new EmbedBuilder()
    .setColor("#040303")
    .setTitle("Staff Application")
    .setDescription("**Apply if you're active, mature, and ready for responsibility.**")
    .setImage("https://media.discordapp.net/attachments/1517874322428133571/1520550470790152262/image.png?ex=6a419a7a&is=6a4048fa&hm=2093b25e05954ac5d19b151637719ace3c2f728a915479738289e3bf61510ad4&=&format=webp&quality=lossless&width=916&height=330")
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("staff_apply_btn")
      .setLabel("Apply Staff")
      .setEmoji("<a:arrowgold:1463491747303657520>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("staff_check_status")
      .setLabel("Check Status")
      .setEmoji("<:1144silververify:1468928751000621136>")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function ensureStaffApplyPanel(guild) {
  try {
    const channel = guild.channels.cache.get(STAFF_APPLY_PANEL_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const existing = await channel.messages.fetch({ limit: 20 }).catch(() => null);
    const hasPanel = existing?.some(m =>
      m.author.id === client.user.id &&
      m.components?.some(r => r.components?.some(c => c.customId === 'staff_apply_btn'))
    );

    if (!hasPanel) {
      await channel.send(buildStaffApplyPanel()).catch(() => {});
    }
  } catch (err) {
    console.error("Error ensuring staff apply panel:", err);
  }
}

function memberCanUseStaffApply(member) {
  if (!member?.roles?.cache) return false;
  if ([...STAFF_APPLY_BLOCKED_ROLE_IDS].some(roleId => member.roles.cache.has(roleId))) return false;
  return member.roles.cache.has(STAFF_APPLY_ALLOWED_ROLE_ID);
}

async function handleStaffApplyButton(interaction) {
  if (!memberCanUseStaffApply(interaction.member)) {
    return interaction.reply({
      content: "You can't use this staff application.",
      flags: 64
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(STAFF_APPLY_MODAL_ID)
    .setTitle("Staff Application");

  const nameInput = new TextInputBuilder()
    .setCustomId('staff_name_age')
    .setLabel('What is your name and age?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const hoursInput = new TextInputBuilder()
    .setCustomId('staff_hours')
    .setLabel('How many hours per day can you be active?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const reasonInput = new TextInputBuilder()
    .setCustomId('staff_reason')
    .setLabel('Why do you want to become a staff member?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const toxicInput = new TextInputBuilder()
    .setCustomId('staff_toxic')
    .setLabel('How would you handle a toxic member?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const improveInput = new TextInputBuilder()
    .setCustomId('staff_improve')
    .setLabel('What would you improve in the server?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(hoursInput),
    new ActionRowBuilder().addComponents(reasonInput),
    new ActionRowBuilder().addComponents(toxicInput),
    new ActionRowBuilder().addComponents(improveInput)
  );

  await interaction.showModal(modal);
}

async function handleStaffApplyModal(interaction) {
  if (!memberCanUseStaffApply(interaction.member)) {
    return interaction.reply({
      content: "You can't submit this staff application.",
      flags: 64
    });
  }

  const nameAge = interaction.fields.getTextInputValue('staff_name_age').trim();
  const hours = interaction.fields.getTextInputValue('staff_hours').trim();
  const reason = interaction.fields.getTextInputValue('staff_reason').trim();
  const toxic = interaction.fields.getTextInputValue('staff_toxic').trim();
  const improve = interaction.fields.getTextInputValue('staff_improve').trim();

  const guild = interaction.guild;
  const reviewChannel = guild.channels.cache.get(STAFF_APPLY_REVIEW_CHANNEL_ID);
  if (!reviewChannel || !reviewChannel.isTextBased()) {
    await interaction.reply({ content: "The review channel is not set up correctly.", flags: 64 });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor("#040303")
    .setTitle("Staff Application")
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "Applicant", value: `${interaction.user} (${interaction.user.tag})`, inline: false },
      { name: "ID", value: `\`${interaction.user.id}\``, inline: false },
      { name: "Name & Age", value: nameAge, inline: false },
      { name: "Hours per Day", value: hours, inline: false },
      { name: "Why Staff", value: reason, inline: false },
      { name: "Handling Toxic Members", value: toxic, inline: false },
      { name: "What to Improve", value: improve, inline: false }
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`staff_accept_${interaction.user.id}`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`staff_reject_${interaction.user.id}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
  );

  await reviewChannel.send({ embeds: [embed], components: [row] }).catch(() => {});

  const apps = await loadStaffApplications();
  apps[interaction.user.id] = { status: 'pending', submittedAt: Date.now() };
  await saveStaffApplications(apps);

  await interaction.reply({ content: "Your application has been submitted.", flags: 64 });
}

async function handleStaffAccept(interaction, applicantId) {
  if (!interaction.member.roles.cache.has(STAFF_REVIEWER_ROLE_ID)) {
    await interaction.reply({ content: "You do not have permission to review applications.", flags: 64 });
    return;
  }

  await interaction.deferUpdate().catch(() => {});

  const guild = interaction.guild;
  const applicant = await client.users.fetch(applicantId).catch(() => null);
  if (!applicant) return;

  await applicant.send("Welcome to our staff team!").catch(() => {});

  const acceptedChannel = guild.channels.cache.get(STAFF_ACCEPTED_CHANNEL_ID);
  if (acceptedChannel && acceptedChannel.isTextBased()) {
    const embed = new EmbedBuilder()
      .setColor("#0403ff")
      .setTitle("New Staff Member")
      .setThumbnail(applicant.displayAvatarURL())
      .setDescription(`${applicant} has been accepted into the staff team!\n\nPlease join: ${JOIN_CHANNEL_LINK}`)
      .setTimestamp();

    await acceptedChannel.send({ content: `${applicant}`, embeds: [embed] }).catch(() => {});
  }

  const apps = await loadStaffApplications();
  if (apps[applicantId]) apps[applicantId].status = 'accepted';
  await saveStaffApplications(apps);

  const logChannel = guild.channels.cache.get(STAFF_LOG_CHANNEL_ID);
  if (logChannel && logChannel.isTextBased()) {
    const logEmbed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("Staff Application - Accepted")
      .addFields(
        { name: "Applicant", value: `<@${applicant.id}>`, inline: true },
        { name: "Reviewed by", value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  }

  const originalEmbed = interaction.message.embeds?.[0];
  if (originalEmbed) {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_accepted_${applicantId}`)
        .setLabel("Accepted")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`staff_rejected_${applicantId}`)
        .setLabel("Reject")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );
    await interaction.message.edit({ components: [disabledRow] }).catch(() => {});
  }
}

async function handleStaffReject(interaction, applicantId) {
  if (!interaction.member.roles.cache.has(STAFF_REVIEWER_ROLE_ID)) {
    await interaction.reply({ content: "You do not have permission to review applications.", flags: 64 });
    return;
  }

  await interaction.deferUpdate().catch(() => {});

  const applicant = await client.users.fetch(applicantId).catch(() => null);
  if (!applicant) return;

  await applicant.send("We're sorry, but your application has been rejected.").catch(() => {});

  const apps = await loadStaffApplications();
  if (apps[applicantId]) apps[applicantId].status = 'rejected';
  await saveStaffApplications(apps);

  const logChannel = interaction.guild.channels.cache.get(STAFF_LOG_CHANNEL_ID);
  if (logChannel && logChannel.isTextBased()) {
    const logEmbed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("Staff Application - Rejected")
      .addFields(
        { name: "Applicant", value: `<@${applicant.id}>`, inline: true },
        { name: "Reviewed by", value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  }

  const originalEmbed = interaction.message.embeds?.[0];
  if (originalEmbed) {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_accepted_${applicantId}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`staff_rejected_${applicantId}`)
        .setLabel("Rejected")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );
    await interaction.message.edit({ components: [disabledRow] }).catch(() => {});
  }
}

function memberCanUseAmongUsPanel(member) {
  if (!member) return false;

  return member.roles.cache.has(AMONG_US_PANEL_ROLE_ID) ||
    member.permissions.has(PermissionFlagsBits.Administrator);
}

function memberCanManageAmongUsBlacklist(member) {
  if (!member) return false;

  return member.roles.cache.has(AMONG_US_BLACKLIST_MANAGER_ROLE_ID) ||
    member.permissions.has(PermissionFlagsBits.Administrator);
}

function trimEmbedField(value, maxLength = 1024) {
  const text = String(value || "None");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

async function loadAmongUsBlacklistEntries() {
  try {
    const raw = await fs.promises.readFile(AMONG_US_BLACKLIST_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Could not read Among Us blacklist file:", err);
    }
    return [];
  }
}

async function saveAmongUsBlacklistEntries(entries) {
  await fs.promises.mkdir(path.dirname(AMONG_US_BLACKLIST_FILE), { recursive: true });
  await writeNow(AMONG_US_BLACKLIST_FILE, entries);
}

async function applyAmongUsBlacklistRoles(member, shouldBlacklist, auditReason) {
  const removeRoleId = shouldBlacklist ? AMONG_US_MEMBER_ROLE_ID : AMONG_US_BLACKLIST_ROLE_ID;
  const addRoleId = shouldBlacklist ? AMONG_US_BLACKLIST_ROLE_ID : AMONG_US_MEMBER_ROLE_ID;
  const changes = [];

  if (member.roles.cache.has(removeRoleId)) {
    await member.roles.remove(removeRoleId, auditReason);
    changes.push(`Removed <@&${removeRoleId}>`);
  } else {
    changes.push(`Already missing <@&${removeRoleId}>`);
  }

  if (!member.roles.cache.has(addRoleId)) {
    await member.roles.add(addRoleId, auditReason);
    changes.push(`Added <@&${addRoleId}>`);
  } else {
    changes.push(`Already has <@&${addRoleId}>`);
  }

  return changes;
}

async function sendAmongUsBlacklistLog(guild, payload) {
  const logChannel = guild.channels.cache.get(AMONG_US_BLACKLIST_LOG_CHANNEL_ID) ||
    await guild.channels.fetch(AMONG_US_BLACKLIST_LOG_CHANNEL_ID).catch(() => null);

  if (!logChannel || !logChannel.isTextBased()) return;

  const isBlacklist = payload.action === "blacklist";
  const embed = new EmbedBuilder()
    .setTitle(isBlacklist ? "Among Us Blacklist" : "Among Us Unblacklist")
    .setColor(isBlacklist ? 0xE74C3C : 0x2ECC71)
    .addFields(
      { name: "User", value: `<@${payload.userId}>\n\`${payload.userId}\``, inline: true },
      { name: "Moderator", value: `<@${payload.moderatorId}>\n\`${payload.moderatorId}\``, inline: true },
      { name: "Reason", value: trimEmbedField(payload.reason), inline: false },
      { name: "Roles", value: trimEmbedField(payload.roleChanges.join("\n")), inline: false }
    )
    .setFooter({ text: "Among Us Role Manager" })
    .setTimestamp();

  if (payload.oldReason) {
    embed.addFields({ name: "Previous Reason", value: trimEmbedField(payload.oldReason), inline: false });
  }

  await logChannel.send({ embeds: [embed] }).catch(err => {
    console.error("Could not send Among Us blacklist log:", err);
  });
}

function getMemberAmongUsVoiceChannel(member) {
  if (!member || !member.voice || !member.voice.channelId) return null;
  if (!AMONG_US_VOICE_CHANNEL_IDS.includes(member.voice.channelId)) return null;

  const channel = member.guild.channels.cache.get(member.voice.channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) return null;

  return channel;
}

function getAmongUsVoiceTargets(voiceChannel) {
  if (!voiceChannel || !voiceChannel.members) return [];

  return [...voiceChannel.members.values()].filter(member => !member.user.bot);
}

async function setAmongUsVoiceMute(voiceChannel, muted) {
  const targets = getAmongUsVoiceTargets(voiceChannel);
  let successCount = 0;
  let failedCount = 0;

  for (const target of targets) {
    try {
      await target.voice.setMute(
        muted,
        muted ? "Among Us panel mute" : "Among Us panel unmute"
      );

      successCount++;
    } catch (err) {
      failedCount++;
      console.error(`Among Us ${muted ? "mute" : "unmute"} failed for ${target.user.tag}:`, err);
    }
  }

  return {
    totalCount: targets.length,
    successCount,
    failedCount
  };
}

function getAmongUsRemainingUnmuteCooldown(channelId) {
  const lastMuteAt = amongUsVoiceMuteCooldowns.get(channelId) || 0;
  const remainingMs = AMONG_US_UNMUTE_COOLDOWN_MS - (Date.now() - lastMuteAt);

  return Math.max(0, Math.ceil(remainingMs / 1000));
}

function clearAmongUsLeaveUnmuteTimer(userId) {
  const oldTimer = amongUsLeaveUnmuteTimers.get(userId);

  if (oldTimer?.timeout) {
    clearTimeout(oldTimer.timeout);
  }

  amongUsLeaveUnmuteTimers.delete(userId);
}

async function autoUnmuteAmongUsMember(member, reason) {
  if (!member || !member.voice || !member.voice.channelId) return false;

  if (!member.voice.serverMute) return false;

  await member.voice.setMute(false, reason);
  return true;
}

async function handleAmongUsPendingAutoUnmute(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const pending = amongUsPendingAutoUnmutes.get(member.id);
  if (!pending) return;

  const newChannelId = newState.channelId;
  if (!newChannelId) return;

  if (newChannelId === pending.oldAmongUsChannelId) {
    amongUsPendingAutoUnmutes.delete(member.id);
    return;
  }

  const fetchedMember = await member.guild.members.fetch(member.id).catch(() => null);
  if (!fetchedMember) {
    amongUsPendingAutoUnmutes.delete(member.id);
    return;
  }

  await autoUnmuteAmongUsMember(
    fetchedMember,
    "Among Us auto unmute: joined another voice after leaving Among Us"
  ).catch(err => {
    console.error(`Among Us pending auto unmute failed for ${member.user.tag}:`, err);
  });

  amongUsPendingAutoUnmutes.delete(member.id);
}

async function handleAmongUsAutoUnmuteOnLeave(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  await handleAmongUsPendingAutoUnmute(oldState, newState);

  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (!AMONG_US_VOICE_CHANNEL_IDS.includes(oldChannelId)) return;
  if (newChannelId === oldChannelId) return;

  const wasServerMuted = Boolean(oldState.serverMute);
  if (!wasServerMuted) return;

  clearAmongUsLeaveUnmuteTimer(member.id);
  amongUsPendingAutoUnmutes.delete(member.id);

  const timeout = setTimeout(async () => {
    try {
      amongUsLeaveUnmuteTimers.delete(member.id);

      const fetchedMember = await member.guild.members.fetch(member.id).catch(() => null);
      if (!fetchedMember) return;

      const currentChannelId = fetchedMember.voice?.channelId || null;

      if (currentChannelId === oldChannelId) {
        return;
      }

      if (!currentChannelId) {
        amongUsPendingAutoUnmutes.set(member.id, {
          oldAmongUsChannelId: oldChannelId,
          createdAt: Date.now()
        });
        return;
      }

      await autoUnmuteAmongUsMember(
        fetchedMember,
        "Among Us auto unmute: left Among Us voice for 10 seconds"
      ).catch(err => {
        console.error(`Among Us auto unmute failed for ${member.user.tag}:`, err);
      });
    } catch (err) {
      console.error("Among Us auto unmute timer error:", err);
    }
  }, AMONG_US_AUTO_UNMUTE_AFTER_LEAVE_MS);

  amongUsLeaveUnmuteTimers.set(member.id, {
    oldAmongUsChannelId: oldChannelId,
    timeout
  });
}

function isAllowedPrivateOwnerVoiceMember(member) {
  if (!member) return false;
  return PRIVATE_OWNER_ALLOWED_USER_IDS.has(member.id);
}

async function wasMovedToPrivateOwnerVoiceByAllowedUser(guild) {
  try {
    const auditLogs = await guild.fetchAuditLogs({
      limit: 5,
      type: AuditLogEvent.MemberMove
    }).catch(() => null);

    if (!auditLogs) return false;

    return auditLogs.entries.some(log => {
      if (!log.executor) return false;
      if (!PRIVATE_OWNER_ALLOWED_USER_IDS.has(log.executor.id)) return false;
      if (Date.now() - log.createdTimestamp > PRIVATE_OWNER_MOVE_AUDIT_WINDOW_MS) return false;

      const movedToChannelId = log.extra?.channel?.id ||
        log.extra?.channelId ||
        log.extra?.channel_id ||
        null;

      return !movedToChannelId || movedToChannelId === PRIVATE_OWNER_VOICE_CHANNEL_ID;
    });
  } catch (err) {
    console.error("Private owner voice audit log check error:", err);
    return false;
  }
}

async function sendPrivateOwnerVoiceDm(member) {
  try {
    const embed = new EmbedBuilder()
      .setColor("#040303")
      .setTitle("Private Voice")
      .setDescription("This voice is private for owner. We are sorry.")
      .setTimestamp();

    await member.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error(`Private owner voice DM failed for ${member.user.tag}:`, err);
  }
}

async function kickFromPrivateOwnerVoice(member) {
  try {
    if (!member.voice || member.voice.channelId !== PRIVATE_OWNER_VOICE_CHANNEL_ID) return;

    await member.voice.disconnect("Private owner voice: not allowed").catch(async () => {
      await member.voice.setChannel(null, "Private owner voice: not allowed").catch(() => {});
    });
  } catch (err) {
    console.error(`Private owner voice kick failed for ${member.user.tag}:`, err);
  }
}

async function handlePrivateOwnerVoiceProtection(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (newChannelId !== PRIVATE_OWNER_VOICE_CHANNEL_ID) return;
  if (oldChannelId === PRIVATE_OWNER_VOICE_CHANNEL_ID) return;

  if (isAllowedPrivateOwnerVoiceMember(member)) return;

  const wasMovedByAllowedUser = await wasMovedToPrivateOwnerVoiceByAllowedUser(member.guild);

  if (wasMovedByAllowedUser) {
    console.log(`Private owner voice: ${member.user.tag} was moved by allowed owner/admin, no kick.`);
    return;
  }

  await sendPrivateOwnerVoiceDm(member);
  await kickFromPrivateOwnerVoice(member);
}

const staffVoiceNotifyCooldowns = new Map();

async function handleStaffWaitingVoiceNotification(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const newChannelId = newState.channelId;
  const oldChannelId = oldState.channelId;

  if (newChannelId !== STAFF_WAITING_VOICE_CHANNEL_ID) return;
  if (oldChannelId === STAFF_WAITING_VOICE_CHANNEL_ID) return;
  if (!member.roles.cache.has(STAFF_WAITING_ROLE_ID)) return;

  const now = Date.now();
  const cooldownMs = 60_000;
  const lastNotify = staffVoiceNotifyCooldowns.get(STAFF_VOICE_NOTIFY_CHANNEL_ID) || 0;
  if (now - lastNotify < cooldownMs) return;
  staffVoiceNotifyCooldowns.set(STAFF_VOICE_NOTIFY_CHANNEL_ID, now);

  const guild = member.guild;
  const notifyChannel = guild.channels.cache.get(STAFF_VOICE_NOTIFY_CHANNEL_ID);
  if (!notifyChannel || !notifyChannel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor("#040303")
    .setTitle("Waiting for Admin")
    .setThumbnail(member.user.displayAvatarURL())
    .setDescription(`${member} is waiting in <#${STAFF_WAITING_VOICE_CHANNEL_ID}> for an admin.`)
    .addFields(
      { name: "User", value: `${member.user.tag}`, inline: true },
      { name: "Channel", value: `<#${STAFF_WAITING_VOICE_CHANNEL_ID}>`, inline: true }
    )
    .setTimestamp();

  await notifyChannel.send({
    content: `<@&${VOICE_TEAM_ROLE_ID}> ${member} is waiting in <#${STAFF_WAITING_VOICE_CHANNEL_ID}>!`,
    embeds: [embed]
  }).catch(() => {});
}

async function handleAmongUsMuteButton(interaction, shouldMute) {
  try {
    if (interaction.channelId !== AMONG_US_PANEL_CHANNEL_ID) {
      await interaction.reply({
        content: `**Use the Among Us panel only in <#${AMONG_US_PANEL_CHANNEL_ID}>.**`,
        flags: 64
      }).catch(() => {});
      return;
    }

    if (!memberCanUseAmongUsPanel(interaction.member)) {
      await interaction.reply({
        content: `**You need <@&${AMONG_US_PANEL_ROLE_ID}> role or Administrator to use this panel.**`,
        flags: 64
      }).catch(() => {});
      return;
    }

    const voiceChannel = getMemberAmongUsVoiceChannel(interaction.member);

    if (!voiceChannel) {
      await interaction.reply({
        content: `**You must be inside <#${AMONG_US_VOICE_CHANNEL_IDS[0]}> or <#${AMONG_US_VOICE_CHANNEL_IDS[1]}> to use this panel.**`,
        flags: 64
      }).catch(() => {});
      return;
    }

    if (!shouldMute) {
      const remainingSeconds = getAmongUsRemainingUnmuteCooldown(voiceChannel.id);

      if (remainingSeconds > 0) {
        await interaction.reply({
          content: `**Wait ${remainingSeconds}s before using Unmute in ${voiceChannel}.**`,
          flags: 64
        }).catch(() => {});
        return;
      }
    }

    await interaction.deferReply({ flags: 64 });

    const result = await setAmongUsVoiceMute(voiceChannel, shouldMute);

    if (shouldMute) {
      amongUsVoiceMuteCooldowns.set(voiceChannel.id, Date.now());
    }

    await interaction.editReply({
      content:
        `${shouldMute ? "🔇" : "🔊"} **${shouldMute ? "Muted" : "Unmuted"} ${result.successCount}/${result.totalCount} member(s) in ${voiceChannel}.**` +
        (result.failedCount > 0 ? `
**Failed:** ${result.failedCount}. Check bot role / Mute Members permission.` : "")
    }).catch(() => {});
  } catch (err) {
    console.error("Error handling Among Us mute button:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "**Something went wrong with the Among Us mute panel.**",
        flags: 64
      }).catch(() => {});
    } else {
      await interaction.editReply({
        content: "**Something went wrong with the Among Us mute panel.**"
      }).catch(() => {});
    }
  }
}

function buildLeaveClanPanel() {
  const embed = new EmbedBuilder()
    .setTitle("Leave Clan")
    .setDescription("<:66154legendaryrank:1467957195537912056> Click the button below to **Leave** your **Clan.**")
    .setColor("#054674");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("leave_clan")
      .setLabel("Leave Clan")
      .setEmoji("<a:BongoRage:1470261001470349382>")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function ensureLeaveClanPanel(guild) {
  try {
    const channel = guild.channels.cache.get(CLAN_LEAVE_PANEL_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    let message = await safeFetchMessage(channel, clanPanels.leavePanelMessageId);

    if (!message) {
      message = await findBotButtonMessage(channel, "leave_clan");
    }

    const panelPayload = buildLeaveClanPanel();

    if (message) {
      clanPanels.leavePanelMessageId = message.id;
      savePanels();
      await message.edit(panelPayload).catch(() => {});
      return;
    }

    const sent = await channel.send(panelPayload).catch(() => null);
    if (sent) {
      clanPanels.leavePanelMessageId = sent.id;
      savePanels();
    }
  } catch (err) {
    console.error("Error ensuring leave clan panel:", err);
  }
}

async function buildClanboardMessage(guild, page) {
  await ensureClanCache(guild);
  const allClans = getSortedClanEntries(guild);
  const totalPages = Math.max(1, Math.ceil(allClans.length / CLANBOARD_CLANS_PER_PAGE));
  const currentPage = Math.max(0, Math.min((page || 0), totalPages - 1));
  const pageClans = allClans.slice(currentPage * CLANBOARD_CLANS_PER_PAGE, (currentPage + 1) * CLANBOARD_CLANS_PER_PAGE);

  const buffer = await renderClanboardCard({
    guild,
    clans: pageClans,
    allClans,
    page: currentPage,
    totalPages,
    totalClans: allClans.length,
    leaderRoleId: LEADER_ROLE_ID
  });
  const attachment = new AttachmentBuilder(buffer, { name: 'clanboard.png' });

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('clanboard_prev')
      .setLabel('◀  Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 0),
    new ButtonBuilder()
      .setCustomId('clanboard_next')
      .setLabel('Next  ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1)
  );

  const components = [navRow];

  return { files: [attachment], components };
}

async function sendOrUpdateClanboard(guild, page) {
  try {
    const channel = guild.channels.cache.get(CLANBOARD_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return null;

    const p = page !== undefined ? page : (clanboardPages.get(CLANBOARD_CHANNEL_ID) || 0);
    const payload = await buildClanboardMessage(guild, p);
    clanboardPages.set(CLANBOARD_CHANNEL_ID, p);

    let message = await safeFetchMessage(channel, clanPanels.clanboardMessageId);

    if (!message) {
      message = await findBotButtonMessage(channel, "refresh_clanboard");
      if (!message) {
        message = await findBotButtonMessage(channel, "clanboard_prev");
      }
      if (!message) {
        message = await findBotButtonMessage(channel, "clanboard_next");
      }
    }

    if (message) {
      clanPanels.clanboardMessageId = message.id;
      savePanels();
      await message.edit(payload).catch(() => {});
      return message;
    }

    const sent = await channel.send(payload).catch(() => null);
    if (sent) {
      clanPanels.clanboardMessageId = sent.id;
      savePanels();
    }

    return sent;
  } catch (err) {
    console.error("Error sending clanboard:", err);
    return null;
  }
}

async function notifyClanboardRefreshDue(clientInstance) {
  try {
    if (!clanPanels.clanboardRefreshAt || clanPanels.clanboardRefreshAt <= 0) {
      clanPanels.clanboardRefreshAt = Date.now() + FOURTEEN_DAYS;
      clanPanels.clanboardNotified = false;
      savePanels();
      return;
    }

    if (Date.now() < clanPanels.clanboardRefreshAt) return;
    if (clanPanels.clanboardNotified) return;

    const user = await clientInstance.users.fetch(CLANBOARD_REFRESH_USER_ID).catch(() => null);
    if (user) {
      await user.send({
        content: `**The 14 days clanboard refresh timer is finished. Please click the Refresh button under the clanboard in <#${CLANBOARD_CHANNEL_ID}> to update the leaderboard.**`
      }).catch(() => {});
    }

    clanPanels.clanboardNotified = true;
    savePanels();
  } catch (err) {
    console.error("Error notifying clanboard refresh due:", err);
  }
}

// ================= TOP CLAN CATEGORY SYSTEM =================
async function moveChannelToCategory(channel, categoryId) {
  try {
    if (!channel || !categoryId) return;
    if (channel.parentId === categoryId) return;

    await channel.setParent(categoryId, {
      lockPermissions: false,
      reason: "Clan points category refresh"
    }).catch(err => {
      console.error(`Error moving channel ${channel.name}:`, err);
    });
  } catch (err) {
    console.error("Move channel error:", err);
  }
}

async function syncTopClanCategories(guild) {
  try {
    const sortedClans = getSortedClanEntries(guild);
    const topChannelIds = new Set(sortedClans.slice(0, TOP_CLANS_LIMIT).map(entry => entry.channelId));

    for (const entry of sortedClans) {
      const targetCategory = topChannelIds.has(entry.channelId)
        ? TOP_CLANS_CATEGORY_ID
        : NORMAL_CLANS_CATEGORY_ID;

      await moveChannelToCategory(entry.channel, targetCategory);
    }

    const topClans = sortedClans.filter(entry => topChannelIds.has(entry.channelId));
    const normalClans = sortedClans.filter(entry => !topChannelIds.has(entry.channelId));

    for (let i = 0; i < topClans.length; i++) {
      await topClans[i].channel.setPosition(i).catch(() => {});
    }

    for (let i = 0; i < normalClans.length; i++) {
      await normalClans[i].channel.setPosition(i).catch(() => {});
    }
  } catch (err) {
    console.error("Error syncing top clan categories:", err);
  }
}

async function refreshClanSystem(guild) {
  await ensureClanCache(guild);
  await syncTopClanCategories(guild);
  await sendOrUpdateClanboard(guild);
}

// ================= JOIN CLAN PANEL =================
function buildJoinClanEmbed(guild, isTop) {
  const entries = isTop ? getTopClanEntries(guild) : getNormalClanEntries(guild);
  const title = isTop ? '<:23:1473011496446464112> Join a Top Clan' : 'Join NYXEN Clan';
  const desc = entries.length > 0
    ? entries.map((e, i) => {
        const emoji = i === 0 ? '<a:DEv1:1468912308473430136>' : i === 1 ? '<a:30646secondplacetrophy:1468917487449014501>' : i === 2 ? '<a:DV3ww:1468912628830175264>' : '';
        const members = guild.members.cache.filter(m => m.roles.cache.has(e.clanRoleId)).size;
        return `${emoji} <@&${e.clanRoleId}> — ${members}/${MAX_CLAN_MEMBERS} members`.trim();
      }).map(line => `## ${line}`).join('\n\n')
    : 'No clans available.';

  return new EmbedBuilder()
    .setColor(isTop ? 0xd0d0d0 : 0xd0d0d0)
    .setTitle(title)
    .setDescription(`Select the clan you'd like to join.
Click the **Join Clan** button below to send your request.

.\n\n## <:23:1473011496446464112>  Available Clans

\n${desc}



<:tevh:1508746379869028402> You can only be a member of one clan at a time.`)

}

function buildJoinClanRow(isTop) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(isTop ? 'join_top_btn' : 'join_normal_btn')
      .setLabel('Join Clan')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('<:42920arrowrightalt:1474946022953189486>')
  );
}

async function ensureJoinClanPanel(guild, channelId) {
  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  const isTop = channelId === TOP_JOIN_CHANNEL_ID;
  const btnId = isTop ? 'join_top_btn' : 'join_normal_btn';
  const requiredIds = [btnId];

  const existing = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const hasPanel = existing?.some(m => {
    if (m.author.id !== client.user.id) return false;
    const msgIds = new Set();
    m.components?.forEach(r => r.components?.forEach(c => msgIds.add(c.customId)));
    return requiredIds.every(id => msgIds.has(id));
  });

  if (existing) {
    for (const msg of existing.values()) {
      if (msg.author.id !== client.user.id) continue;
      const msgIds = new Set();
      msg.components?.forEach(r => r.components?.forEach(c => msgIds.add(c.customId)));
      if (!requiredIds.every(id => msgIds.has(id))) {
        await msg.delete().catch(() => {});
      }
    }
  }

  if (hasPanel) {
    const panelMsg = existing.find(m => {
      if (m.author.id !== client.user.id) return false;
      const msgIds = new Set();
      m.components?.forEach(r => r.components?.forEach(c => msgIds.add(c.customId)));
      return requiredIds.every(id => msgIds.has(id));
    });
    if (panelMsg) {
      await panelMsg.edit({ embeds: [buildJoinClanEmbed(guild, isTop)] }).catch(() => {});
      return;
    }
  }

  if (!hasPanel) {
    await channel.send({
      embeds: [buildJoinClanEmbed(guild, isTop)],
      components: [buildJoinClanRow(isTop)]
    }).catch(() => {});
  }
}

async function refreshJoinClanPanels(guild) {
  await ensureJoinClanPanel(guild, NORMAL_JOIN_CHANNEL_ID).catch(err => console.error("Error refreshing normal join panel:", err));
  await ensureJoinClanPanel(guild, TOP_JOIN_CHANNEL_ID).catch(err => console.error("Error refreshing top join panel:", err));
}

function buildApplyClanPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('<a:DVwings:1417989070667255859> Apply for a Clan')
    .setDescription(
      'To open your own clan, you must meet the following requirements:\n\n' +
      '> <:586735checkmark:1472282353337368587> Be an **active** member in the server\n' +
      '> <:586735checkmark:1472282353337368587> Have at least **7 members** ready to join your clan\n' +
      '> <:586735checkmark:1472282353337368587> Follow all server rules\n\n' +
      'Click the button below to apply.'
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open_clan')
      .setLabel('Apply Clan')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('<:42920arrowrightalt:1474946022953189486>')
  );
  return { embeds: [embed], components: [row] };
}

async function ensureApplyClanPanel(guild) {
  const channel = guild.channels.cache.get(APPLY_CLAN_PANEL_CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const existing = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const hasPanel = existing?.some(m =>
    m.author.id === client.user.id &&
    m.components?.some(r => r.components?.some(c => c.customId === 'ticket_open_clan'))
  );

  if (existing) {
    for (const msg of existing.values()) {
      if (msg.author.id !== client.user.id) continue;
      if (msg.components?.some(r => r.components?.some(c => c.customId === 'ticket_open_clan'))) continue;
      await msg.delete().catch(() => {});
    }
  }

  if (hasPanel) return;

  const payload = buildApplyClanPanel();
  await channel.send(payload).catch(() => {});
}

async function ensureClanAddRemovePanel(guild) {
  const channel = guild.channels.cache.get(ADD_REMOVE_PANEL_CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const existing = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const hasPanel = existing?.some(m =>
    m.author.id === client.user.id &&
    m.components?.some(r => r.components?.some(c => c.customId === 'clan_add_btn' || c.customId === 'clan_remove_btn'))
  );

  if (!hasPanel) {
    const embed = new EmbedBuilder()
      .setColor(0xe8e8e8)
      .setTitle('<:Screenshot_20260615_000851remove:1516038437252239462> Clan Member Management')
      .setDescription('**Use the buttons below to add or remove members from your clan.**')
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('clan_add_btn')
        .setLabel('Invite Member')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('<:64211pluslogo:1472282370869694514>'),
      new ButtonBuilder()
        .setCustomId('clan_remove_btn')
        .setLabel('Remove Member')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('<a:DVvxXx:1467408812083253258>')
    );

    await channel.send({ embeds: [embed], components: [row] }).catch(() => {});
  }
}

async function sendJoinClanSelect(interaction, isTop) {
  const guild = interaction.guild;
  const entries = isTop ? getTopClanEntries(guild) : getNormalClanEntries(guild);

  if (entries.length === 0) {
    return interaction.reply({ content: 'No clans available to join.', flags: 64 });
  }

  const existingClan = trackedVoiceChannels.find(c =>
    isValidClanEntry(c) && interaction.member.roles.cache.has(c.clanRoleId)
  );
  if (existingClan) {
    return interaction.reply({ content: 'You are already in a clan.', flags: 64 });
  }

  const options = entries.slice(0, 25).map(e => {
    const members = guild.members.cache.filter(m => m.roles.cache.has(e.clanRoleId)).size;
    return {
      label: e.role.name.slice(0, 100),
      description: `${members}/${MAX_CLAN_MEMBERS} members`,
      value: e.clanRoleId
    };
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId(isTop ? 'join_top_select' : 'join_normal_select')
    .setPlaceholder('Select a clan to join')
    .addOptions(options);

  await interaction.reply({
    content: 'Choose a clan:',
    components: [new ActionRowBuilder().addComponents(select)],
    flags: 64
  });
}

async function handleJoinClanSelect(interaction, clanRoleId) {
  const guild = interaction.guild;
  const clanRole = guild.roles.cache.get(clanRoleId);
  if (!clanRole) {
    return interaction.reply({ content: 'Clan not found.', flags: 64 });
  }

  const existingClan = trackedVoiceChannels.find(c =>
    isValidClanEntry(c) && interaction.member.roles.cache.has(c.clanRoleId)
  );
  if (existingClan) {
    return interaction.update({ content: 'You are already in a clan.', components: [] });
  }

  const lastRequest = clanRequestCooldowns.get(interaction.user.id);
  if (lastRequest && Date.now() - lastRequest < CLAN_REQUEST_COOLDOWN_MS) {
    const remaining = Math.ceil((CLAN_REQUEST_COOLDOWN_MS - (Date.now() - lastRequest)) / 3600000);
    return interaction.update({ content: `**You can only send one join request every 24h. Please wait ${remaining}h.**`, components: [] });
  }

  pendingJoinClan.set(interaction.user.id, clanRoleId);

  const modal = new ModalBuilder()
    .setCustomId(JOIN_CLAN_MODAL_ID)
    .setTitle(`Join ${clanRole.name}`);

  const reasonInput = new TextInputBuilder()
    .setCustomId('join_reason')
    .setLabel('Why do you want to join this clan?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('Write your reason here...')
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

  await interaction.showModal(modal);
}

async function handleJoinClanModal(interaction) {
  const reason = interaction.fields.getTextInputValue('join_reason').trim();
  const clanRoleId = pendingJoinClan.get(interaction.user.id);
  pendingJoinClan.delete(interaction.user.id);

  if (!clanRoleId) {
    return interaction.reply({ content: 'Session expired. Please try again.', flags: 64 });
  }

  const guild = interaction.guild;
  const clanRole = guild.roles.cache.get(clanRoleId);
  if (!clanRole) {
    return interaction.reply({ content: 'Clan not found.', flags: 64 });
  }

  const existingClan = trackedVoiceChannels.find(c =>
    isValidClanEntry(c) && interaction.member.roles.cache.has(c.clanRoleId)
  );
  if (existingClan) {
    return interaction.reply({ content: 'You are already in a clan.', flags: 64 });
  }

  const membersWithRole = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId));
  if (membersWithRole.size >= MAX_CLAN_MEMBERS) {
    return interaction.reply({ content: `**${clanRole.name}** already has ${MAX_CLAN_MEMBERS} members. No more slots available.`, flags: 64 });
  }

  const leader = guild.members.cache.find(m =>
    m.roles.cache.has(LEADER_ROLE_ID) && m.roles.cache.has(clanRoleId)
  );
  const coLeader = guild.members.cache.find(m =>
    m.roles.cache.has(CO_LEADER_ROLE_ID) && m.roles.cache.has(clanRoleId)
  );

  function isOnline(member) {
    return member && member.presence && member.presence.status !== 'offline';
  }

  const leaderOnline = isOnline(leader);
  const coLeaderOnline = isOnline(coLeader);

  let targetOwner;
  if (leader && coLeader) {
    if (leaderOnline && !coLeaderOnline) targetOwner = leader;
    else if (!leaderOnline && coLeaderOnline) targetOwner = coLeader;
    else targetOwner = leader;
  } else if (leader) {
    targetOwner = leader;
  } else if (coLeader) {
    targetOwner = coLeader;
  }

  if (!targetOwner) {
    return interaction.reply({ content: 'This clan has no leader or co-leader to approve your request.', flags: 64 });
  }

  clanRequestCooldowns.set(interaction.user.id, Date.now());

  sendClanJoinLog(guild, 'request', {
    memberId: interaction.user.id,
    memberTag: interaction.user.tag,
    clanName: clanRole.name,
    reason
  });

  await interaction.reply({
    content: `Your request to join **${clanRole.name}** has been sent to the leader.`,
    flags: 64
  });

  const requestId = `${interaction.user.id}_${clanRoleId}`;
  const acceptBtn = new ButtonBuilder()
    .setCustomId(`join_accept_${requestId}`)
    .setLabel('Accept')
    .setStyle(ButtonStyle.Success);
  const rejectBtn = new ButtonBuilder()
    .setCustomId(`join_reject_${requestId}`)
    .setLabel('Reject')
    .setStyle(ButtonStyle.Danger);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Join Request')
    .addFields(
      { name: 'Member', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: false },
      { name: 'Clan', value: clanRole.name, inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: false }
    )
    .setTimestamp();

  await targetOwner.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(acceptBtn, rejectBtn)]
  }).catch(() => {
    interaction.followUp({ content: 'Could not DM the clan leader.', flags: 64 }).catch(() => {});
  });
}

async function handleJoinAccept(interaction, memberId, clanRoleId) {
  await interaction.deferUpdate().catch(() => {});

  const guild = client.guilds.cache.first();
  if (!guild) {
    return interaction.editReply({ content: 'Guild not found.', components: [], embeds: [] }).catch(() => {});
  }
  const clanRole = guild.roles.cache.get(clanRoleId);
  if (!clanRole) {
    return interaction.editReply({ content: 'Clan role not found.', components: [], embeds: [] }).catch(() => {});
  }

  const member = await guild.members.fetch(memberId).catch(() => null);
  if (!member) {
    return interaction.editReply({ content: 'Member not found in the server.', components: [], embeds: [] }).catch(() => {});
  }

  const membersWithRole = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId));
  if (membersWithRole.size >= MAX_CLAN_MEMBERS) {
    return interaction.editReply({
      content: `**${clanRole.name}** already has ${MAX_CLAN_MEMBERS} members. Cannot add more.`,
      components: [], embeds: []
    }).catch(() => {});
  }

  await member.roles.add(clanRoleId).catch(() => {});

  const clanEntry = findClanEntryByRoleId(clanRoleId);
  if (clanEntry) {
    const voiceChannel = guild.channels.cache.get(clanEntry.id);
    if (voiceChannel) {
      await voiceChannel.send(`👋 <@${memberId}> has joined **${clanRole.name}**! Welcome!`).catch(() => {});
    }
  }

  sendClanJoinLog(guild, 'accept', {
    memberId,
    memberTag: member.user.tag,
    clanName: clanRole.name,
    reviewer: `<@${interaction.user.id}>`
  });

  checkClanCapacityAndWarn(guild, clanRoleId);

  await interaction.editReply({
    content: `✅ **Accepted.** ${member.user.tag} has been added to **${clanRole.name}**.`,
    components: [], embeds: []
  }).catch(() => {});

  await member.send(`✅ Your request to join **${clanRole.name}** has been accepted! Welcome!`).catch(() => {});

  await refreshJoinClanPanels(guild);
}

async function handleJoinReject(interaction, memberId, clanRoleId) {
  await interaction.deferUpdate().catch(() => {});

  const guild = client.guilds.cache.first();
  if (!guild) return interaction.editReply({ content: 'Guild not found.', components: [], embeds: [] }).catch(() => {});
  const clanRole = guild.roles.cache.get(clanRoleId);
  const roleName = clanRole?.name || 'the clan';

  const member = await client.users.fetch(memberId).catch(() => null);
  if (member) {
    await member.send(`❌ Sorry, your request to join **${roleName}** has been rejected.`).catch(() => {});
  }

  sendClanJoinLog(guild, 'reject', {
    memberId,
    memberTag: member?.tag || memberId,
    clanName: roleName,
    reviewer: `<@${interaction.user.id}>`
  });

  await interaction.editReply({
    content: `❌ **Rejected.** The member has been notified.`,
    components: [], embeds: []
  }).catch(() => {});
}

async function handleInviteAccept(interaction, targetId, clanRoleId, inviterId) {
  await interaction.deferUpdate().catch(() => {});

  const guild = client.guilds.cache.first();
  if (!guild) {
    return interaction.editReply({ content: 'Guild not found.', components: [], embeds: [] }).catch(() => {});
  }

  const clanRole = guild.roles.cache.get(clanRoleId);
  if (!clanRole) {
    return interaction.editReply({ content: 'Clan role not found.', components: [], embeds: [] }).catch(() => {});
  }

  const member = await guild.members.fetch(targetId).catch(() => null);
  if (!member) {
    return interaction.editReply({ content: 'You are no longer in the server.', components: [], embeds: [] }).catch(() => {});
  }

  const membersWithRole = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId));
  if (membersWithRole.size >= MAX_CLAN_MEMBERS) {
    return interaction.editReply({
      content: `**${clanRole.name}** already has ${MAX_CLAN_MEMBERS} members. Cannot add more.`,
      components: [], embeds: []
    }).catch(() => {});
  }

  if (member.roles.cache.has(clanRoleId)) {
    return interaction.editReply({
      content: 'You are already in this clan.',
      components: [], embeds: []
    }).catch(() => {});
  }

  await member.roles.add(clanRoleId).catch(() => {});

  const clanEntry = findClanEntryByRoleId(clanRoleId);
  if (clanEntry) {
    const voiceChannel = guild.channels.cache.get(clanEntry.id);
    if (voiceChannel) {
      await voiceChannel.send(`👋 <@${targetId}> has joined **${clanRole.name}**! Welcome!`).catch(() => {});
    }
  }

  checkClanCapacityAndWarn(guild, clanRoleId);

  await interaction.editReply({
    content: `✅ You have joined **${clanRole.name}**!`,
    components: [], embeds: []
  }).catch(() => {});

  const inviter = await client.users.fetch(inviterId).catch(() => null);
  if (inviter) {
    await inviter.send(`<:586735checkmark:1472282353337368587> <@${targetId}> has accepted your invitation to join **${clanRole.name}**.`).catch(() => {});
  }

  await refreshJoinClanPanels(guild);
}

async function handleInviteReject(interaction, targetId, clanRoleId, inviterId) {
  await interaction.deferUpdate().catch(() => {});

  const guild = client.guilds.cache.first();
  if (!guild) return interaction.editReply({ content: 'Guild not found.', components: [], embeds: [] }).catch(() => {});
  const clanRole = guild.roles.cache.get(clanRoleId);
  const roleName = clanRole?.name || 'the clan';

  await interaction.editReply({
    content: `❌ You declined the invitation to **${roleName}**.`,
    components: [], embeds: []
  }).catch(() => {});

  const inviter = await client.users.fetch(inviterId).catch(() => null);
  if (inviter) {
    const target = await client.users.fetch(targetId).catch(() => null);
    const tag = target?.tag || targetId;
    await inviter.send(`❌ **${tag}** has rejected your invitation to join **${roleName}**.`).catch(() => {});
  }
}

// ================= READY / STARTUP =================
let botReadyStarted = false;

async function handleAddMemberButton(interaction) {
  if (
    !interaction.member.roles.cache.has(LEADER_ROLE_ID) &&
    !interaction.member.roles.cache.has(CO_LEADER_ROLE_ID)
  ) {
    return interaction.reply({ content: 'Only clan leaders and co-leaders can use this.', flags: 64 });
  }

  const clanEntry = trackedVoiceChannels.find(c =>
    isValidClanEntry(c) && interaction.member.roles.cache.has(c.clanRoleId)
  );
  if (!clanEntry) {
    return interaction.reply({ content: 'You do not have a clan.', flags: 64 });
  }

  const modal = new ModalBuilder()
    .setCustomId('clan_add_modal')
    .setTitle('Invite Member');

  const memberIdInput = new TextInputBuilder()
    .setCustomId('add_member_id')
    .setLabel('Member ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Enter the member ID to invite');

  const reasonInput = new TextInputBuilder()
    .setCustomId('add_reason')
    .setLabel('Reason / Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('Why do you want this member in your clan?')
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(memberIdInput),
    new ActionRowBuilder().addComponents(reasonInput)
  );

  await interaction.showModal(modal);
}

async function handleClanAddModal(interaction) {
  const memberId = interaction.fields.getTextInputValue('add_member_id').trim();
  const reason = interaction.fields.getTextInputValue('add_reason').trim();

  const guild = interaction.guild;
  const target = await guild.members.fetch(memberId).catch(() => null);
  if (!target) {
    return interaction.editReply({ content: 'User not found in this server.' });
  }

  const clanEntry = trackedVoiceChannels.find(c =>
    isValidClanEntry(c) && interaction.member.roles.cache.has(c.clanRoleId)
  );
  if (!clanEntry) {
    return interaction.editReply({ content: 'You do not have a clan.' });
  }

  const membersWithRole = guild.members.cache.filter(m => m.roles.cache.has(clanEntry.clanRoleId));
  if (membersWithRole.size >= MAX_CLAN_MEMBERS) {
    return interaction.editReply({ content: `Your clan already has ${MAX_CLAN_MEMBERS} members. Cannot invite more.` });
  }

  if (target.roles.cache.has(clanEntry.clanRoleId)) {
    return interaction.editReply({ content: 'That user is already in your clan.' });
  }

  const inAnotherClan = trackedVoiceChannels.some(c =>
    isValidClanEntry(c) && c.clanRoleId !== clanEntry.clanRoleId && target.roles.cache.has(c.clanRoleId)
  );
  if (inAnotherClan) {
    return interaction.editReply({ content: 'That user is already in another clan.' });
  }

  const clanRole = guild.roles.cache.get(clanEntry.clanRoleId);
  const roleName = clanRole?.name || 'the clan';

  await interaction.editReply({ content: `📨 Invitation sent to ${target}.` });

  const requestId = `${target.id}_${clanEntry.clanRoleId}_${interaction.user.id}`;
  const acceptBtn = new ButtonBuilder()
    .setCustomId(`invite_accept_${requestId}`)
    .setLabel('Accept')
    .setStyle(ButtonStyle.Success);
  const rejectBtn = new ButtonBuilder()
    .setCustomId(`invite_reject_${requestId}`)
    .setLabel('Reject')
    .setStyle(ButtonStyle.Danger);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Clan Invitation')
    .addFields(
      { name: 'Clan', value: roleName, inline: true },
      { name: 'Invited by', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
      { name: 'By leader:', value: reason || 'No reason provided', inline: false }
    )
    .setTimestamp();

  await target.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(acceptBtn, rejectBtn)]
  }).catch(() => {
    interaction.followUp({ content: `Could not DM ${target}. They may have DMs disabled.`, flags: 64 }).catch(() => {});
  });
}

async function handleRemoveMemberButton(interaction) {
  if (
    !interaction.member.roles.cache.has(LEADER_ROLE_ID) &&
    !interaction.member.roles.cache.has(CO_LEADER_ROLE_ID)
  ) {
    return interaction.reply({ content: 'Only clan leaders and co-leaders can use this.', flags: 64 });
  }

  const guild = interaction.guild;
  const clanEntry = trackedVoiceChannels.find(c =>
    isValidClanEntry(c) && interaction.member.roles.cache.has(c.clanRoleId)
  );
  if (!clanEntry) {
    return interaction.reply({ content: 'You do not have a clan.', flags: 64 });
  }

  const members = guild.members.cache.filter(m =>
    m.roles.cache.has(clanEntry.clanRoleId) &&
    m.id !== interaction.user.id
  );

  if (members.size === 0) {
    return interaction.reply({ content: 'No other members to remove.', flags: 64 });
  }

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('Members')
    .setDescription(members.map(m => `${m}`).join('\n'))
    .setTimestamp();

  const options = members.map(m => ({
    label: m.user.username.slice(0, 100),
    description: m.id,
    value: m.id
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('clan_remove_select')
    .setPlaceholder('Select a member to remove')
    .addOptions(options);

  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
    flags: 64
  });
}

async function handleClanRemoveSelect(interaction, memberId) {
  const guild = interaction.guild;
  const target = await guild.members.fetch(memberId).catch(() => null);
  if (!target) {
    return interaction.update({ content: 'User not found.', components: [], embeds: [] });
  }

  const clanEntry = trackedVoiceChannels.find(c =>
    isValidClanEntry(c) && target.roles.cache.has(c.clanRoleId)
  );
  if (!clanEntry) {
    return interaction.update({ content: 'That member is not in your clan.', components: [], embeds: [] });
  }

  await target.roles.remove(clanEntry.clanRoleId).catch(() => {});
  const clanRole = guild.roles.cache.get(clanEntry.clanRoleId);
  const roleName = clanRole?.name || 'the clan';

  await interaction.update({
    content: `✅ ${target} removed from **${roleName}**.`,
    components: [], embeds: []
  });

  await refreshJoinClanPanels(guild);
}

async function handleBotReady() {
  try {
    if (botReadyStarted) return;
    botReadyStarted = true;

    const guild = client.guilds.cache.first();
    if (!guild) return;

    // Join AFK voice channel
    const afkChannel = guild.channels.cache.get('1417802588669087798');
    if (afkChannel) {
      try {
        joinVoiceChannel({
          channelId: afkChannel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfMute: true,
          selfDeaf: false
        });
      } catch (err) {
        console.error('Error joining AFK voice channel:', err);
      }
    }

    await ensureLeaveClanPanel(guild).catch(err => console.error("Error ensuring leave panel:", err));
    await ensureAmongUsMutePanel(guild).catch(err => console.error("Error ensuring amongus panel:", err));
    await sendWelcomeMessage(client).catch(err => {
      console.error("Error sending welcome message:", err);
    });

    const clanPanelChannel = guild.channels.cache.get(CLAN_PANEL_CHANNEL_ID);
    if (clanPanelChannel?.isTextBased()) {
      const existing = await clanPanelChannel.messages.fetch({ limit: 20 }).catch(() => null);
      const hasPanel = existing?.some(m =>
        m.author.id === client.user.id &&
        m.components?.some(r => r.components?.some(c => c.customId === 'clan_panel_create'))
      );
      if (!hasPanel) {
        await sendClanPanel(clanPanelChannel);
      }
    }

    await ensureJoinClanPanel(guild, NORMAL_JOIN_CHANNEL_ID).catch(err => console.error("Error ensuring normal join panel:", err));
    await ensureJoinClanPanel(guild, TOP_JOIN_CHANNEL_ID).catch(err => console.error("Error ensuring top join panel:", err));
    await ensureClanAddRemovePanel(guild).catch(err => console.error("Error ensuring add/remove panel:", err));
    await ensureApplyClanPanel(guild).catch(err => console.error("Error ensuring apply clan panel:", err));
    await ensureStaffApplyPanel(guild).catch(err => console.error("Error ensuring staff apply panel:", err));
    await ensureAdminDashboardPanel(guild).catch(err => console.error("Error ensuring admin dashboard panel:", err));

    // Auto cleanup old panels
    const panelChannels = [
      { id: CLAN_PANEL_CHANNEL_ID, ids: ['clan_panel_create'] },
      { id: NORMAL_JOIN_CHANNEL_ID, ids: ['join_normal_btn'] },
      { id: TOP_JOIN_CHANNEL_ID, ids: ['join_top_btn'] },
      { id: CLAN_LEAVE_PANEL_CHANNEL_ID, ids: ['leave_clan'] },
      { id: AMONG_US_PANEL_CHANNEL_ID, ids: ['amongus_mute'] },
      { id: ADD_REMOVE_PANEL_CHANNEL_ID, ids: ['clan_add_btn', 'clan_remove_btn'] },
      { id: APPLY_CLAN_PANEL_CHANNEL_ID, ids: ['ticket_open_clan'] },
      { id: STAFF_APPLY_PANEL_CHANNEL_ID, ids: ['staff_apply_btn'] },
      { id: ADMIN_DASHBOARD_CHANNEL_ID, ids: ['admin_refresh_panels'] }
    ];

    for (const panelConfig of panelChannels) {
      try {
        const channel = guild.channels.cache.get(panelConfig.id) ||
          await guild.channels.fetch(panelConfig.id).catch(() => null);
        if (!channel || !channel.isTextBased()) continue;

        const messages = await channel.messages.fetch({ limit: 30 }).catch(() => null);
        if (!messages) continue;

        const botMsgs = messages.filter(m => m.author.id === client.user.id);
        const kept = new Set();

        for (const msg of botMsgs.values()) {
          const msgIds = new Set();
          msg.components?.forEach(r => r.components?.forEach(c => msgIds.add(c.customId)));
          const isCurrentPanel = panelConfig.ids.some(id => msgIds.has(id));

          if (isCurrentPanel) {
            if (kept.has('panel')) {
              await msg.delete().catch(() => {});
            } else {
              kept.add('panel');
            }
          } else {
            await msg.delete().catch(() => {});
          }
        }
      } catch (err) {
        console.error(`Error cleaning up panel ${panelConfig.id}:`, err);
      }
    }

    await refreshClanSystem(guild).catch(err => {
      console.error("Error refreshing clan system on ready:", err);
    });

    setInterval(() => {
      sendWelcomeMessage(client).catch(err => {
        console.error("Error refreshing welcome message:", err);
      });
    }, 4 * 60 * 60 * 1000);

    setInterval(() => {
      notifyClanboardRefreshDue(client).catch(err => {
        console.error("Error checking clanboard refresh timer:", err);
      });
    }, 60 * 1000);

    // Periodic cleanup of expired cooldowns every 10 minutes
    setInterval(() => {
      const cutoff = Date.now() - CLAN_REQUEST_COOLDOWN_MS;
      for (const [userId, time] of clanRequestCooldowns) {
        if (time < cutoff) clanRequestCooldowns.delete(userId);
      }
      const vpCutoff = Date.now() - VOICE_POINTS_COOLDOWN_MS;
      for (const [userId, time] of voicePointsCooldowns) {
        if (time < vpCutoff) voicePointsCooldowns.delete(userId);
      }
    }, 600000);
  } catch (err) {
    console.error("handleBotReady error:", err);
  }
}

client.once("ready", handleBotReady);

// ================= ADMIN DASHBOARD PANEL =================
function buildAdminDashboardPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('Admin Dashboard')
    .setDescription('Use the buttons below to manage the bot.')
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_refresh_panels')
      .setLabel('🔄 Refresh Clan Panels')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_refresh_clanboard')
      .setLabel('📊 Refresh Clanboard')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_backup')
      .setLabel('💾 Backup Data')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_status')
      .setLabel('📡 Bot Status')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function ensureAdminDashboardPanel(guild) {
  try {
    const channel = guild.channels.cache.get(ADMIN_DASHBOARD_CHANNEL_ID) ||
      await guild.channels.fetch(ADMIN_DASHBOARD_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const existing = await channel.messages.fetch({ limit: 20 }).catch(() => null);
    const hasPanel = existing?.some(m =>
      m.author.id === client.user.id &&
      m.components?.some(r => r.components?.some(c => c.customId === 'admin_refresh_panels'))
    );

    if (existing) {
      for (const msg of existing.values()) {
        if (msg.author.id !== client.user.id) continue;
        if (msg.components?.some(r => r.components?.some(c => c.customId === 'admin_refresh_panels'))) continue;
        await msg.delete().catch(() => {});
      }
    }

    if (!hasPanel) {
      await channel.send(buildAdminDashboardPanel()).catch(() => {});
    }
  } catch (err) {
    console.error('Error ensuring admin dashboard panel:', err);
  }
}

// ================= CLAN PANEL BUTTONS =================
async function sendClanPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('Clan Management')
    .setDescription('Use the buttons below to create or delete a clan.')
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('clan_panel_create')
      .setLabel('Create Clan')
      .setStyle(ButtonStyle.Success)
      .setEmoji('➕'),
    new ButtonBuilder()
      .setCustomId('clan_panel_delete')
      .setLabel('Delete Clan')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️')
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleClanCreateButton(interaction) {
  if (!canManageClanCommands(interaction.member)) {
    return interaction.reply({ content: 'You do not have permission to manage clans.', flags: 64 });
  }

  const modal = new ModalBuilder()
    .setCustomId(CLAN_CREATE_MODAL_ID)
    .setTitle('Create a New Clan');

  const ownerInput = new TextInputBuilder()
    .setCustomId('clan_owner_id')
    .setLabel('Owner User ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Paste the owner user ID here');

  const coOwnerInput = new TextInputBuilder()
    .setCustomId('clan_coowner_id')
    .setLabel('Co-Owner User ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Paste the co-owner user ID here');

  const nameInput = new TextInputBuilder()
    .setCustomId('clan_name')
    .setLabel('Clan Name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Enter the clan role name');

  modal.addComponents(
    new ActionRowBuilder().addComponents(ownerInput),
    new ActionRowBuilder().addComponents(coOwnerInput),
    new ActionRowBuilder().addComponents(nameInput)
  );

  await interaction.showModal(modal);
}

async function handleClanDeleteButton(interaction) {
  if (!canManageClanCommands(interaction.member)) {
    return interaction.reply({ content: 'You do not have permission to manage clans.', flags: 64 });
  }

  const guild = interaction.guild;
  const choices = getClanAutocompleteChoices(guild, '');

  if (choices.length === 0) {
    return interaction.reply({ content: 'No clans available to delete.', flags: 64 });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(CLAN_DELETE_SELECT_ID)
    .setPlaceholder('Select a clan to delete')
    .addOptions(choices.slice(0, 25).map(c => ({
      label: c.name.slice(0, 100),
      value: c.value
    })));

  await interaction.reply({
    content: 'Select a clan to delete:',
    components: [new ActionRowBuilder().addComponents(select)],
    flags: 64
  });
}

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

    if (interaction.isButton()) {
      if (interaction.customId === 'send_clan_panel') {
        if (!canManageClanCommands(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }
        await sendClanPanel(interaction.channel);
        return interaction.reply({ content: 'Clan panel sent.', flags: 64 });
      }

      if (interaction.customId === 'clan_panel_create') {
        await handleClanCreateButton(interaction);
        return;
      }

      if (interaction.customId === 'clan_panel_delete') {
        await handleClanDeleteButton(interaction);
        return;
      }

      if (interaction.customId === 'staff_apply_btn') {
        await handleStaffApplyButton(interaction);
        return;
      }

      if (interaction.customId === 'staff_check_status') {
        const apps = await loadStaffApplications();
        const userApp = apps[interaction.user.id];
        if (!userApp) {
          return interaction.reply({ content: 'You have not submitted a staff application yet.', flags: 64 });
        }
        const statusEmoji = userApp.status === 'accepted' ? '✅' : userApp.status === 'rejected' ? '❌' : '⏳';
        return interaction.reply({
          content: `**Your Staff Application Status:** ${statusEmoji} **${userApp.status.charAt(0).toUpperCase() + userApp.status.slice(1)}**\nSubmitted: <t:${Math.floor(userApp.submittedAt / 1000)}:R>`,
          flags: 64
        });
      }

      if (interaction.customId === 'blacklist_check_btn') {
        const modal = new ModalBuilder()
          .setCustomId('blacklistCheckModal')
          .setTitle('Check Blacklist Reason');
        const idInput = new TextInputBuilder()
          .setCustomId('userId')
          .setLabel('User ID to check')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(idInput));
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'confession_btn') {
        const modal = new ModalBuilder()
          .setCustomId('confessionModal')
          .setTitle('Write your confession');

        const input = new TextInputBuilder()
          .setCustomId('confessionText')
          .setLabel('Your confession')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'girls_confession_btn') {
        const modal = new ModalBuilder()
          .setCustomId('girlsConfessionModal')
          .setTitle('Write your confession');

        const input = new TextInputBuilder()
          .setCustomId('confessionText')
          .setLabel('Your confession')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      const allowedVoiceChannels = ['1417802712422154393', '1417802715408371732'];

      if (interaction.customId === 'mute_all' || interaction.customId === 'unmute_all') {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel || !allowedVoiceChannels.includes(voiceChannel.id)) {
          return interaction.reply({ content: 'You must be in Voice 1 or Voice 2.', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        const shouldMute = interaction.customId === 'mute_all';
        const actions = [];

        for (const [, m] of voiceChannel.members) {
          if (shouldMute && !m.voice.serverMute) actions.push(m.voice.setMute(true, 'Mute all panel'));
          if (!shouldMute && m.voice.serverMute) actions.push(m.voice.setMute(false, 'Unmute all panel'));
        }

        await Promise.all(actions);
        await interaction.editReply(shouldMute ? '✅ All users muted.' : '✅ All users unmuted.');
        return;
      }

      if (interaction.customId === 'among_blacklist') {
        if (!memberCanManageAmongUsBlacklist(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }
        const modal = new ModalBuilder()
          .setCustomId('amongBlacklistModal')
          .setTitle('Blacklist User');

        const idInput = new TextInputBuilder()
          .setCustomId('userId')
          .setLabel('User ID')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(500)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(idInput), new ActionRowBuilder().addComponents(reasonInput));
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'among_unblacklist') {
        if (!memberCanManageAmongUsBlacklist(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }
        const modal = new ModalBuilder()
          .setCustomId('amongUnblacklistModal')
          .setTitle('Unblacklist User');

        const idInput = new TextInputBuilder()
          .setCustomId('userId')
          .setLabel('User ID')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(500)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(idInput),
          new ActionRowBuilder().addComponents(reasonInput)
        );
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'confession_submit') {
        const modalSubmit = require('./events/modalSubmit.js');
        const threadData = modalSubmit.confessionThreads.get(interaction.channel.id);
        if (!threadData || threadData.userId !== interaction.user.id) {
          return interaction.reply({ content: 'This is not your confession thread.', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        try {
          const messages = await interaction.channel.messages.fetch({ limit: 50 });
          const userMsgs = messages.filter(m => m.author.id === interaction.user.id && !m.author.bot);

          const imageUrls = [];
          for (const m of userMsgs.values()) {
            for (const attach of m.attachments.values()) {
              if (attach.contentType?.startsWith('image/')) {
                imageUrls.push(attach.url);
              }
            }
          }

          const logChannel = interaction.guild.channels.cache.get('1422888371008700438');
          if (logChannel) {
            const reviewEmbed = new EmbedBuilder()
              .setTitle('⏳ Pending Confession')
              .setDescription(threadData.confessionText)
              .addFields(
                { name: 'Submitted by', value: `<@${interaction.user.id}>`, inline: false }
              )
              .setColor(0xf1c40f)
              .setTimestamp();

            if (imageUrls.length > 0) reviewEmbed.setImage(imageUrls[0]);

            const reviewRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('confess_approve').setLabel('Approve').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('confess_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
            );

            const logMsg = await logChannel.send({ embeds: [reviewEmbed], components: [reviewRow] });

            for (let i = 1; i < imageUrls.length; i++) {
              await logChannel.send({ embeds: [new EmbedBuilder().setImage(imageUrls[i])] });
            }

            modalSubmit.pendingConfessions.set(logMsg.id, {
              confession: threadData.confessionText,
              imageUrl: imageUrls[0] || null,
              userId: interaction.user.id,
              userTag: interaction.user.tag,
              type: 'normal'
            });
          }

          await interaction.channel.send({ content: '✅ Confession submitted for review!' });
          await interaction.editReply('Your confession has been submitted for review.');
          modalSubmit.confessionThreads.delete(interaction.channel.id);

          setTimeout(() => {
            interaction.channel.setArchived(true).catch(() => {});
          }, 5000);
        } catch (err) {
          console.error('Confession submit error:', err);
          await interaction.editReply('Something went wrong.');
        }
      }

      if (interaction.customId === 'girls_confession_submit') {
        const modalSubmit = require('./events/modalSubmit.js');
        const threadData = modalSubmit.confessionThreads.get(interaction.channel.id);
        if (!threadData || threadData.userId !== interaction.user.id) {
          return interaction.reply({ content: 'This is not your confession thread.', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        try {
          const messages = await interaction.channel.messages.fetch({ limit: 50 });
          const userMsgs = messages.filter(m => m.author.id === interaction.user.id && !m.author.bot);

          const imageUrls = [];
          for (const m of userMsgs.values()) {
            for (const attach of m.attachments.values()) {
              if (attach.contentType?.startsWith('image/')) {
                imageUrls.push(attach.url);
              }
            }
          }

          const logChannel = interaction.guild.channels.cache.get('1523057492773306579');
          if (logChannel) {
            const reviewEmbed = new EmbedBuilder()
              .setTitle('⏳ Pending Girls Confession')
              .setDescription(threadData.confessionText)
              .addFields(
                { name: 'Submitted by', value: `<@${interaction.user.id}>`, inline: false }
              )
              .setColor(0xf1c40f)
              .setTimestamp();

            if (imageUrls.length > 0) reviewEmbed.setImage(imageUrls[0]);

            const reviewRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('girls_confess_approve').setLabel('Approve').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('girls_confess_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
            );

            const logMsg = await logChannel.send({ embeds: [reviewEmbed], components: [reviewRow] });

            for (let i = 1; i < imageUrls.length; i++) {
              await logChannel.send({ embeds: [new EmbedBuilder().setImage(imageUrls[i])] });
            }

            modalSubmit.pendingConfessions.set(logMsg.id, {
              confession: threadData.confessionText,
              imageUrl: imageUrls[0] || null,
              userId: interaction.user.id,
              userTag: interaction.user.tag,
              type: 'girls'
            });
          }

          await interaction.channel.send({ content: '✅ Confession submitted for review!' });
          await interaction.editReply('Your confession has been submitted for review.');
          modalSubmit.confessionThreads.delete(interaction.channel.id);

          setTimeout(() => {
            interaction.channel.setArchived(true).catch(() => {});
          }, 5000);
        } catch (err) {
          console.error('Girls confession submit error:', err);
          await interaction.editReply('Something went wrong.');
        }
      }
      // === merged from second listener ===
      if (interaction.customId === "amongus_mute") {
        await handleAmongUsMuteButton(interaction, true);
        return;
      }

      if (interaction.customId === "amongus_unmute") {
        await handleAmongUsMuteButton(interaction, false);
        return;
      }

      if (interaction.customId === "leave_clan") {
        try {
          await interaction.deferReply({ flags: 64 });

          const clanData = trackedVoiceChannels.find(c =>
            c.clanRoleId !== "EMPTY" &&
            interaction.member.roles.cache.has(c.clanRoleId)
          );

          if (!clanData) {
            await interaction.editReply({
              content: "**<:92042no:1470786991451930735> You are not in any clan.**"
            });
            return;
          }

          const clanRole = interaction.guild.roles.cache.get(clanData.clanRoleId);

          if (!clanRole) {
            await interaction.editReply({
              content: "**<:92042no:1470786991451930735> Clan role not found.**"
            });
            return;
          }

          await interaction.member.roles.remove(clanRole).catch(() => {});
          await interaction.member.roles.remove([LEADER_ROLE_ID, CO_LEADER_ROLE_ID]).catch(() => {});

          await interaction.editReply({
            content: `<:1144silververify:1468928751000621136> You have **Left** the clan **${clanRole.name}**.`
          });

          await refreshJoinClanPanels(interaction.guild);
        } catch (err) {
          console.error("Error handling leave button:", err);

          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "**<:92042no:1470786991451930735> Something went wrong.**",
              flags: 64
            }).catch(() => {});
          }
        }

        return;
      }

      if (interaction.customId.startsWith('cm_prev_') || interaction.customId.startsWith('cm_next_')) {
        const isNext = interaction.customId.startsWith('cm_next_');
        const clanRoleId = interaction.customId.replace('cm_prev_', '').replace('cm_next_', '');
        const cacheKey = `${interaction.channel.id}:${clanRoleId}`;
        const cached = clanMembersCache.get(cacheKey);
        if (!cached) return;
        const newPage = cached.page + (isNext ? 1 : -1);
        if (newPage < 0) return;

        const guild = interaction.guild;
        const clanRole = guild.roles.cache.get(clanRoleId);
        if (!clanRole) return;
        const membersInClan = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId));
        const memberPointsForClan = clanMemberPoints[clanRoleId] || {};
        const totalPages = Math.max(1, Math.ceil(Math.max(0, membersInClan.size - 3) / 4));
        if (newPage >= totalPages) return;

        await interaction.deferUpdate();

        try {
          const { renderClanMembersCard } = require('./clanCard.js');
          const buffer = await renderClanMembersCard({ guild, clanRole, members: membersInClan, memberPoints: memberPointsForClan, page: newPage });
          const attachment = new AttachmentBuilder(buffer, { name: `clanmembers-${clanRoleId}.png` });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`cm_prev_${clanRoleId}`)
              .setLabel('<')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(newPage <= 0),
            new ButtonBuilder()
              .setCustomId(`cm_next_${clanRoleId}`)
              .setLabel('>')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(newPage >= totalPages - 1)
          );

          clanMembersCache.set(cacheKey, { clanRoleId, page: newPage });
          await interaction.editReply({ files: [attachment], components: [row] }).catch(() => {});
        } catch (err) {
          console.error('clanmembers pagination error:', err);
        }
        return;
      }

      if (interaction.customId === 'join_normal_btn') {
        await sendJoinClanSelect(interaction, false);
        return;
      }

      if (interaction.customId === 'join_top_btn') {
        await sendJoinClanSelect(interaction, true);
        return;
      }

      if (interaction.customId === 'clan_add_btn') {
        await handleAddMemberButton(interaction);
        return;
      }

      if (interaction.customId === 'clan_remove_btn') {
        await handleRemoveMemberButton(interaction);
        return;
      }

      if (interaction.customId.startsWith('join_accept_')) {
        const parts = interaction.customId.replace('join_accept_', '').split('_');
        const memberId = parts[0];
        const clanRoleId = parts.slice(1).join('_');
        await handleJoinAccept(interaction, memberId, clanRoleId);
        return;
      }

      if (interaction.customId.startsWith('join_reject_')) {
        const parts = interaction.customId.replace('join_reject_', '').split('_');
        const memberId = parts[0];
        const clanRoleId = parts.slice(1).join('_');
        await handleJoinReject(interaction, memberId, clanRoleId);
        return;
      }

      if (interaction.customId.startsWith('invite_accept_')) {
        const parts = interaction.customId.replace('invite_accept_', '').split('_');
        const targetId = parts[0];
        const clanRoleId = parts[1];
        const inviterId = parts.slice(2).join('_');
        await handleInviteAccept(interaction, targetId, clanRoleId, inviterId);
        return;
      }

      if (interaction.customId.startsWith('invite_reject_')) {
        const parts = interaction.customId.replace('invite_reject_', '').split('_');
        const targetId = parts[0];
        const clanRoleId = parts[1];
        const inviterId = parts.slice(2).join('_');
        await handleInviteReject(interaction, targetId, clanRoleId, inviterId);
        return;
      }

      if (interaction.customId.startsWith('staff_accept_')) {
        const applicantId = interaction.customId.replace('staff_accept_', '');
        await handleStaffAccept(interaction, applicantId);
        return;
      }

      if (interaction.customId.startsWith('staff_reject_')) {
        const applicantId = interaction.customId.replace('staff_reject_', '');
        await handleStaffReject(interaction, applicantId);
        return;
      }

      if (interaction.customId === "clanboard_prev" || interaction.customId === "clanboard_next") {
        const currentPage = clanboardPages.get(CLANBOARD_CHANNEL_ID) || 0;
        const newPage = interaction.customId === "clanboard_next" ? currentPage + 1 : currentPage - 1;
        await interaction.deferUpdate().catch(() => {});
        await sendOrUpdateClanboard(interaction.guild, Math.max(0, newPage)).catch(err => {
          console.error("Error changing clanboard page:", err);
        });
      }

      if (interaction.customId === "refresh_clanboard") {
        if (interaction.user.id !== CLANBOARD_REFRESH_USER_ID) {
          await interaction.reply({
            content: "**You do not have permission to use this button.**",
            flags: 64
          }).catch(() => {});
          return;
        }
        await interaction.deferUpdate().catch(() => {});
        clanPanels.clanboardRefreshAt = Date.now() + FOURTEEN_DAYS;
        clanPanels.clanboardNotified = false;
        savePanels();
        await sendOrUpdateClanboard(interaction.guild).catch(err => {
          console.error("Error refreshing clanboard:", err);
        });
      }

      // ===== ADMIN DASHBOARD BUTTONS =====
      if (interaction.customId === 'admin_refresh_panels') {
        if (!canManageClanCommands(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }
        await interaction.deferReply({ flags: 64 });
        const guild = interaction.guild;
        try {
          await ensureLeaveClanPanel(guild);
          await ensureAmongUsMutePanel(guild);
          await ensureJoinClanPanel(guild, NORMAL_JOIN_CHANNEL_ID);
          await ensureJoinClanPanel(guild, TOP_JOIN_CHANNEL_ID);
          await ensureClanAddRemovePanel(guild);
          await ensureApplyClanPanel(guild);
          await ensureStaffApplyPanel(guild);
          await ensureAdminDashboardPanel(guild);
          await interaction.editReply({ content: '✅ All panels refreshed.' });
        } catch (err) {
          console.error('Admin refresh panels error:', err);
          await interaction.editReply({ content: '❌ Error refreshing panels.' });
        }
        return;
      }

      if (interaction.customId === 'admin_refresh_clanboard') {
        if (!canManageClanCommands(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }
        await interaction.deferReply({ flags: 64 });
        try {
          clanPanels.clanboardRefreshAt = Date.now() + FOURTEEN_DAYS;
          clanPanels.clanboardNotified = false;
          savePanels();
          await sendOrUpdateClanboard(interaction.guild);
          await interaction.editReply({ content: '✅ Clanboard refreshed.' });
        } catch (err) {
          console.error('Admin refresh clanboard error:', err);
          await interaction.editReply({ content: '❌ Error refreshing clanboard.' });
        }
        return;
      }

      if (interaction.customId === 'admin_backup') {
        if (!canManageClanCommands(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }
        await interaction.deferReply({ flags: 64 });
        try {
          await saveAll();
          await interaction.editReply({ content: '✅ Data backed up successfully.' });
        } catch (err) {
          console.error('Admin backup error:', err);
          await interaction.editReply({ content: '❌ Error backing up data.' });
        }
        return;
      }

      if (interaction.customId === 'admin_status') {
        if (!canManageClanCommands(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }
        await interaction.deferReply({ flags: 64 });
        const guild = interaction.guild;
        const totalMembers = guild.members.cache.size;
        const totalClans = getAllClanEntries(guild).length;
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const embed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('Bot Status')
          .addFields(
            { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
            { name: 'Total Clans', value: `${totalClans}`, inline: true },
            { name: 'Server Members', value: `${totalMembers}`, inline: true },
            { name: 'Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === CLAN_DELETE_SELECT_ID) {
        const clanRoleId = interaction.values[0];
        const guild = interaction.guild;

        const mockInteraction = {
          guild,
          member: interaction.member,
          user: interaction.user,
          options: {
            getString: () => clanRoleId
          },
          deferred: false,
          replied: false,
          deferReply: async (opts) => { interaction.deferred = true; },
          editReply: async (msg) => { await interaction.update({ content: typeof msg === 'string' ? msg : msg.content, components: [], embeds: [] }).catch(() => {}); },
          reply: async (opts) => { await interaction.update({ content: typeof opts === 'string' ? opts : opts.content, components: [], embeds: [] }).catch(() => {}); },
          channel: interaction.channel,
        };

        await interaction.deferUpdate();
        await handleDeleteClanCommand(mockInteraction);
        return;
      }

      if (interaction.customId === 'join_normal_select' || interaction.customId === 'join_top_select') {
        const clanRoleId = interaction.values[0];
        await handleJoinClanSelect(interaction, clanRoleId);
        return;
      }

      if (interaction.customId === 'clan_remove_select') {
        const memberId = interaction.values[0];
        await handleClanRemoveSelect(interaction, memberId);
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === CLAN_CREATE_MODAL_ID) {
        const ownerId = interaction.fields.getTextInputValue('clan_owner_id').trim();
        const coOwnerId = interaction.fields.getTextInputValue('clan_coowner_id').trim();
        const clanName = interaction.fields.getTextInputValue('clan_name').trim();

        const guild = interaction.guild;
        const ownerUser = await client.users.fetch(ownerId).catch(() => null);
        const coOwnerUser = await client.users.fetch(coOwnerId).catch(() => null);

        if (!ownerUser || !coOwnerUser) {
          return interaction.reply({ content: 'Invalid owner or co-owner user ID.', flags: 64 });
        }

        const mockInteraction = {
          guild,
          member: interaction.member,
          user: interaction.user,
          options: {
            getUser: (name) => name === 'owner' ? ownerUser : coOwnerUser,
            getString: () => clanName
          },
          deferred: false,
          replied: false,
          deferReply: async (opts) => { interaction.deferred = true; },
          editReply: async (msg) => { await interaction.editReply({ content: typeof msg === 'string' ? msg : msg.content, flags: 64 }).catch(() => {}); },
          reply: async (opts) => { await interaction.reply({ content: typeof opts === 'string' ? opts : opts.content, flags: 64 }).catch(() => {}); },
          channel: interaction.channel,
        };

        await interaction.deferReply({ flags: 64 });
        await handleCreateClanCommand(mockInteraction);
        return;
      }

      if (interaction.customId === JOIN_CLAN_MODAL_ID) {
        await handleJoinClanModal(interaction);
        return;
      }

      if (interaction.customId === 'clan_add_modal') {
        await interaction.deferReply({ flags: 64 });
        await handleClanAddModal(interaction);
        return;
      }

      if (interaction.customId === STAFF_APPLY_MODAL_ID) {
        await handleStaffApplyModal(interaction);
        return;
      }

      if (interaction.customId === 'amongBlacklistModal') {
        const userId = interaction.fields.getTextInputValue('userId').trim();
        const reason = interaction.fields.getTextInputValue('reason').trim();

        if (!memberCanManageAmongUsBlacklist(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }

        if (!/^\d{17,19}$/.test(userId)) {
          return interaction.reply({ content: 'Invalid user ID.', flags: 64 });
        }

        if (!reason) {
          return interaction.reply({ content: 'Reason is required.', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        try {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (!member) return interaction.editReply({ content: 'User not found in this server.' });

          const entries = await loadAmongUsBlacklistEntries();
          const oldEntry = entries.find(entry => entry.userId === userId);
          const roleChanges = await applyAmongUsBlacklistRoles(
            member,
            true,
            `Among Us blacklist by ${interaction.user.tag}: ${reason.slice(0, 120)}`
          );
          const nextEntries = entries.filter(entry => entry.userId !== userId);

          nextEntries.push({
            userId,
            reason,
            by: interaction.user.id,
            at: new Date().toISOString()
          });

          await saveAmongUsBlacklistEntries(nextEntries);
          await sendAmongUsBlacklistLog(interaction.guild, {
            action: 'blacklist',
            userId,
            moderatorId: interaction.user.id,
            reason,
            oldReason: oldEntry?.reason,
            roleChanges
          });

          await interaction.editReply({ content: `✅ <@${userId}> has been blacklisted.` });
        } catch (err) {
          console.error('Blacklist error:', err);
          await interaction.editReply({ content: '❌ Something went wrong.' });
        }
        return;
      }

      if (interaction.customId === 'amongUnblacklistModal') {
        const userId = interaction.fields.getTextInputValue('userId').trim();
        const reason = interaction.fields.getTextInputValue('reason').trim();

        if (!memberCanManageAmongUsBlacklist(interaction.member)) {
          return interaction.reply({ content: 'No permission.', flags: 64 });
        }

        if (!/^\d{17,19}$/.test(userId)) {
          return interaction.reply({ content: 'Invalid user ID.', flags: 64 });
        }

        if (!reason) {
          return interaction.reply({ content: 'Reason is required.', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        try {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (!member) return interaction.editReply({ content: 'User not found in this server.' });

          const entries = await loadAmongUsBlacklistEntries();
          const oldEntry = entries.find(entry => entry.userId === userId);
          const roleChanges = await applyAmongUsBlacklistRoles(
            member,
            false,
            `Among Us unblacklist by ${interaction.user.tag}: ${reason.slice(0, 120)}`
          );
          const nextEntries = entries.filter(entry => entry.userId !== userId);

          await saveAmongUsBlacklistEntries(nextEntries);
          await sendAmongUsBlacklistLog(interaction.guild, {
            action: 'unblacklist',
            userId,
            moderatorId: interaction.user.id,
            reason,
            oldReason: oldEntry?.reason,
            roleChanges
          });

          await interaction.editReply({ content: `✅ <@${userId}> has been unblacklisted.` });
        } catch (err) {
          console.error('Unblacklist error:', err);
          await interaction.editReply({ content: '❌ Something went wrong.' });
        }
        return;
      }

      if (interaction.customId === 'blacklistCheckModal') {
        const userId = interaction.fields.getTextInputValue('userId').trim();
        if (!/^\d{17,19}$/.test(userId)) {
          return interaction.reply({ content: 'Invalid user ID.', flags: 64 });
        }
        await interaction.deferReply({ flags: 64 });
        try {
          const entries = await loadAmongUsBlacklistEntries();
          const entry = entries.find(e => e.userId === userId);
          if (!entry) {
            return interaction.editReply({ content: `**User <@${userId}>** is not blacklisted.` });
          }
          const moderator = await client.users.fetch(entry.by).catch(() => null);
          const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Blacklist Check')
            .addFields(
              { name: 'User', value: `<@${userId}>\n\`${userId}\``, inline: true },
              { name: 'Reason', value: entry.reason || 'No reason', inline: false },
              { name: 'Moderator', value: moderator ? `${moderator.tag}\n<@${entry.by}>` : `<@${entry.by}>`, inline: true },
              { name: 'Date', value: entry.at ? `<t:${Math.floor(new Date(entry.at).getTime() / 1000)}:f>` : 'Unknown', inline: true }
            )
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error('Blacklist check error:', err);
          await interaction.editReply({ content: '❌ Something went wrong.' });
        }
        return;
      }
    }
  } catch (err) {
    console.warn(`Clan panel warning: ${err?.message || err}`);
  }
});

// ================= SECOND LISTENER MERGED INTO FIRST =================

// ================= WELCOME MESSAGE =================
async function sendWelcomeMessage(clientInstance) {
  const guild = clientInstance.guilds.cache.first();
  if (!guild) return;

  const channel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (messages) {
    const cutoff = Date.now() - 13 * 24 * 60 * 60 * 1000;
    const recent = messages.filter(m => m.createdTimestamp > cutoff);
    if (recent.size > 0) {
      await channel.bulkDelete(recent, true).catch(() => {});
    }
    const old = messages.filter(m => m.createdTimestamp <= cutoff);
    for (const msg of old.values()) {
      await msg.delete().catch(() => {});
    }
  }

  const embed = new EmbedBuilder()
    .setDescription(`
## <a:3685yellowsparklingstars:1467927818548678850>  Welcome!

  To access the server, you must complete **verification** 

**<:42920arrowrightalt:1474946022953189486>  Join a verification voice channel**
**<:42920arrowrightalt:1474946022953189486>  Wait for staff**
**<:42920arrowrightalt:1474946022953189486>  Get verified instantly**
`)
    .setColor("#8d8d8d")
    .setImage("https://media.discordapp.net/attachments/1503073201264267395/1521879110836682933/video_202607010701.gif?ex=6a466fdf&is=6a451e5f&hm=2d424d5ea6c3cb4e4c31fafe0c1f10924acdc8abb92c3237a2d6c1aff585cd5b&=&width=600&height=58")
    .setFooter({
      text: "Verification System",
      iconURL: clientInstance.user.displayAvatarURL()
    })
    .setThumbnail(guild.iconURL())
    .setTimestamp();

  await channel.send({
    content: "**Welcome everyone ! <@&1417802581521989642>**",
    embeds: [embed]
  }).catch(() => {});
}

// ================= VOICE TRACKING =================
client.on("voiceStateUpdate", (oldState, newState) => {
  Promise.allSettled([
    handlePrivateOwnerVoiceProtection(oldState, newState),
    handleAmongUsAutoUnmuteOnLeave(oldState, newState),
    handleStaffWaitingVoiceNotification(oldState, newState)
  ]).then(results => {
    for (const r of results) {
      if (r.status === 'rejected') console.error('Voice handler error:', r.reason);
    }
  });

  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const oldChannel = oldState.channelId;
  const newChannel = newState.channelId;

  const oldTracked = trackedVoiceChannels.find(c => c.id === oldChannel);
  const newTracked = trackedVoiceChannels.find(c => c.id === newChannel);

  if (oldTracked && !newTracked) {
    voiceMembers.delete(member.id);
  }

  if (!oldTracked && newTracked && newTracked.clanRoleId !== "EMPTY") {
    if (member.roles.cache.has(newTracked.clanRoleId)) {
      voiceMembers.set(member.id, newTracked.clanRoleId);

      if (!clanFirstJoin[newTracked.clanRoleId]) {
        clanFirstJoin[newTracked.clanRoleId] = Date.now();
        saveData();
      }
    }
  }

  if (
    oldTracked &&
    newTracked &&
    oldTracked.clanRoleId !== newTracked.clanRoleId &&
    newTracked.clanRoleId !== "EMPTY"
  ) {
    voiceMembers.delete(member.id);

    if (member.roles.cache.has(newTracked.clanRoleId)) {
      voiceMembers.set(member.id, newTracked.clanRoleId);

      if (!clanFirstJoin[newTracked.clanRoleId]) {
        clanFirstJoin[newTracked.clanRoleId] = Date.now();
        saveData();
      }
    }
  }
});

// Add voice points every minute (with 5-minute cooldown per member)
setInterval(async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;
  const now = Date.now();

  for (const [userId, savedClanRoleId] of voiceMembers) {
    const member = guild.members.cache.get(userId);

    if (!member) {
      voiceMembers.delete(userId);
      continue;
    }

    const lastPoints = voicePointsCooldowns.get(userId) || 0;
    if (now - lastPoints < VOICE_POINTS_COOLDOWN_MS) continue;

    const clanEntry = getMemberClanVoiceEntry(member);

    if (!clanEntry) {
      voiceMembers.delete(userId);
      continue;
    }

    const clanRoleId = clanEntry.clanRoleId;

    if (!clanPoints[clanRoleId]) clanPoints[clanRoleId] = 0;

    const pointsToAdd = getVoicePointsForMember(member);

    clanPoints[clanRoleId] += pointsToAdd;

    if (!clanMemberPoints[clanRoleId]) clanMemberPoints[clanRoleId] = {};
    if (!clanMemberPoints[clanRoleId][userId]) clanMemberPoints[clanRoleId][userId] = 0;
    clanMemberPoints[clanRoleId][userId] += pointsToAdd;

    voicePointsCooldowns.set(userId, now);

    console.log(
      `${member.user.tag} added ${pointsToAdd} voice point(s) to clan ${clanRoleId}`
    );
  }

  saveData();
  await syncTopClanCategories(guild);
  await updateClanRewards(guild);
}, 60000);

// ================= CLAN REWARDS =================
async function updateClanRewards(guild) {
  for (const clanRoleId in clanPoints) {
    const points = clanPoints[clanRoleId] || 0;
    const role = guild.roles.cache.get(clanRoleId);
    if (!role) continue;

    const members = guild.members.cache.filter(member =>
      member.roles.cache.has(clanRoleId) &&
      (
        member.roles.cache.has(LEADER_ROLE_ID) ||
        member.roles.cache.has(CO_LEADER_ROLE_ID)
      )
    );

    for (const member of members.values()) {
      try {
        if (points >= 200000) {
          if (TOP_200K_ROLE) await member.roles.add(TOP_200K_ROLE).catch(() => {});
          await member.roles.remove([TOP_100K_ROLE, TOP_5_ROLE].filter(Boolean)).catch(() => {});
        } else if (points >= 100000) {
          if (TOP_100K_ROLE) await member.roles.add(TOP_100K_ROLE).catch(() => {});
          await member.roles.remove([TOP_200K_ROLE, TOP_5_ROLE].filter(Boolean)).catch(() => {});
        } else if (points >= 22) {
          if (TOP_5_ROLE) await member.roles.add(TOP_5_ROLE).catch(() => {});
          await member.roles.remove([TOP_100K_ROLE, TOP_200K_ROLE].filter(Boolean)).catch(() => {});
        } else {
          await member.roles.remove([TOP_5_ROLE, TOP_100K_ROLE, TOP_200K_ROLE].filter(Boolean)).catch(() => {});
        }
      } catch (err) {
        console.error(`Error updating reward roles for ${member.user.tag}:`, err);
      }
    }
  }
}

// ================= MESSAGE POINTS =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild || !message.member) return;
  if (message.channel.id !== "1472217337540382720") return;

  const member = message.member;

  const clanData = trackedVoiceChannels.find(c =>
    c.clanRoleId !== "EMPTY" &&
    member.roles.cache.has(c.clanRoleId)
  );

  if (!clanData) return;

  const clanRoleId = clanData.clanRoleId;

  let data = userMessageCounts.get(member.id) || {
    count: 0,
    timeout: null
  };

  data.count++;

  if (data.count >= 5) {
    if (!clanPoints[clanRoleId]) clanPoints[clanRoleId] = 0;

    clanPoints[clanRoleId] -= 50;
    if (clanPoints[clanRoleId] < 0) clanPoints[clanRoleId] = 0;

    if (clanMemberPoints[clanRoleId]?.[member.id]) {
      clanMemberPoints[clanRoleId][member.id] = Math.max(0, clanMemberPoints[clanRoleId][member.id] - 50);
    }

    await message.channel.send(`**Warning <@${member.id}>, 50 points deducted from your clan due to spam!**`).catch(() => {});

    saveData();
    await refreshClanSystem(message.guild);

    if (data.timeout) clearTimeout(data.timeout);
    userMessageCounts.set(member.id, {
      count: 0,
      timeout: null
    });

    return;
  }

  if (data.timeout) clearTimeout(data.timeout);

  data.timeout = setTimeout(() => {
    userMessageCounts.set(member.id, {
      count: 0,
      timeout: null
    });
  }, 10000);

  userMessageCounts.set(member.id, data);

  if (!clanPoints[clanRoleId]) clanPoints[clanRoleId] = 0;
  clanPoints[clanRoleId] += 2;

  if (!clanMemberPoints[clanRoleId]) clanMemberPoints[clanRoleId] = {};
  if (!clanMemberPoints[clanRoleId][member.id]) clanMemberPoints[clanRoleId][member.id] = 0;
  clanMemberPoints[clanRoleId][member.id] += 2;

  saveData();

  console.log(`${member.user.tag} added 2 points to clan ${clanRoleId}`);
});

// ================= CLAN COMMANDS (VOICE-ONLY) =================
function isClanVoiceText(channelId) {
  return trackedVoiceChannels.some(c =>
    isValidClanEntry(c) && c.id === channelId
  );
}

function getMemberClanFromVoice(member) {
  const channelId = member.voice?.channelId;
  if (!channelId) return null;

  const entry = trackedVoiceChannels.find(c =>
    isValidClanEntry(c) && c.id === channelId &&
    member.roles.cache.has(c.clanRoleId)
  );

  return entry || null;
}

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild || !message.member) return;

  const member = message.member;
  const guild = message.guild;
  const args = message.content.trim().split(/\s+/);
  const channel = message.channel;

  if (!args[0]) return;

  const allowedCommands = [".claninfo", ".pclan", ".clanmembers", ".clanboard", ".add", ".remove", ".clanpanel"];
  if (!allowedCommands.includes(args[0])) return;

  if (args[0] === ".clanboard") {
    await refreshClanSystem(guild);
    return channel.send(`**Clan leaderboard updated in <#${CLANBOARD_CHANNEL_ID}>.**`).catch(() => {});
  }

  if (args[0] === ".clanpanel") {
    if (!canManageClanCommands(member)) return;
    await sendClanPanel(channel);
    return channel.send(`Clan panel sent.`).catch(() => {});
  }

  if (!isClanVoiceText(channel.id)) return;

  const clanData = getMemberClanFromVoice(member);
  if (!clanData) return;

  const clanRoleId = clanData.clanRoleId;
  const clanRole = guild.roles.cache.get(clanRoleId);

  if (!clanRole) return;

  const totalPoints = clanPoints[clanRoleId] || 0;
  const membersInClan = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId));

  // ---------- .claninfo (Canvas Image) ----------
  if (args[0] === ".claninfo") {
    const leader = guild.members.cache.find(m =>
      m.roles.cache.has(LEADER_ROLE_ID) && m.roles.cache.has(clanRoleId)
    );
    const coleader = guild.members.cache.find(m =>
      m.roles.cache.has(CO_LEADER_ROLE_ID) && m.roles.cache.has(clanRoleId)
    );

    try {
      const buffer = await renderClanInfoCard({
        guild, clanEntry: { clanFirstJoin: clanFirstJoin[clanRoleId] },
        clanRole, points: totalPoints, members: membersInClan,
        leader, coLeader: coleader
      });
      const attachment = new AttachmentBuilder(buffer, { name: `claninfo-${clanRoleId}.png` });
      return channel.send({ files: [attachment] }).catch(() => {});
    } catch (err) {
      console.error('claninfo render error:', err);
    }
  }

  // ---------- .pclan (Canvas Image) ----------
  if (args[0] === ".pclan") {
    try {
      const buffer = await renderClanPointsCard({ guild, clanRole, points: totalPoints });
      const attachment = new AttachmentBuilder(buffer, { name: `pclan-${clanRoleId}.png` });
      return channel.send({ files: [attachment] }).catch(() => {});
    } catch (err) {
      console.error('pclan render error:', err);
    }
  }

  // ---------- .clanmembers (Canvas Image) ----------
  if (args[0] === ".clanmembers") {
    const page = parseInt(args[1]) ? parseInt(args[1]) - 1 : 0;
    const memberPointsForClan = clanMemberPoints[clanRoleId] || {};

    try {
      const totalPages = Math.max(1, Math.ceil(Math.max(0, membersInClan.size - 3) / 4));
      const currentPage = Math.max(0, Math.min(page, totalPages - 1));
      const buffer = await renderClanMembersCard({ guild, clanRole, members: membersInClan, memberPoints: memberPointsForClan, page: currentPage });
      const attachment = new AttachmentBuilder(buffer, { name: `clanmembers-${clanRoleId}.png` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`cm_prev_${clanRoleId}`)
          .setLabel('<')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage <= 0),
        new ButtonBuilder()
          .setCustomId(`cm_next_${clanRoleId}`)
          .setLabel('>')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage >= totalPages - 1)
      );

      clanMembersCache.set(`${channel.id}:${clanRoleId}`, { clanRoleId, page: currentPage });
      return channel.send({ files: [attachment], components: [row] }).catch(() => {});
    } catch (err) {
      console.error('clanmembers render error:', err);
    }
  }

  // ---------- .add ----------
  if (args[0] === ".add") {
    if (
      !member.roles.cache.has(LEADER_ROLE_ID) &&
      !member.roles.cache.has(CO_LEADER_ROLE_ID)
    ) {
      return;
    }

    if (!args[1]) {
      return channel.send("**<:874346wrong:1468911435986894900> you missed Add ID.**").catch(() => {});
    }

    const target = await guild.members.fetch(args[1]).catch(() => null);

    if (!target) {
      return channel.send("User not found.").catch(() => {});
    }

    await target.roles.add(clanRoleId).catch(() => {});

    checkClanCapacityAndWarn(guild, clanRoleId);

    return channel.send(`<:8186brownverify:1468910127129034876> ${target} He has become a member with **${clanRole.name}**`).catch(() => {});
  }

  // ---------- .remove ----------
  if (args[0] === ".remove") {
    if (
      !member.roles.cache.has(LEADER_ROLE_ID) &&
      !member.roles.cache.has(CO_LEADER_ROLE_ID)
    ) {
      return;
    }

    if (!args[1]) {
      const membersList = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId));

      if (membersList.size === 0) {
        return channel.send("**<:874346wrong:1468911435986894900> no member to remove.**").catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor("#c51313")
        .setTitle("<a:vampiree:1467937347285811200> Members you can remove")
        .setDescription(membersList.map(m => `${m} | **${m.id}**`).join("\n"))
        .setTimestamp();

      return channel.send({ embeds: [embed] }).catch(() => {});
    }

    const target = await guild.members.fetch(args[1]).catch(() => null);
    if (!target) return;

    await target.roles.remove(clanRoleId).catch(() => {});

    return channel.send(`<:8186brownverify:1468910127129034876> ${target} removed from your clan. **${clanRole.name}**`).catch(() => {});
  }
});

// ================= AUTO GIFS =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const channelGifs = {
    "1472988452177055920": "https://media.discordapp.net/attachments/1200093733140561941/1240749634079690877/A83CA8AD-E686-4D1A-B249-165287F5C00F.gif?ex=69941a64&is=6992c8e4&hm=2d1112623ef9066cec23484ea27de8996e5ca2c18e62262fa9cb155a993b5f78&=&width=360&height=46",
    "1417802688799707168": "https://media.discordapp.net/attachments/1503073201264267395/1521879110836682933/video_202607010701.gif?ex=6a466fdf&is=6a451e5f&hm=2d424d5ea6c3cb4e4c31fafe0c1f10924acdc8abb92c3237a2d6c1aff585cd5b&=&width=600&height=58",
    "1417802681711595573": "https://media.discordapp.net/attachments/1503073201264267395/1521879110836682933/video_202607010701.gif?ex=6a466fdf&is=6a451e5f&hm=2d424d5ea6c3cb4e4c31fafe0c1f10924acdc8abb92c3237a2d6c1aff585cd5b&=&width=600&height=58",
    "1417802853032132739": "https://image2url.com/r2/default/gifs/1770897376733-d54013ab-b7b1-4efe-979e-52be1c26c4be.gif",
    "1417802727156748381": "https://media.discordapp.net/attachments/1503073201264267395/1521879110836682933/video_202607010701.gif?ex=6a466fdf&is=6a451e5f&hm=2d424d5ea6c3cb4e4c31fafe0c1f10924acdc8abb92c3237a2d6c1aff585cd5b&=&width=600&height=58",
    "1431654305156431892": "https://image2url.com/r2/default/gifs/1770897376733-d54013ab-b7b1-4efe-979e-52be1c26c4be.gif",
    "1470399623435653212": "https://image2url.com/r2/default/gifs/1770897376733-d54013ab-b7b1-4efe-979e-52be1c26c4be.gif",
    "1417802795737808929": "https://image2url.com/r2/default/gifs/1770897376733-d54013ab-b7b1-4efe-979e-52be1c26c4be.gif",
    "1417802703039631464": "https://image2url.com/r2/default/gifs/1770897376733-d54013ab-b7b1-4efe-979e-52be1c26c4be.gif"
  };

  const gif = channelGifs[message.channel.id];

  if (gif) {
    await message.channel.send(gif).catch(() => {});
  }
});

// ================= SAVE ON EXIT =================
process.on("SIGINT", async () => {
  await flushAll();
  process.exit();
});

process.on("uncaughtException", err => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
  console.error("Unhandled Rejection:", err);
});

// ================= LOGIN =================
}

module.exports = { registerSystem };
