import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} from 'discord.js';
import {
  backgrounds,
  getEligibleRewardRoleIds,
  noXpRoleId,
  rewardRoleIds,
  voiceAwardIntervalMs,
  voiceXpPerMinute,
  xpRequiredRoleId,
  xpCooldownMs,
  xpMax,
  xpMin
} from './config.js';
import { renderLeaderboardCard, renderRankCard } from './card.js';
import {
  addTextXp,
  addVoiceXp,
  canEarnXp,
  cycleBackground,
  getRank,
  getTopUsers,
  getUserStats,
  setBackground
} from './store.js';

const allowedLevelingCommandChannelIds = new Set([
  '1471133005928992839',
  '1417802780630061097',
  '1417802697234579488'
]);

export function registerLeveling(client) {
const voiceSessions = new Map();
const warnedMissingRoleIds = new Set();

client.once(Events.ClientReady, (readyClient) => {
  seedVoiceSessions(readyClient);
  setInterval(() => {
    awardActiveVoiceXp().catch(console.error);
  }, safeInterval(voiceAwardIntervalMs));
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;

    if (member && memberHasNoXpRole(member)) {
      await removeConfiguredRewardRoles(member, 'No XP role');
      return;
    }
    if (!memberHasRequiredXpRole(member)) return;

    if (!canEarnXp(message.guild.id, message.author.id, xpCooldownMs)) return;

    const xp = randomInt(xpMin, xpMax);
    const stats = await addTextXp(message.guild.id, message.author.id, xp);
    await syncRewardRoles(member, stats);
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    await handleVoiceStateUpdate(oldState, newState);
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.GuildMemberUpdate, async (_oldMember, newMember) => {
  try {
    await handleMemberRoleUpdate(newMember);
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (error) {
    console.error(error);
    await sendError(interaction);
  }
});

async function handleCommand(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: 'Use this command inside a server.', ephemeral: true });
    return;
  }

  if (!allowedLevelingCommandChannelIds.has(interaction.channelId)) {
    await interaction.reply({
      content: 'Leveling commands only work in the allowed rank channels.',
      ephemeral: true
    });
    return;
  }

  console.log(`/${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild.name}`);

  if (interaction.commandName === 'rank') {
    await interaction.deferReply();
    await interaction.editReply(await buildRankReply(interaction.guild.id, interaction.user));
    return;
  }

  if (interaction.commandName === 'rankuser') {
    await interaction.deferReply();
    const target = interaction.options.getUser('user', true);
    await interaction.editReply(await buildRankReply(interaction.guild.id, target));
    return;
  }

  if (interaction.commandName === 'leaderboard') {
    await interaction.deferReply();
    await interaction.editReply(await buildLeaderboardReply(interaction.guild));
    return;
  }

  if (interaction.commandName === 'background') {
    const theme = interaction.options.getInteger('theme', true);
    await setBackground(interaction.guild.id, interaction.user.id, theme);
    await interaction.reply({
      content: `Background changed to **${backgrounds[theme].name}**. Use /rank to see it.`,
      ephemeral: true
    });
  }
}

