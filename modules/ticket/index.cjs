const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  AuditLogEvent,
} = require("discord.js");

const CODE_VERSION = "ticket-bot-pro-per-category-antispam-autoclose-v3";
const DATA_FILE = path.join(__dirname, "ticket-data.json");
const DAY_MS = 24 * 60 * 60 * 1000;

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  staffRoleId: process.env.STAFF_ROLE_ID,
  ticketOpenRoleId: process.env.TICKET_OPEN_ROLE_ID || "1417802580645380176",
  ticketCommandUserId: process.env.TICKET_COMMAND_USER_ID || "1084793381491834890",

  generalCategoryId: process.env.GENERAL_CATEGORY_ID || process.env.TICKET_CATEGORY_ID || "",
  supportCategoryId: process.env.SUPPORT_CATEGORY_ID || "",
  clanCategoryId: process.env.CLAN_CATEGORY_ID || "",
  reportMemberCategoryId: process.env.REPORT_MEMBER_CATEGORY_ID || "1516538116104785920",
  closedCategoryId: process.env.CLOSED_CATEGORY_ID || "",
  logCategoryId: process.env.LOG_CATEGORY_ID || "",
  logChannelId: process.env.LOG_CHANNEL_ID || "",
  banLogChannelId: process.env.BAN_LOG_CHANNEL_ID || "1516538404232364203",
  clanRequestChannelId: process.env.CLAN_REQUEST_CHANNEL_ID || "1516538311714410628",

  panelBannerUrl: process.env.PANEL_BANNER_URL || "",
  ticketBannerUrl: process.env.TICKET_BANNER_URL || "",
  transcriptLimit: Number(process.env.TRANSCRIPT_LIMIT || 1000),
  autoCloseDays: Number(process.env.AUTO_CLOSE_DAYS || 2),
  autoCloseCheckMinutes: Number(process.env.AUTO_CLOSE_CHECK_MINUTES || 30),
};

for (const key of ["token", "clientId", "guildId", "staffRoleId"]) {
  if (!config[key]) {
    console.error(`Missing .env value: ${key}`);
    process.exit(1);
  }
}

config.autoCloseDays = Number.isFinite(config.autoCloseDays) && config.autoCloseDays > 0
  ? config.autoCloseDays
  : 2;
config.autoCloseCheckMinutes =
  Number.isFinite(config.autoCloseCheckMinutes) && config.autoCloseCheckMinutes > 0
    ? config.autoCloseCheckMinutes
    : 30;
config.autoCloseMs = config.autoCloseDays * DAY_MS;
config.autoCloseCheckMs = config.autoCloseCheckMinutes * 60 * 1000;

const ticketTypes = {
  general: {
    buttonLabel: "Open Ticket",
    label: "General",
    channelPrefix: "ticket",
    categoryName: "Tickets",
    categoryId: config.generalCategoryId,
    color: 0x9b59b6,
  },
  support: {
    buttonLabel: "Support",
    label: "Support",
    channelPrefix: "support",
    categoryName: "Support Tickets",
    categoryId: config.supportCategoryId,
    color: 0x3498db,
  },
  clan: {
    buttonLabel: "Clan",
    label: "Clan",
    channelPrefix: "clan",
    categoryName: "Clan Tickets",
    categoryId: config.clanCategoryId,
    color: 0x9b59b6,
  },
  reportMember: {
    buttonLabel: "Report member",
    label: "Report Member",
    channelPrefix: "report",
    categoryName: "Report Member Tickets",
    categoryId: config.reportMemberCategoryId,
    color: 0xe74c3c,
  },
};

const buttonEmojis = {
  general: "<a:lottieflowscrolldown09af87eeease:1516352290024456264>", 
  support: "<:Screenshot_20260615_000851remove:1516038437252239462>",
  clan: "<:Screenshot_20260615_213607remove:1516361006199083038>", 
  reportMember: "<:Screenshot_20260615_213111remove:1516359645923512480>",
  claim: "<a:lottieflowchekbox08545350easey:1516352380998782996>", 
  close: "<a:lottieflowmenunav115f30202easey:1516352802933444639>", 
  delete: "<a:lottieflowchat1711ff0000easey1:1516352429598445658>",
  confirmClose: "<:9d8af2a4f37e0ea4b9e20a897ab52fed:1516038505048969258>", 
  confirmDelete: "<:9d8af2a4f37e0ea4b9e20a897ab52fed:1516038505048969258>", 
};

function registerTicket(client) {

const reportMemberReasons = [
  {
    label: "Harassment / Insults",
    value: "harassment_insults",
    description: "Threats, insults, racism, or toxic behavior.",
  },
  {
    label: "Spam / Flood",
    value: "spam_flood",
    description: "Repeated messages, flood, or annoying pings.",
  },
  {
    label: "Scam / Suspicious Link",
    value: "scam_link",
    description: "Scam, phishing, fake giveaway, or unsafe link.",
  },
  {
    label: "Breaking Server Rules",
    value: "breaking_rules",
    description: "Any clear server rule violation.",
  },
  {
    label: "Other Report",
    value: "other_report",
    description: "Something else staff should review.",
  },
];

const clanRequestReasons = [
  {
    label: "Open a New Clan",
    value: "open_new_clan",
  },
  {
    label: "Move Existing Clan",
    value: "move_existing_clan",
  },
  {
    label: "Revive Old Clan",
    value: "revive_old_clan",
  },
  {
    label: "Other Clan Request",
    value: "other_clan_request",
  },
];

const clanRequirementsText = [
  "Must have at least 7 friends.",
  "Must be active in the server.",
].join("\n");

function createEmptyData() {
  return {
    lastTicketNumber: 0,
    ticketNumbers: {},
    tickets: {},
    bannedUsers: {},
    clanRequests: {},
  };
}

function normalizeData(rawData = {}) {
  const data = {
    ...createEmptyData(),
    ...rawData,
    ticketNumbers:
      rawData.ticketNumbers && typeof rawData.ticketNumbers === "object"
        ? rawData.ticketNumbers
        : {},
    tickets:
      rawData.tickets && typeof rawData.tickets === "object"
        ? rawData.tickets
        : {},
    bannedUsers:
      rawData.bannedUsers && typeof rawData.bannedUsers === "object"
        ? rawData.bannedUsers
        : {},
    clanRequests:
      rawData.clanRequests && typeof rawData.clanRequests === "object"
        ? rawData.clanRequests
        : {},
  };

  if (Array.isArray(rawData.bannedUsers)) {
    data.bannedUsers = Object.fromEntries(
      rawData.bannedUsers.map((userId) => [
        String(userId),
        { userId: String(userId), bannedAt: null, bannedById: null, reason: "Imported ban" },
      ])
    );
  }

  for (const ticketType of Object.keys(ticketTypes)) {
    const savedNumber = Number(data.ticketNumbers[ticketType] || 0);
    const maxSavedTicketNumber = Object.values(data.tickets)
      .filter((ticket) => ticket?.type === ticketType)
      .reduce((max, ticket) => Math.max(max, Number(ticket.number || 0)), 0);

    data.ticketNumbers[ticketType] = Math.max(savedNumber, maxSavedTicketNumber);
  }

  data.lastTicketNumber = Number(data.lastTicketNumber || 0);
  return data;
}

async function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const data = createEmptyData();
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
  }

  try {
    return normalizeData(JSON.parse(fs.readFileSync(DATA_FILE, "utf8")));
  } catch {
    const data = createEmptyData();
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
  }
}

