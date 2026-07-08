import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { backgrounds } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dataFile = path.resolve(projectRoot, process.env.DATA_FILE ?? './data/store.json');

const storeSchemaVersion = 2;

function emptyStore() {
  return { schemaVersion: storeSchemaVersion, guilds: {} };
}

function loadStore() {
  if (!fs.existsSync(dataFile)) return emptyStore();

  try {
    return migrateStore(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
  } catch {
    return emptyStore();
  }
}


function migrateStore(loadedStore) {
  const safeStore = loadedStore && typeof loadedStore === 'object' ? loadedStore : emptyStore();
  safeStore.guilds ??= {};

  if ((safeStore.schemaVersion ?? 1) < storeSchemaVersion) {
    for (const guild of Object.values(safeStore.guilds)) {
      if (!guild?.users) continue;
      for (const user of Object.values(guild.users)) {
        if (!user || typeof user !== 'object') continue;
        user.backgroundIndex = mapLegacyBackgroundIndex(user.backgroundIndex);
      }
    }
    safeStore.schemaVersion = storeSchemaVersion;
  }

  return safeStore;
}

function mapLegacyBackgroundIndex(backgroundIndex) {
  const legacyIndex = Number(backgroundIndex);

  // Old themes were: 0 White, 1 Black, 2 Blue, 3 Pink, 4 Yellow.
  // New themes are: 0 Yellow, 1 Pink, 2 White. Blue/Black are removed.
  if (legacyIndex === 0) return 2;
  if (legacyIndex === 3) return 1;
  return 0;
}

let store = loadStore();

let saveTimeout = null;
async function saveStore() {
  await fs.promises.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.promises.writeFile(dataFile, JSON.stringify(store, null, 2));
}
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveStore().catch(err => console.error('Leveling store save error:', err));
  }, 5000);
}

function ensureGuild(guildId) {
  store.schemaVersion ??= storeSchemaVersion;
  store.guilds[guildId] ??= { users: {} };
  return store.guilds[guildId];
}

function ensureUser(guildId, userId) {
  const guild = ensureGuild(guildId);
  guild.users[userId] ??= {
    textXp: 0,
    voiceXp: 0,
    backgroundIndex: 0,
    lastMessageAt: 0
  };
  normalizeUser(guild.users[userId]);
  return guild.users[userId];
}

function normalizeUser(user) {
  user.textXp ??= user.xp ?? 0;
  user.voiceXp ??= 0;
  user.backgroundIndex = clampBackgroundIndex(user.backgroundIndex ?? 0);
  user.lastMessageAt ??= 0;
}

export function getUserStats(guildId, userId) {
  return ensureUser(guildId, userId);
}

export function addXp(guildId, userId, amount, now = Date.now()) {
  return addTextXp(guildId, userId, amount, now);
}

export function addTextXp(guildId, userId, amount, now = Date.now()) {
  const user = ensureUser(guildId, userId);
  user.textXp += amount;
  user.lastMessageAt = now;
  debouncedSave();
  return user;
}

export function addVoiceXp(guildId, userId, amount) {
  const user = ensureUser(guildId, userId);
  user.voiceXp += amount;
  debouncedSave();
  return user;
}

export function canEarnXp(guildId, userId, cooldownMs, now = Date.now()) {
  const user = ensureUser(guildId, userId);
  return now - user.lastMessageAt >= cooldownMs;
}

export function getRank(guildId, userId) {
  const guild = ensureGuild(guildId);
  const rows = Object.entries(guild.users)
    .map(([id, stats]) => {
      normalizeUser(stats);
      return [id, stats];
    })
    .sort((a, b) => totalXp(b[1]) - totalXp(a[1]));
  const rank = rows.findIndex(([id]) => id === userId);
  return rank === -1 ? rows.length + 1 : rank + 1;
}

export function getTopUsers(guildId, limit = 10) {
  const guild = ensureGuild(guildId);
  return Object.entries(guild.users)
    .map(([userId, stats]) => {
      normalizeUser(stats);
      return [userId, stats];
    })
    .sort((a, b) => totalXp(b[1]) - totalXp(a[1]))
    .slice(0, limit)
    .map(([userId, stats], index) => ({
      userId,
      rank: index + 1,
      textXp: stats.textXp,
      voiceXp: stats.voiceXp,
      xp: totalXp(stats)
    }));
}

export async function setBackground(guildId, userId, backgroundIndex) {
  const user = ensureUser(guildId, userId);
  user.backgroundIndex = clampBackgroundIndex(backgroundIndex);
  await saveStore();
  return user.backgroundIndex;
}

export async function cycleBackground(guildId, userId) {
  const user = ensureUser(guildId, userId);
  user.backgroundIndex = (user.backgroundIndex + 1) % backgrounds.length;
  await saveStore();
  return user.backgroundIndex;
}

function clampBackgroundIndex(backgroundIndex) {
  if (!Number.isFinite(backgroundIndex)) return 0;
  return Math.min(Math.max(0, backgroundIndex), backgrounds.length - 1);
}

function totalXp(stats) {
  return (stats.textXp ?? stats.xp ?? 0) + (stats.voiceXp ?? 0);
}