async function handleButton(interaction) {
  const [area, action, ownerId] = interaction.customId.split(':');
  if (area !== 'rank' || action !== 'background') return;

  if (!interaction.guild) {
    await interaction.reply({ content: 'This only works inside a server.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: 'Only the owner of this rank card can change this background.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferUpdate();
  await cycleBackground(interaction.guild.id, interaction.user.id);
  await interaction.editReply({
    ...(await buildRankReply(interaction.guild.id, interaction.user)),
    attachments: []
  });
}

async function buildRankReply(guildId, user) {
  const stats = getUserStats(guildId, user.id);
  const rank = getRank(guildId, user.id);
  const image = await renderRankCard({ user, stats, rank });
  const attachment = new AttachmentBuilder(image, { name: `rank-${user.id}.png` });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rank:background:${user.id}`)
      .setLabel('Change background')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    files: [attachment],
    components: [row]
  };
}

async function buildLeaderboardReply(guild) {
  const topUsers = getTopUsers(guild.id, 10);
  const entries = await Promise.all(
    topUsers.map((row) => resolveLeaderboardEntry(guild, row))
  );
  const image = await renderLeaderboardCard({ guild, entries });
  const attachment = new AttachmentBuilder(image, { name: `leaderboard-${guild.id}.png` });

  return {
    files: [attachment]
  };
}

async function resolveLeaderboardEntry(guild, row) {
  const member = await guild.members.fetch(row.userId).catch(() => null);
  const user = member?.user ?? await guild.client.users.fetch(row.userId).catch(() => null);

  return {
    ...row,
    member,
    user,
    displayName: member?.displayName ?? user?.username ?? `User ${row.userId}`
  };
}

async function sendError(interaction) {
  const payload = {
    content: 'Something went wrong. Check the bot console.',
    ephemeral: true
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to your .env file.`);
  }
  return value;
}

function randomInt(min, max) {
  const safeMin = Number.isFinite(min) ? min : 8;
  const safeMax = Number.isFinite(max) ? max : 16;
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

async function handleVoiceStateUpdate(oldState, newState) {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const key = voiceSessionKey(member.guild.id, member.id);
  if (memberHasNoXpRole(member)) {
    voiceSessions.delete(key);
    await removeConfiguredRewardRoles(member, 'No XP role');
    return;
  }
  if (!memberHasRequiredXpRole(member)) {
    voiceSessions.delete(key);
    return;
  }

  const wasInVoice = Boolean(oldState.channelId);
  const isInVoice = Boolean(newState.channelId);

  if (!wasInVoice && isInVoice) {
    voiceSessions.set(key, { member, lastAwardAt: Date.now() });
    return;
  }

  if (wasInVoice && !isInVoice) {
    const session = voiceSessions.get(key);
    voiceSessions.delete(key);
    if (session) {
      await awardVoiceXpForElapsed(member, Date.now() - session.lastAwardAt);
    }
    return;
  }

  if (wasInVoice && isInVoice) {
    const session = voiceSessions.get(key);
    if (session) {
      session.member = member;
    } else {
      voiceSessions.set(key, { member, lastAwardAt: Date.now() });
    }
  }
}

async function handleMemberRoleUpdate(member) {
  if (!member || member.user.bot) return;

  const key = voiceSessionKey(member.guild.id, member.id);
  if (memberHasNoXpRole(member)) {
    voiceSessions.delete(key);
    await removeConfiguredRewardRoles(member, 'No XP role');
    return;
  }

  if (!memberHasRequiredXpRole(member)) {
    voiceSessions.delete(key);
    return;
  }

  if (!member.voice.channelId) {
    voiceSessions.delete(key);
    return;
  }

  const session = voiceSessions.get(key);
  if (session) {
    session.member = member;
  } else {
    voiceSessions.set(key, { member, lastAwardAt: Date.now() });
  }
}

async function awardActiveVoiceXp() {
  const now = Date.now();

  for (const [key, session] of voiceSessions) {
    if (!session.member.voice.channelId) {
      voiceSessions.delete(key);
      continue;
    }

    if (memberHasNoXpRole(session.member)) {
      voiceSessions.delete(key);
      await removeConfiguredRewardRoles(session.member, 'No XP role');
      continue;
    }
    if (!memberHasRequiredXpRole(session.member)) {
      voiceSessions.delete(key);
      continue;
    }

    const awardedMs = await awardVoiceXpForElapsed(session.member, now - session.lastAwardAt);
    if (awardedMs > 0) {
      session.lastAwardAt += awardedMs;
    }
  }
}

async function awardVoiceXpForElapsed(member, elapsedMs) {
  if (memberHasNoXpRole(member)) {
    await removeConfiguredRewardRoles(member, 'No XP role');
    return 0;
  }
  if (!memberHasRequiredXpRole(member)) return 0;

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes <= 0) return 0;

  const perMinute = Number.isFinite(voiceXpPerMinute) && voiceXpPerMinute > 0 ? voiceXpPerMinute : 20;
  const stats = await addVoiceXp(member.guild.id, member.id, minutes * perMinute);
  await syncRewardRoles(member, stats);
  return minutes * 60_000;
}

async function syncRewardRoles(member, stats) {
  const configuredRoleIds = [...new Set(rewardRoleIds)];
  if (configuredRoleIds.length === 0) return;

  if (memberHasNoXpRole(member)) {
    await removeConfiguredRewardRoles(member, 'No XP role');
    return;
  }

  const eligibleRoleIds = new Set(getEligibleRewardRoleIds(stats));
  const guildRoleIds = new Set(member.guild.roles.cache.keys());
  const missingRoleIds = configuredRoleIds.filter((roleId) => !guildRoleIds.has(roleId));

  for (const roleId of missingRoleIds) {
    if (!warnedMissingRoleIds.has(`${member.guild.id}:${roleId}`)) {
      warnedMissingRoleIds.add(`${member.guild.id}:${roleId}`);
      console.warn(`Configured role ${roleId} was not found in ${member.guild.name}. Check your .env role IDs.`);
    }
  }

  const rolesToAdd = configuredRoleIds.filter((roleId) =>
    guildRoleIds.has(roleId) &&
    eligibleRoleIds.has(roleId) &&
    !member.roles.cache.has(roleId)
  );
  const rolesToRemove = configuredRoleIds.filter((roleId) =>
    guildRoleIds.has(roleId) &&
    !eligibleRoleIds.has(roleId) &&
    member.roles.cache.has(roleId)
  );

  try {
    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd, 'Level reward role');
    }
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove, 'Level reward role no longer matched');
    }
  } catch (error) {
    console.warn(`Level role sync skipped for ${member.user?.tag || member.id}: ${error?.message || error}`);
  }
}

function memberHasNoXpRole(member) {
  return Boolean(noXpRoleId && member.roles.cache.has(noXpRoleId));
}

function memberHasRequiredXpRole(member) {
  return Boolean(!xpRequiredRoleId || member.roles.cache.has(xpRequiredRoleId));
}

async function removeConfiguredRewardRoles(member, reason) {
  const configuredRoleIds = [...new Set(rewardRoleIds)];
  if (configuredRoleIds.length === 0) return;

  const guildRoleIds = new Set(member.guild.roles.cache.keys());
  const rolesToRemove = configuredRoleIds.filter((roleId) =>
    guildRoleIds.has(roleId) &&
    member.roles.cache.has(roleId)
  );

  if (rolesToRemove.length === 0) return;

  try {
    await member.roles.remove(rolesToRemove, reason);
  } catch (error) {
    console.warn(`No-XP reward role cleanup skipped for ${member.user?.tag || member.id}: ${error?.message || error}`);
  }
}

function seedVoiceSessions(readyClient) {
  const now = Date.now();

  for (const guild of readyClient.guilds.cache.values()) {
    for (const voiceState of guild.voiceStates.cache.values()) {
      if (!voiceState.channelId || !voiceState.member || voiceState.member.user.bot) continue;
      if (memberHasNoXpRole(voiceState.member)) continue;
      if (!memberHasRequiredXpRole(voiceState.member)) continue;
      voiceSessions.set(voiceSessionKey(guild.id, voiceState.id), {
        member: voiceState.member,
        lastAwardAt: now
      });
    }
  }
}

function voiceSessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function safeInterval(value) {
  return Number.isFinite(value) && value > 0 ? value : 60_000;
}

}