async function saveData(data) {
  await fs.promises.writeFile(DATA_FILE, JSON.stringify(normalizeData(data), null, 2));
}

function getChoiceOption(options, value) {
  return (
    options.find((option) => option.value === value) || {
      label: value,
      value,
      description: "",
    }
  );
}

function makeClanRequestId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function saveClanRequest(requestId, requestData) {
  const data = await loadData();
  data.clanRequests[String(requestId)] = {
    ...(data.clanRequests[String(requestId)] || {}),
    ...requestData,
    requestId: String(requestId),
    updatedAt: new Date().toISOString(),
  };
  await saveData(data);
  return data.clanRequests[String(requestId)];
}

async function getClanRequest(requestId) {
  return (await loadData()).clanRequests[String(requestId)] || null;
}

async function getNextTicketNumber(ticketType) {
  const data = await loadData();
  data.ticketNumbers[ticketType] = Number(data.ticketNumbers[ticketType] || 0) + 1;
  data.lastTicketNumber = Math.max(data.lastTicketNumber, data.ticketNumbers[ticketType]);
  await saveData(data);
  return data.ticketNumbers[ticketType];
}

async function saveTicket(channelId, ticketData) {
  const data = await loadData();

  data.tickets[channelId] = {
    ...(data.tickets[channelId] || {}),
    ...ticketData,
    updatedAt: new Date().toISOString(),
  };

  await saveData(data);
}

function parseUserId(value) {
  const match = String(value || "").match(/\d{17,20}/);
  return match ? match[0] : null;
}

async function getTicketBan(userId) {
  return (await loadData()).bannedUsers[String(userId)] || null;
}

async function ticketBanUser(userId, bannedById, reason = "") {
  const data = await loadData();

  data.bannedUsers[String(userId)] = {
    userId: String(userId),
    bannedById,
    bannedAt: new Date().toISOString(),
    reason: reason.trim() || "No reason provided",
  };

  await saveData(data);
}

async function ticketUnbanUser(userId) {
  const data = await loadData();
  const existed = Boolean(data.bannedUsers[String(userId)]);

  delete data.bannedUsers[String(userId)];
  await saveData(data);

  return existed;
}

function safeName(value) {
  return String(value || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 18) || "user";
}

function cleanTopicValue(value, max = 140) {
  return String(value || "")
    .replace(/\|/g, "/")
    .replace(/\n/g, " ")
    .trim()
    .slice(0, max);
}

function getTopicValue(topic, key) {
  const part = String(topic || "")
    .split("|")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${key}:`));

  return part ? part.slice(key.length + 1).trim() : null;
}

function setTopicValue(topic, key, value) {
  const parts = String(topic || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const entry = `${key}:${cleanTopicValue(value, 220)}`;
  const index = parts.findIndex((item) => item.startsWith(`${key}:`));

  if (index >= 0) parts[index] = entry;
  else parts.push(entry);

  return parts.join(" | ").slice(0, 1024);
}

function isTicketChannel(channel) {
  return Boolean(channel?.topic?.includes("ticket-owner:"));
}

function isTicketClosed(channel) {
  return getTopicValue(channel?.topic, "ticket-status") === "closed";
}

function getTicketOwnerId(channel) {
  return getTopicValue(channel?.topic, "ticket-owner");
}

function isTicketOwner(channel, userId) {
  return getTicketOwnerId(channel) === userId;
}

async function findOpenTicketForUser(guild, userId) {
  const data = await loadData();

  for (const [channelId, ticket] of Object.entries(data.tickets)) {
    if (ticket?.ownerId !== userId || ticket?.status !== "open") continue;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased?.() && isTicketChannel(channel) && !isTicketClosed(channel)) {
      return channel;
    }
  }

  await guild.channels.fetch().catch(() => null);

  return (
    guild.channels.cache.find((channel) => {
      return (
        channel?.isTextBased?.() &&
        isTicketChannel(channel) &&
        !isTicketClosed(channel) &&
        getTicketOwnerId(channel) === userId
      );
    }) || null
  );
}

async function getTicketOpenBlock(guild, userId) {
  const ban = await getTicketBan(userId);
  if (ban) {
    return {
      content: `You are ticket-banned and cannot open tickets. Reason: ${shorten(ban.reason, 200)}`,
    };
  }

  const openTicket = await findOpenTicketForUser(guild, userId);
  if (openTicket) {
    return {
      content: `You already have an open ticket: <#${openTicket.id}>. Close it before opening another one.`,
    };
  }

  return null;
}

async function markTicketActivity(channel, timestamp = Date.now()) {
  if (!isTicketChannel(channel) || isTicketClosed(channel)) return;

  await saveTicket(channel.id, {
    channelId: channel.id,
    ownerId: getTicketOwnerId(channel),
    type: getTopicValue(channel.topic, "ticket-type") || "general",
    status: "open",
    lastActivityAt: new Date(timestamp).toISOString(),
  });
}

function shorten(value, max = 1024) {
  const text = String(value || "").trim();
  if (!text) return "None";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function discordTime(value, style = "F") {
  return `<t:${Math.floor(new Date(value).getTime() / 1000)}:${style}>`;
}

function transcriptTime(value) {
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

async function clearOldSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: [] }
  );

  console.log("Old slash commands cleared.");
}

