export const xpMin = Number.parseInt(process.env.XP_MIN ?? '2', 10);
export const xpMax = Number.parseInt(process.env.XP_MAX ?? '6', 10);
export const xpCooldownMs = Number.parseInt(process.env.XP_COOLDOWN_SECONDS ?? '120', 10) * 1000;
export const voiceXpPerMinute = Number.parseInt(process.env.VOICE_XP_PER_MINUTE ?? '6', 10);
export const voiceAwardIntervalMs = Number.parseInt(process.env.VOICE_AWARD_SECONDS ?? '60', 10) * 1000;
export const xpRequiredRoleId = process.env.XP_REQUIRED_ROLE_ID ?? '1417802580645380176';
export const noXpRoleId = process.env.NO_XP_ROLE_ID ?? '1417802526773743616';

export const levelRoleRewards = [
  {
    name: 'Dragon Lord',
    roleId: process.env.ROLE_DRAGON_LORD_ID ?? '',
    textLevel: 32,
    voiceLevel: 38
  },
  {
    name: 'Black Void',
    roleId: process.env.ROLE_BLACK_VOID_ID ?? '',
    textLevel: 22,
    voiceLevel: 25
  },
  {
    name: 'Crimson Ward',
    roleId: process.env.ROLE_CRIMSON_WARD_ID ?? '',
    textLevel: 14,
    voiceLevel: 17
  },
  {
    name: 'Sapphire Acolyte',
    roleId: process.env.ROLE_SAPPHIRE_ACOLYTE_ID ?? '',
    textLevel: 11,
    voiceLevel: 13
  },
  {
    name: 'Void',
    roleId: process.env.ROLE_VOID_ID ?? '',
    textLevel: 1,
    voiceLevel: 1
  }
];

export const activityRoleRewards = [
  {
    name: 'Writer Master',
    roleId: process.env.ROLE_WRITER_MASTER_ID ?? '',
    type: 'text',
    level: 22
  },
  {
    name: 'Voice Master',
    roleId: process.env.ROLE_VOICE_MASTER_ID ?? '',
    type: 'voice',
    level: 25
  }
];

export const rewardRoleIds = [
  ...levelRoleRewards,
  ...activityRoleRewards
].map((reward) => reward.roleId).filter(Boolean);

export const backgrounds = [
  {
    id: 'yellow',
    name: 'Yellow Gold',
    watermark: 'GOLD MODE',
    start: '#120d02',
    end: '#3b2705',
    accent: '#fbbf24',
    accent2: '#fde68a',
    text: '#fffbed',
    muted: '#fde68a',
    panel: 'rgba(35, 24, 7, 0.88)',
    panel2: 'rgba(10, 8, 3, 0.96)',
    stroke: 'rgba(253, 230, 138, 0.24)',
    light: false
  },
  {
    id: 'pink',
    name: 'Pink Aura',
    watermark: 'PINK MODE',
    start: '#160414',
    end: '#4a1031',
    accent: '#ff5ea8',
    accent2: '#f9a8d4',
    text: '#fff7fb',
    muted: '#f9a8d4',
    panel: 'rgba(38, 8, 30, 0.86)',
    panel2: 'rgba(13, 5, 12, 0.96)',
    stroke: 'rgba(249, 168, 212, 0.24)',
    light: false
  },
  {
    id: 'white',
    name: 'White Clean',
    watermark: 'WHITE MODE',
    start: '#f8fafc',
    end: '#fff7ed',
    accent: '#f59e0b',
    accent2: '#fbbf24',
    text: '#0f172a',
    muted: '#57534e',
    panel: 'rgba(255, 255, 255, 0.88)',
    panel2: 'rgba(255, 251, 235, 0.94)',
    stroke: 'rgba(120, 53, 15, 0.14)',
    light: true
  }
];

export function xpNeededForLevel(level) {
  return 250 + level * 140;
}

export function levelFromTotalXp(totalXp) {
  let level = 1;
  let remaining = Math.max(0, totalXp);

  while (remaining >= xpNeededForLevel(level)) {
    remaining -= xpNeededForLevel(level);
    level += 1;
  }

  return {
    level,
    currentXp: remaining,
    nextXp: xpNeededForLevel(level)
  };
}

export function getProfileLevels(stats) {
  const text = levelFromTotalXp(stats.textXp ?? stats.xp ?? 0);
  const voice = levelFromTotalXp(stats.voiceXp ?? 0);
  const total = levelFromTotalXp((stats.textXp ?? stats.xp ?? 0) + (stats.voiceXp ?? 0));

  return { text, voice, total };
}

export function getEligibleRewardRoleIds(stats) {
  const levels = getProfileLevels(stats);
  const eligible = [];

  for (const reward of levelRoleRewards) {
    if (!reward.roleId) continue;
    if (levels.text.level >= reward.textLevel || levels.voice.level >= reward.voiceLevel) {
      eligible.push(reward.roleId);
      break;
    }
  }

  for (const reward of activityRoleRewards) {
    if (!reward.roleId) continue;
    const level = reward.type === 'voice' ? levels.voice.level : levels.text.level;
    if (level >= reward.level) {
      eligible.push(reward.roleId);
    }
  }

  return eligible;
}