async function getGuildMember(guild, userId) {
  return guild.members.cache.get(userId) ||
    (await guild.members.fetch(userId).catch(() => null));
}

async function canOpenTicketPanel(guild, userId) {
  const member = await getGuildMember(guild, userId);
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.has(config.ticketOpenRoleId);
}

async function isStaff(guild, userId, interaction = null) {
  const member = await getGuildMember(guild, userId);
  if (!member) return false;

  return (
    member.roles.cache.has(config.staffRoleId) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

async function getOrCreateCategory(guild, id, name) {
  if (id) {
    const existing = await guild.channels.fetch(id).catch(() => null);
    if (existing?.type === ChannelType.GuildCategory) return existing;
  }

  await guild.channels.fetch();

  const found = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name.toLowerCase() === name.toLowerCase()
  );

  if (found) return found;

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: config.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });
}

async function getTicketCategory(guild, ticketType) {
  const info = ticketTypes[ticketType];
  return getOrCreateCategory(guild, info.categoryId, info.categoryName);
}

async function getClosedCategory(guild) {
  return getOrCreateCategory(guild, config.closedCategoryId, "Closed Tickets");
}

async function getLogCategory(guild) {
  return getOrCreateCategory(guild, config.logCategoryId, "Ticket Logs");
}

async function getLogChannel(guild, avoidChannelId = "") {
  const logCategory = await getLogCategory(guild);

  if (config.logChannelId && config.logChannelId !== avoidChannelId) {
    const existing = await guild.channels.fetch(config.logChannelId).catch(() => null);

    if (existing?.isTextBased() && !isTicketChannel(existing)) {
      if (existing.parentId !== logCategory.id) {
        await existing.setParent(logCategory.id, { lockPermissions: false }).catch(() => null);
      }

      return existing;
    }
  }

  await guild.channels.fetch();

  const found = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name.toLowerCase() === "ticket-logs" &&
      channel.id !== avoidChannelId &&
      !isTicketChannel(channel)
  );

  if (found) {
    if (found.parentId !== logCategory.id) {
      await found.setParent(logCategory.id, { lockPermissions: false }).catch(() => null);
    }

    return found;
  }

  return guild.channels.create({
    name: "ticket-logs",
    type: ChannelType.GuildText,
    parent: logCategory.id,
    topic: "Ticket logs only",
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: config.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });
}

async function sendTicketLog(guild, payload, avoidChannelId = "") {
  const logChannel = await getLogChannel(guild, avoidChannelId).catch(() => null);
  if (!logChannel?.isTextBased()) return;

  await logChannel.send(payload);
}

function formatUserLogLine(userId) {
  return `<@${userId}>\n\`${userId}\``;
}

async function getBanLogChannel(guild) {
  if (!config.banLogChannelId) return null;

  const channel = await guild.channels.fetch(config.banLogChannelId).catch(() => null);
  return channel?.isTextBased?.() ? channel : null;
}

async function fetchRecentBanAuditEntry(guild, targetUserId, auditType) {
  const logs = await guild.fetchAuditLogs({ type: auditType, limit: 5 }).catch(() => null);
  if (!logs?.entries) return null;

  return (
    logs.entries.find((entry) => {
      return (
        entry.target?.id === targetUserId &&
        Date.now() - entry.createdTimestamp < 20000
      );
    }) || null
  );
}

async function sendBanLog(guild, data) {
  const logChannel = await getBanLogChannel(guild);
  if (!logChannel) return;

  const isBan = data.action === "ban";
  const embed = new EmbedBuilder()
    .setColor(isBan ? 0xe74c3c : 0x2ecc71)
    .setTitle(data.title || (isBan ? "Ban Log" : "Unban Log"))
    .addFields(
      { name: "User", value: formatUserLogLine(data.userId), inline: true },
      {
        name: "Moderator",
        value: data.moderatorId ? formatUserLogLine(data.moderatorId) : "Unknown",
        inline: true,
      },
      { name: "Source", value: data.source || "Unknown", inline: true }
    )
    .setTimestamp();

  if (data.reason) {
    embed.addFields({ name: "Reason", value: shorten(data.reason, 1024), inline: false });
  }

  if (data.result) {
    embed.addFields({ name: "Result", value: shorten(data.result, 1024), inline: false });
  }

  await logChannel.send({
    embeds: [embed],
    allowedMentions: { users: [], roles: [] },
  });
}

async function fetchTicketMessages(channel) {
  const messages = [];
  let before;

  while (messages.length < config.transcriptLimit) {
    const options = { limit: 100 };
    if (before) options.before = before;

    const fetched = await channel.messages.fetch(options).catch(() => null);
    if (!fetched || fetched.size === 0) break;

    messages.push(...fetched.values());
    before = fetched.last().id;

    if (fetched.size < 100) break;
  }

  return messages
    .filter((message) => !message.author.bot)
    .slice(0, config.transcriptLimit)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function getAuthorName(message) {
  return message.member?.displayName || message.author.globalName || message.author.username;
}

function getMessageText(message) {
  const content = message.content?.trim() || "";

  const attachments = [...message.attachments.values()].map((file) => {
    return `[attachment: ${file.name || "file"}] ${file.url}`;
  });

  return [content, ...attachments].filter(Boolean).join(" ") || "[empty]";
}

function buildMessageHistory(messages) {
  if (!messages.length) return "No messages.";

  return messages
    .map((message) => {
      return `${transcriptTime(message.createdTimestamp)} | ${getAuthorName(message)}: ${getMessageText(message)}`;
    })
    .join("\n");
}

function makeHistoryFile(channel, history) {
  return new AttachmentBuilder(Buffer.from(history, "utf8"), {
    name: `message-history-${channel.name}-${channel.id}.txt`.replace(/[^a-zA-Z0-9_.-]/g, "-"),
  });
}

async function analyzePeople(guild, messages, openerId, closerId, claimedById) {
  const staffIds = new Set();
  const memberIds = new Set();

  if (openerId) memberIds.add(openerId);
  if (claimedById) staffIds.add(claimedById);

  if (closerId) {
    if (await isStaff(guild, closerId)) staffIds.add(closerId);
    else memberIds.add(closerId);
  }

  for (const id of [...new Set(messages.map((message) => message.author.id))]) {
    if (await isStaff(guild, id)) staffIds.add(id);
    else memberIds.add(id);
  }

  return { staffIds, memberIds };
}

async function formatPeople(guild, ids) {
  const lines = [];

  for (const id of [...ids].slice(0, 15)) {
    const member = await guild.members.fetch(id).catch(() => null);
    const name = member?.displayName || member?.user?.username || id;
    lines.push(`<@${id}> - ${name}`);
  }

  return lines.length ? lines.join("\n") : "None";
}

async function buildCloseLogEmbed(channel, messages, data) {
  const people = await analyzePeople(
    channel.guild,
    messages,
    data.openedById,
    data.closedById,
    data.claimedById
  );

  return new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle(`Ticket Closed #${data.ticketNumber}`)
    .setDescription("Message history is attached below.")
    .addFields(
      { name: "Type", value: data.ticketTypeLabel, inline: true },
      { name: "Ticket", value: `<#${channel.id}>`, inline: true },
      { name: "Opened By", value: data.openedById ? `<@${data.openedById}>` : "Unknown", inline: true },
      { name: "Closed By", value: data.closedById ? `<@${data.closedById}>` : "System", inline: true },
      { name: "Claimed By", value: data.claimedById ? `<@${data.claimedById}>` : "Not claimed", inline: true },
      { name: "Reason", value: shorten(data.closeReason || "Manual close", 256), inline: false },
      { name: "Subject", value: shorten(data.subject, 256), inline: false },
      { name: "Opened At", value: discordTime(channel.createdTimestamp), inline: true },
      { name: "Closed At", value: discordTime(Date.now()), inline: true },
      { name: "Messages Saved", value: String(messages.length), inline: true },
      { name: "Staff Involved", value: shorten(await formatPeople(channel.guild, people.staffIds)), inline: false },
      { name: "Members Involved", value: shorten(await formatPeople(channel.guild, people.memberIds)), inline: false }
    )
    .setFooter({ text: `Ticket ID: ${channel.id}` })
    .setTimestamp();
}

async function buildDeleteLogEmbed(channel, messages, data) {
  const people = await analyzePeople(
    channel.guild,
    messages,
    data.openedById,
    data.deletedById,
    data.claimedById
  );

  return new EmbedBuilder()
    .setColor(0x111827)
    .setTitle(`Ticket Deleted #${data.ticketNumber}`)
    .setDescription("Message history is attached below.")
    .addFields(
      { name: "Type", value: data.ticketTypeLabel, inline: true },
      { name: "Ticket Name", value: channel.name, inline: true },
      { name: "Opened By", value: data.openedById ? `<@${data.openedById}>` : "Unknown", inline: true },
      { name: "Deleted By", value: `<@${data.deletedById}>`, inline: true },
      { name: "Claimed By", value: data.claimedById ? `<@${data.claimedById}>` : "Not claimed", inline: true },
      { name: "Subject", value: shorten(data.subject, 256), inline: false },
      { name: "Messages Saved", value: String(messages.length), inline: true },
      { name: "Staff Involved", value: shorten(await formatPeople(channel.guild, people.staffIds)), inline: false },
      { name: "Members Involved", value: shorten(await formatPeople(channel.guild, people.memberIds)), inline: false }
    )
    .setFooter({ text: `Ticket ID: ${channel.id}` })
    .setTimestamp();
}

function buildOpenLogEmbed(channel, user, subject, ticketNumber, ticketType) {
  const info = ticketTypes[ticketType];

  return new EmbedBuilder()
    .setColor(info.color)
    .setTitle(`Ticket Opened #${ticketNumber}`)
    .addFields(
      { name: "Type", value: info.label, inline: true },
      { name: "User", value: `<@${user.id}>`, inline: true },
      { name: "Channel", value: `<#${channel.id}>`, inline: true },
      { name: "Subject", value: shorten(subject, 256), inline: false }
    )
    .setFooter({ text: `Ticket ID: ${channel.id}` })
    .setTimestamp();
}

function addButtonEmoji(button, emoji) {
  if (emoji) button.setEmoji(emoji);
  return button;
}

function selectOptions(options) {
  return options.map((option) => {
    const data = {
      label: option.label,
      value: option.value,
    };

    if (option.description) data.description = option.description;
    return data;
  });
}

function reportMemberReasonMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_select_report_member")
      .setPlaceholder("Choose report reason")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(selectOptions(reportMemberReasons))
  );
}

function clanRequestReasonMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_select_clan_request")
      .setPlaceholder("Why do you want to open a clan?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(selectOptions(clanRequestReasons))
  );
}

function clanRequestButtons(requestId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`clan_request_approve_${requestId}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`clan_request_reject_${requestId}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function panelButtons() {
  return new ActionRowBuilder().addComponents(
    addButtonEmoji(
      new ButtonBuilder()
        .setCustomId("ticket_open_general")
        .setLabel(ticketTypes.general.buttonLabel)
        .setStyle(ButtonStyle.Secondary),
      buttonEmojis.general
    ),
    addButtonEmoji(
      new ButtonBuilder()
        .setCustomId("ticket_open_support")
        .setLabel(ticketTypes.support.buttonLabel)
        .setStyle(ButtonStyle.Secondary),
      buttonEmojis.support
    ),
    addButtonEmoji(
      new ButtonBuilder()
        .setCustomId("ticket_open_reportMember")
        .setLabel(ticketTypes.reportMember.buttonLabel)
        .setStyle(ButtonStyle.Secondary),
      buttonEmojis.reportMember
    )
  );
}

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    addButtonEmoji(
      new ButtonBuilder()
        .setCustomId("ticket_claim")
        .setLabel("Claim")
        .setStyle(ButtonStyle.Secondary),
      buttonEmojis.claim
    ),
    addButtonEmoji(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Secondary),
      buttonEmojis.close
    ),
    addButtonEmoji(
      new ButtonBuilder()
        .setCustomId("ticket_delete")
        .setLabel("Delete Ticket")
        .setStyle(ButtonStyle.Secondary),
      buttonEmojis.delete
    )
  );
}

async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(0x010000)
  if (config.panelBannerUrl) embed.setImage(config.panelBannerUrl);

  await channel.send({
    embeds: [embed],
    components: [panelButtons()],
  });
}

async function getClanRequestChannel(guild) {
  const channel = await guild.channels.fetch(config.clanRequestChannelId).catch(() => null);
  return channel?.isTextBased?.() ? channel : null;
}

function buildClanRequestEmbed(request) {
  const status = request.status || "pending";
  const color =
    status === "approved" ? 0x2ecc71 :
    status === "rejected" ? 0xe74c3c :
    status === "processing" ? 0xf1c40f :
    0x9b59b6;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Clan Request - ${status.toUpperCase()}`)
    .addFields(
      { name: "Requester", value: `<@${request.userId}>\n\`${request.userId}\``, inline: true },
      { name: "Reason", value: shorten(request.reasonLabel, 256), inline: true },
      { name: "Requirements", value: clanRequirementsText, inline: false }
    )
    .setFooter({ text: `Clan Request ID: ${request.requestId}` })
    .setTimestamp(request.createdAt ? new Date(request.createdAt) : new Date());

  if (request.reasonDescription) {
    embed.addFields({ name: "Selected List Text", value: shorten(request.reasonDescription, 512), inline: false });
  }

  if (request.reviewedById) {
    embed.addFields({ name: "Reviewed By", value: `<@${request.reviewedById}>`, inline: true });
  }

  if (request.ticketChannelId) {
    embed.addFields({ name: "Ticket", value: `<#${request.ticketChannelId}>`, inline: true });
  }

  return embed;
}

function clanTicketDetails(request) {
  return [
    `Clan request reason: ${request.reasonLabel}`,
    "Approved by staff. Requirements checked.",
  ].filter(Boolean).join("\n");
}

async function sendClanRequestRejectedDm(userId) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return false;

  return user
    .send(
      "We're sorry, your clan request was rejected. Please make sure you have at least 7 friends and that you are active in the server before requesting again."
    )
    .then(() => true)
    .catch(() => false);
}

async function sendClanApprovalRequest(interaction, reasonOption) {
  await interaction.deferReply({ ephemeral: true });

  const block = await getTicketOpenBlock(interaction.guild, interaction.user.id);
  if (block) {
    await interaction.editReply(block.content);
    return;
  }

  const reviewChannel = await getClanRequestChannel(interaction.guild);
  if (!reviewChannel) {
    await interaction.editReply(`Clan review channel not found: ${config.clanRequestChannelId}`);
    return;
  }

  const requestId = makeClanRequestId();
  const request = await saveClanRequest(requestId, {
    requestId,
    userId: interaction.user.id,
    username: interaction.user.username,
    reasonValue: reasonOption.value,
    reasonLabel: reasonOption.label,
    reasonDescription: reasonOption.description,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  const message = await reviewChannel.send({
    content: `<@&${config.staffRoleId}>`,
    embeds: [buildClanRequestEmbed(request)],
    components: [clanRequestButtons(requestId)],
    allowedMentions: { roles: [config.staffRoleId] },
  });

  await saveClanRequest(requestId, {
    channelId: reviewChannel.id,
    messageId: message.id,
  });

  await interaction.editReply("Your clan request has been sent to staff for approval.");
}

async function updateClanRequestPanel(interaction, request, updates) {
  const updatedRequest = await saveClanRequest(request.requestId, {
    ...request,
    ...updates,
  });

  await interaction.message.edit({
    embeds: [buildClanRequestEmbed(updatedRequest)],
    components: [clanRequestButtons(request.requestId, updatedRequest.status !== "pending")],
  }).catch(() => null);

  return updatedRequest;
}

async function handleClanRequestDecision(interaction, action, requestId) {
  if (!(await isStaff(interaction.guild, interaction.user.id, interaction))) {
    await interaction.reply({ content: "Only staff can review clan requests.", ephemeral: true });
    return;
  }

  const request = await getClanRequest(requestId);
  if (!request) {
    await interaction.reply({ content: "Clan request not found.", ephemeral: true });
    return;
  }

  if (request.status !== "pending") {
    await interaction.reply({
      content: `This clan request is already ${request.status}.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  if (action === "reject") {
    await updateClanRequestPanel(interaction, request, {
      status: "rejected",
      reviewedById: interaction.user.id,
      reviewedAt: new Date().toISOString(),
    });

    const dmSent = await sendClanRequestRejectedDm(request.userId);
    await interaction.editReply(dmSent
      ? "Clan request rejected. DM sent to the member."
      : "Clan request rejected. I could not DM the member.");
    return;
  }

  await saveClanRequest(request.requestId, {
    ...request,
    status: "processing",
    reviewedById: interaction.user.id,
    reviewedAt: new Date().toISOString(),
  });

  await interaction.message.edit({
    embeds: [
      buildClanRequestEmbed({
        ...request,
        status: "processing",
        reviewedById: interaction.user.id,
      }),
    ],
    components: [clanRequestButtons(request.requestId, true)],
  }).catch(() => null);

  const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
  const ownerUser = member?.user || await client.users.fetch(request.userId).catch(() => null);

  if (!ownerUser) {
    await updateClanRequestPanel(interaction, request, {
      status: "pending",
      reviewedById: null,
      reviewedAt: null,
    });
    await interaction.editReply("I could not find this member. Clan request returned to pending.");
    return;
  }

  const channel = await openTicket(
    interaction,
    "clan",
    `Clan Request: ${request.reasonLabel}`,
    clanTicketDetails(request),
    { ownerUser }
  );

  if (!channel) {
    await updateClanRequestPanel(interaction, request, {
      status: "pending",
      reviewedById: null,
      reviewedAt: null,
    });
    return;
  }

  await updateClanRequestPanel(interaction, request, {
    status: "approved",
    reviewedById: interaction.user.id,
    reviewedAt: new Date().toISOString(),
    ticketChannelId: channel.id,
  });
}

function defaultTicketSubject(ticketType) {
  const info = ticketTypes[ticketType];
  return `${info?.label || "Ticket"} Ticket`;
}

function buildTicketModal(ticketType, info) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${ticketType}`)
    .setTitle(`Open ${info.label} Ticket`);

  const rows = [];

  if (ticketType !== "support") {
    const subjectInput = new TextInputBuilder()
      .setCustomId("ticket_subject")
      .setLabel("Subject")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    rows.push(new ActionRowBuilder().addComponents(subjectInput));
  }

  if (ticketType !== "general") {
    const detailsInput = new TextInputBuilder()
      .setCustomId("ticket_details")
      .setLabel("Describe your problem")
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);

    rows.push(new ActionRowBuilder().addComponents(detailsInput));
  }

  modal.addComponents(...rows);
  return modal;
}

async function openTicket(interaction, ticketType, subject, details = "", options = {}) {
  const info = ticketTypes[ticketType];
  if (!info) return null;

  const ownerUser = options.ownerUser || interaction.user;
  const block = await getTicketOpenBlock(interaction.guild, ownerUser.id);
  if (block) {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(block.content);
    } else {
      await interaction.reply({ content: block.content, ephemeral: true });
    }
    return null;
  }

  const cleanSubject = cleanTopicValue(subject, 100) || defaultTicketSubject(ticketType);
  const cleanDetails = String(details || "").trim().slice(0, 1000);

  const ticketNumber = await getNextTicketNumber(ticketType);
  const openerName = safeName(ownerUser.username);
  const ticketCategory = await getTicketCategory(interaction.guild, ticketType);

  let topic = `ticket-owner:${ownerUser.id}`;
  topic = setTopicValue(topic, "ticket-status", "open");
  topic = setTopicValue(topic, "ticket-type", ticketType);
  topic = setTopicValue(topic, "ticket-subject", cleanSubject);
  topic = setTopicValue(topic, "ticket-number", ticketNumber);
  topic = setTopicValue(topic, "ticket-opener-name", openerName);

  const channel = await interaction.guild.channels.create({
    name: `${info.channelPrefix}-${ticketNumber}-${openerName}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: ticketCategory.id,
    topic,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: ownerUser.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: config.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });

  await saveTicket(channel.id, {
    number: ticketNumber,
    type: ticketType,
    ownerId: ownerUser.id,
    openerName,
    subject: cleanSubject,
    status: "open",
    channelId: channel.id,
    openedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  });

  const ticketFields = [
    { name: "User", value: `<@${ownerUser.id}>`, inline: true },
    { name: "Type", value: info.label, inline: true },
  ];

  if (ticketType !== "support" && ticketType !== "clan") {
    ticketFields.push({ name: "Subject", value: cleanSubject, inline: false });
  }

  if (cleanDetails) {
    ticketFields.push({ name: "Details", value: cleanDetails, inline: false });
  }

  const ticketEmbed = new EmbedBuilder()
    .setColor(info.color)
    .setTitle(`${info.label} Ticket #${ticketNumber}`)
    .addFields(...ticketFields)
    .setFooter({ text: `Ticket ID: ${channel.id}` })
    .setTimestamp();

  if (config.ticketBannerUrl) ticketEmbed.setImage(config.ticketBannerUrl);

  await channel.send({
    content: `<@${ownerUser.id}> <@&${config.staffRoleId}>`,
    embeds: [ticketEmbed],
    components: [ticketButtons()],
    allowedMentions: {
      users: [ownerUser.id],
      roles: [config.staffRoleId],
    },
  });

  await sendTicketLog(interaction.guild, {
    embeds: [buildOpenLogEmbed(channel, ownerUser, cleanSubject, ticketNumber, ticketType)],
  }, channel.id);

  const successMessage = ownerUser.id === interaction.user.id
    ? `Your ticket has been opened: <#${channel.id}>`
    : `Clan ticket for <@${ownerUser.id}> has been opened: <#${channel.id}>`;

  await interaction.editReply(successMessage);
  return channel;
}

async function closeTicketChannel(channel, closedById, closeReason = "Manual close") {
  const openedById = getTicketOwnerId(channel);
  const subject = getTopicValue(channel.topic, "ticket-subject") || "No subject";
  const ticketNumber = getTopicValue(channel.topic, "ticket-number") || "Unknown";
  const ticketType = getTopicValue(channel.topic, "ticket-type") || "general";
  const openerName = getTopicValue(channel.topic, "ticket-opener-name") || "user";
  const claimedById = getTopicValue(channel.topic, "ticket-claimed");

  const messages = await fetchTicketMessages(channel);
  const history = buildMessageHistory(messages);

  const closeEmbed = await buildCloseLogEmbed(channel, messages, {
    openedById,
    closedById,
    claimedById,
    subject,
    ticketNumber,
    closeReason,
    ticketTypeLabel: ticketTypes[ticketType]?.label || ticketType,
  });

  await sendTicketLog(
    channel.guild,
    {
      embeds: [closeEmbed],
      files: [makeHistoryFile(channel, history)],
    },
    channel.id
  );

  let topic = channel.topic || "";
  topic = setTopicValue(topic, "ticket-status", "closed");
  topic = setTopicValue(topic, "ticket-closed-by", closedById || "system");
  topic = setTopicValue(topic, "ticket-closed-at", new Date().toISOString());
  topic = setTopicValue(topic, "ticket-close-reason", closeReason);

  await channel.setTopic(topic).catch(() => null);

  const closedCategory = await getClosedCategory(channel.guild);
  await channel.setParent(closedCategory.id, { lockPermissions: false }).catch(() => null);

  await channel.permissionOverwrites.set([
    { id: channel.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: config.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
      ],
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ]).catch(() => null);

  await channel.setName(`closed-${ticketNumber}-${openerName}`.slice(0, 90)).catch(() => null);

  await saveTicket(channel.id, {
    number: ticketNumber === "Unknown" ? null : Number(ticketNumber),
    type: ticketType,
    ownerId: openedById,
    openerName,
    subject,
    status: "closed",
    channelId: channel.id,
    closedById,
    closeReason,
    closedAt: new Date().toISOString(),
  });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;

  if (!isTicketChannel(channel)) {
    await interaction.update({ content: "This is not a ticket channel.", components: [] });
    return;
  }

  if (isTicketClosed(channel)) {
    await interaction.update({ content: "This ticket is already closed.", components: [] });
    return;
  }

  const canClose =
    isTicketOwner(channel, interaction.user.id) ||
    (await isStaff(interaction.guild, interaction.user.id, interaction));

  if (!canClose) {
    await interaction.update({ content: "You cannot close this ticket.", components: [] });
    return;
  }

  await interaction.update({
    content: "Ticket closed. Log sent to ticket-logs.",
    components: [],
  });

  await closeTicketChannel(channel, interaction.user.id, "Manual close");
}

async function deleteTicket(interaction) {
  const channel = interaction.channel;

  if (!isTicketChannel(channel)) {
    await interaction.update({ content: "This is not a ticket channel.", components: [] });
    return;
  }

  if (!(await isStaff(interaction.guild, interaction.user.id, interaction))) {
    await interaction.update({ content: "Only staff can delete tickets.", components: [] });
    return;
  }

  await interaction.update({
    content: "Deleting ticket. Log sent to ticket-logs.",
    components: [],
  });

  const openedById = getTicketOwnerId(channel);
  const subject = getTopicValue(channel.topic, "ticket-subject") || "No subject";
  const ticketNumber = getTopicValue(channel.topic, "ticket-number") || "Unknown";
  const ticketType = getTopicValue(channel.topic, "ticket-type") || "general";
  const openerName = getTopicValue(channel.topic, "ticket-opener-name") || "user";
  const claimedById = getTopicValue(channel.topic, "ticket-claimed");

  const messages = await fetchTicketMessages(channel);
  const history = buildMessageHistory(messages);

  const deleteEmbed = await buildDeleteLogEmbed(channel, messages, {
    openedById,
    deletedById: interaction.user.id,
    claimedById,
    subject,
    ticketNumber,
    ticketTypeLabel: ticketTypes[ticketType]?.label || ticketType,
  });

  await sendTicketLog(
    interaction.guild,
    {
      embeds: [deleteEmbed],
      files: [makeHistoryFile(channel, history)],
    },
    channel.id
  );

  await saveTicket(channel.id, {
    number: ticketNumber === "Unknown" ? null : Number(ticketNumber),
    type: ticketType,
    ownerId: openedById,
    openerName,
    subject,
    status: "deleted",
    channelId: channel.id,
    deletedById: interaction.user.id,
    deletedAt: new Date().toISOString(),
  });

  setTimeout(() => {
    channel.delete("Ticket deleted").catch(() => null);
  }, 3000);
}

let autoCloseInterval = null;
let autoCloseRunning = false;

function getAutoCloseBaseTime(ticket, channel) {
  const value =
    ticket?.lastActivityAt ||
    ticket?.openedAt ||
    channel?.createdTimestamp ||
    Date.now();

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Date.now();
}

async function autoCloseExpiredTickets() {
  if (autoCloseRunning) return;
  autoCloseRunning = true;

  try {
    const guild = await client.guilds.fetch(config.guildId).catch(() => null);
    if (!guild) return;

    const data = await loadData();
    const now = Date.now();
    const closeReason = `Auto close: no activity for ${config.autoCloseDays} day(s).`;

    for (const [channelId, ticket] of Object.entries(data.tickets)) {
      if (ticket?.status !== "open") continue;

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased?.()) {
        await saveTicket(channelId, {
          ...ticket,
          status: "missing",
          missingAt: new Date().toISOString(),
        });
        continue;
      }

      if (!isTicketChannel(channel)) continue;

      if (isTicketClosed(channel)) {
        await saveTicket(channelId, {
          ...ticket,
          status: "closed",
          closedAt: ticket.closedAt || new Date().toISOString(),
        });
        continue;
      }

      const age = now - getAutoCloseBaseTime(ticket, channel);
      if (age < config.autoCloseMs) continue;

      await channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle("Ticket Auto Closed")
              .setDescription(closeReason)
              .setTimestamp(),
          ],
        })
        .catch(() => null);

      await closeTicketChannel(channel, client.user.id, closeReason).catch(console.error);
    }
  } finally {
    autoCloseRunning = false;
  }
}

function startAutoCloseScheduler() {
  if (autoCloseInterval) return;

  autoCloseInterval = setInterval(() => {
    autoCloseExpiredTickets().catch(console.error);
  }, config.autoCloseCheckMs);

  setTimeout(() => {
    autoCloseExpiredTickets().catch(console.error);
  }, 15000);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Code version: ${CODE_VERSION}`);
  console.log(`Auto close: ${config.autoCloseDays} day(s), check every ${config.autoCloseCheckMinutes} minute(s).`);
  startAutoCloseScheduler();
});

// Server ban/unban events removed - ticket ban channel is for ticket bans only

async function canUseTicketAdminCommand(message) {
  if (message.author.id === config.ticketCommandUserId) return true;
  return isStaff(message.guild, message.author.id);
}

async function handleTicketBanCommand(message, args, shouldBan) {
  if (!(await canUseTicketAdminCommand(message))) return;

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.reply({
      content: shouldBan
        ? "Usage: `.ticketban userId [reason]`"
        : "Usage: `.ticketunban userId`",
      allowedMentions: { users: [] },
    });
    return;
  }

  if (shouldBan) {
    const reason = args.slice(1).join(" ").trim();
    await ticketBanUser(userId, message.author.id, reason);

    await message.reply({
      content: `<@${userId}> is now ticket-banned. They cannot open new tickets.`,
      allowedMentions: { users: [] },
    });

    await sendBanLog(message.guild, {
      action: "ban",
      title: "Ticket User Banned",
      userId,
      moderatorId: message.author.id,
      reason: reason || "No reason provided",
      source: "Ticket command",
    }).catch(console.error);

    return;
  }

  const existed = await ticketUnbanUser(userId);

  await message.reply({
    content: existed
      ? `<@${userId}> is no longer ticket-banned.`
      : `<@${userId}> was not ticket-banned.`,
    allowedMentions: { users: [] },
  });

  await sendBanLog(message.guild, {
    action: "unban",
    title: "Ticket User Unbanned",
    userId,
    moderatorId: message.author.id,
    result: existed
      ? "User can open tickets again."
      : "Command used, but this user was not ticket-banned.",
    source: "Ticket command",
  }).catch(console.error);
}

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    if (isTicketChannel(message.channel) && !isTicketClosed(message.channel)) {
      await markTicketActivity(message.channel, message.createdTimestamp);


    }

    const content = message.content.trim();
    if (!content.startsWith(".")) return;

    const [command, ...args] = content.split(/\s+/);
    const normalizedCommand = command.toLowerCase();

    if (normalizedCommand === ".ticketban") {
      await handleTicketBanCommand(message, args, true);
      return;
    }

    if (normalizedCommand === ".ticketunban") {
      await handleTicketBanCommand(message, args, false);
      return;
    }

    if (normalizedCommand !== ".ticket") return;
    if (message.author.id !== config.ticketCommandUserId) return;

    await sendTicketPanel(message.channel);
    await message.delete().catch(() => null);
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.guild) return;

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("clan_request_")) {
        const match = interaction.customId.match(/^clan_request_(approve|reject)_(.+)$/);
        if (!match) {
          await interaction.reply({ content: "Invalid clan request action.", ephemeral: true });
          return;
        }

        await handleClanRequestDecision(interaction, match[1], match[2]);
        return;
      }

      if (interaction.customId.startsWith("ticket_open_")) {
        const ticketType = interaction.customId.replace("ticket_open_", "");
        const info = ticketTypes[ticketType];

        if (!info) {
          await interaction.reply({ content: "Invalid ticket type.", ephemeral: true });
          return;
        }

        if (!(await canOpenTicketPanel(interaction.guild, interaction.user.id))) {
          await interaction.reply({ content: "You need the ticket access role to open a ticket.", ephemeral: true });
          return;
        }

        const block = await getTicketOpenBlock(interaction.guild, interaction.user.id);
        if (block) {
          await interaction.reply({ content: block.content, ephemeral: true });
          return;
        }

        if (ticketType === "clan") {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(info.color)
                .setTitle("Clan Request")
                .setDescription(`\n\n${clanRequirementsText}`),
            ],
            components: [clanRequestReasonMenu()],
            ephemeral: true,
          });
          return;
        }

        if (ticketType === "reportMember") {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(info.color)
                .setTitle("Report Member")
                .setDescription("Choose the reason for your report."),
            ],
            components: [reportMemberReasonMenu()],
            ephemeral: true,
          });
          return;
        }

        await interaction.showModal(buildTicketModal(ticketType, info));
        return;
      }

      if (interaction.customId === "ticket_claim") {
        if (!isTicketChannel(interaction.channel) || isTicketClosed(interaction.channel)) {
          await interaction.reply({ content: "This ticket is already closed or invalid.", ephemeral: true });
          return;
        }

        if (!(await isStaff(interaction.guild, interaction.user.id, interaction))) {
          await interaction.reply({ content: "Only staff can claim tickets.", ephemeral: true });
          return;
        }

        const alreadyClaimed = getTopicValue(interaction.channel.topic, "ticket-claimed");
        if (alreadyClaimed) {
          await interaction.reply({ content: `Already claimed by <@${alreadyClaimed}>.`, ephemeral: true });
          return;
        }

        const topic = setTopicValue(interaction.channel.topic, "ticket-claimed", interaction.user.id);
        await interaction.channel.setTopic(topic).catch(() => null);

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf1c40f)
              .setTitle("Ticket Claimed")
              .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.`)
              .setTimestamp(),
          ],
        });

        await sendTicketLog(interaction.guild, {
          embeds: [
            new EmbedBuilder()
              .setColor(0xf1c40f)
              .setTitle("Ticket Claimed")
              .addFields(
                { name: "Staff", value: `<@${interaction.user.id}>`, inline: true },
                { name: "Ticket", value: `<#${interaction.channel.id}>`, inline: true }
              )
              .setTimestamp(),
          ],
        }, interaction.channel.id);

        return;
      }

      if (interaction.customId === "ticket_close") {
        if (!isTicketChannel(interaction.channel)) {
          await interaction.reply({ content: "This is not a ticket channel.", ephemeral: true });
          return;
        }

        if (isTicketClosed(interaction.channel)) {
          await interaction.reply({ content: "This ticket is already closed.", ephemeral: true });
          return;
        }

        const canClose =
          isTicketOwner(interaction.channel, interaction.user.id) ||
          (await isStaff(interaction.guild, interaction.user.id, interaction));

        if (!canClose) {
          await interaction.reply({ content: "You cannot close this ticket.", ephemeral: true });
          return;
        }

        const row = new ActionRowBuilder().addComponents(
          addButtonEmoji(
            new ButtonBuilder()
              .setCustomId("ticket_close_confirm")
              .setLabel("Confirm Close")
              .setStyle(ButtonStyle.Danger),
            buttonEmojis.confirmClose
          )
        );

        await interaction.reply({
          content: "Are you sure you want to close this ticket?",
          components: [row],
          ephemeral: true,
        });

        return;
      }

      if (interaction.customId === "ticket_close_confirm") {
        await closeTicket(interaction);
        return;
      }

      if (interaction.customId === "ticket_delete") {
        if (!isTicketChannel(interaction.channel)) {
          await interaction.reply({ content: "This is not a ticket channel.", ephemeral: true });
          return;
        }

        if (!(await isStaff(interaction.guild, interaction.user.id, interaction))) {
          await interaction.reply({ content: "Only staff can delete tickets.", ephemeral: true });
          return;
        }

        const row = new ActionRowBuilder().addComponents(
          addButtonEmoji(
            new ButtonBuilder()
              .setCustomId("ticket_delete_confirm")
              .setLabel("Confirm Delete")
              .setStyle(ButtonStyle.Danger),
            buttonEmojis.confirmDelete
          )
        );

        await interaction.reply({
          content: "Are you sure you want to delete this ticket?",
          components: [row],
          ephemeral: true,
        });

        return;
      }

      if (interaction.customId === "ticket_delete_confirm") {
        await deleteTicket(interaction);
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "ticket_select_report_member") {
        const reason = getChoiceOption(reportMemberReasons, interaction.values[0]);
        await interaction.deferReply({ ephemeral: true });
        await openTicket(
          interaction,
          "reportMember",
          `Report Member: ${reason.label}`,
          `Selected reason: ${reason.label}${reason.description ? `\n${reason.description}` : ""}`
        );
        return;
      }

      if (interaction.customId === "ticket_select_clan_request") {
        const reason = getChoiceOption(clanRequestReasons, interaction.values[0]);
        await sendClanApprovalRequest(interaction, reason);
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (!interaction.customId.startsWith("ticket_modal_")) return;

      const ticketType = interaction.customId.replace("ticket_modal_", "");
      const info = ticketTypes[ticketType];
      if (!info) return;

      await interaction.deferReply({ ephemeral: true });

      const subject =
        ticketType === "support"
          ? defaultTicketSubject(ticketType)
          : interaction.fields.getTextInputValue("ticket_subject");

      const details =
        ticketType === "general"
          ? ""
          : interaction.fields.getTextInputValue("ticket_details");

      await openTicket(interaction, ticketType, subject, details);
    }
  } catch (error) {
    console.error(error);

    const message = "Something went wrong. Check the bot console.";

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
    }
  }
});

}

module.exports = { registerTicket };
