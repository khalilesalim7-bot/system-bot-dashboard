import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

app.use(session({
  secret: DASHBOARD_PASSWORD + '-dash-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- helpers ----------
const BOT_DIR = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(BOT_DIR, 'modules');
const ENV_FILE = path.join(BOT_DIR, '.env');

function readJson(...parts) {
  try {
    const p = path.join(...parts);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  } catch (e) { return null; }
}
function writeJson(data, ...parts) {
  const p = path.join(...parts);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

const SAFE_ENV_KEYS = [
  'GUILD_ID', 'DISCORD_GUILD_ID', 'STAFF_ROLE_ID', 'GENERAL_CATEGORY_ID',
  'SUPPORT_CATEGORY_ID', 'CLAN_CATEGORY_ID', 'CLOSED_CATEGORY_ID',
  'LOG_CATEGORY_ID', 'LOG_CHANNEL_ID', 'BAN_LOG_CHANNEL_ID',
  'CLAN_REQUEST_CHANNEL_ID', 'CONTROL_PANEL_CHANNEL', 'VERIFICATION_LOG_CHANNEL',
  'BLACKLIST_LOG_CHANNEL', 'VOICE_LOG_CHANNEL', 'NOT_VERIFIED_ROLE', 'MAN_ROLE',
  'GIRL_ROLE', 'VERIFIED_ROLE', 'STAFF_ROLE', 'ALLOWED_VOICES',
  'ALLOWED_COMMAND_CHANNELS', 'VERIFY_LOCK_MINUTES', 'VERIFICATION_TEAM_ROLE',
  'NOTIFICATION_ROLE', 'VERIFICATION_CATEGORY', 'XP_MIN', 'XP_MAX',
  'XP_COOLDOWN_SECONDS', 'VOICE_XP_PER_MINUTE', 'VOICE_AWARD_SECONDS',
  'NO_XP_ROLE_ID', 'ROLE_DRAGON_LORD_ID', 'ROLE_BLACK_VOID_ID',
  'ROLE_CRIMSON_WARD_ID', 'ROLE_SAPPHIRE_ACOLYTE_ID', 'ROLE_VOID_ID',
  'ROLE_WRITER_MASTER_ID', 'ROLE_VOICE_MASTER_ID', 'TICKET_OPEN_ROLE_ID',
  'CLAN_ROLE_PARENT_ID', 'GIRLS_VERIFICATION_VOICES', 'GIRLS_VOICE_LOG_CHANNEL',
  'VERIFICATION_NOTIFY_COOLDOWN_SECONDS', 'SYSTEM_VOICE_CHANNEL_ID',
  'GIF_PERMISSION_PANEL_CHANNEL_ID', 'GIF_PERMISSION_LOG_CHANNEL_ID',
  'COMMAND_PREFIX', 'BOOST_THANKS_CHANNEL_ID', 'PANEL_CHANNEL_ID',
  'BOOSTER_ROLE_ID', 'CUSTOM_ROLE_BELOW_ID', 'CAN_RECREATE_ROLE_ID',
  'DELETE_ROLE_WHEN_BOOST_LOST', 'PANEL_BANNER_URL', 'TICKET_BANNER_URL',
  'TRANSCRIPT_LIMIT', 'AUTO_CLOSE_DAYS', 'AUTO_CLOSE_CHECK_MINUTES',
  'TICKET_COMMAND_USER_ID', 'VERIFICATION_TEAM_ROLE', 'NOTIFICATION_ROLE',
  'VERIFICATION_CATEGORY', 'STAFF_APPLY_CHANNEL_ID', 'DASHBOARD_PORT',
  'DASHBOARD_PASSWORD'
];

function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && val) env[key] = val;
  }
  return env;
}

function writeEnv(updates) {
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  const existing = readEnv();
  for (const [key, val] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${val}`);
    } else {
      content += `\n${key}=${val}`;
    }
    existing[key] = val;
  }
  fs.writeFileSync(ENV_FILE, content.trim() + '\n', 'utf8');
}

// ---------- Bot Process Management ----------
let botProcess = null;
let botStartedAt = null;
const logBuffer = [];
const MAX_LOG_LINES = 500;
let botStatus = 'offline'; // offline | starting | online | error

function startBot() {
  if (botProcess) { try { botProcess.kill(); } catch {} }
  
  botStatus = 'starting';
  const botEntry = path.join(BOT_DIR, 'index.js');
  
  if (!fs.existsSync(botEntry)) {
    addLog('ERROR', `Bot entry not found: ${botEntry}`);
    botStatus = 'error';
    return;
  }
  
  botProcess = spawn('node', [botEntry], {
    cwd: BOT_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  
  botStartedAt = Date.now();
  addLog('INFO', `Bot process started (PID: ${botProcess.pid})`);
  
  botProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => addLog('BOT', line));
    if (lines.some(l => l.toLowerCase().includes('online') || l.toLowerCase().includes('ready'))) {
      botStatus = 'online';
    }
  });
  
  botProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => addLog('ERR', line));
  });
  
  botProcess.on('error', (err) => {
    addLog('ERROR', `Bot process error: ${err.message}`);
    botStatus = 'error';
    botProcess = null;
  });
  
  botProcess.on('exit', (code, signal) => {
    addLog('INFO', `Bot process exited (code: ${code}, signal: ${signal})`);
    botStatus = code === 0 ? 'offline' : 'error';
    botProcess = null;
    // Auto-restart after 3 seconds if crashed
    if (code !== 0 && signal !== 'SIGTERM') {
      addLog('INFO', 'Auto-restarting bot in 3 seconds...');
      setTimeout(startBot, 3000);
    }
  });
}

function stopBot() {
  if (botProcess) {
    addLog('INFO', 'Stopping bot process...');
    botProcess.kill('SIGTERM');
    botProcess = null;
    botStatus = 'offline';
  }
}

function restartBot() {
  addLog('INFO', 'Restarting bot...');
  stopBot();
  setTimeout(startBot, 1000);
}

function addLog(level, message) {
  const entry = `[${new Date().toLocaleTimeString()}] [${level}] ${message}`;
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
  console.log(entry);
}

// ---------- Bot Status Route ----------
app.get('/bot-status', (req, res) => {
  const uptime = botStartedAt ? Math.floor((Date.now() - botStartedAt) / 1000) : 0;
  const uptimeStr = uptime > 0
    ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`
    : '-';
  res.json({
    status: botStatus,
    pid: botProcess?.pid || null,
    uptime: uptimeStr,
    uptimeSeconds: uptime,
    startedAt: botStartedAt,
    logs: logBuffer.slice(-100)
  });
});

app.post('/bot/start', (req, res) => {
  startBot();
  res.json({ status: 'starting' });
});

app.post('/bot/stop', (req, res) => {
  stopBot();
  res.json({ status: 'stopped' });
});

app.post('/bot/restart', (req, res) => {
  restartBot();
  res.json({ status: 'restarting' });
});

// Start bot when dashboard launches
setTimeout(startBot, 2000);

// Middleware
app.use((req, res, next) => {
  res.locals.PORT = PORT;
  res.locals.query = req.query;
  res.locals.path = req.path;
  next();
});

function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  if (req.path === '/login' || req.path === '/') return next();
  res.redirect('/login');
}
app.use(requireAuth);

// ---------- Auth routes ----------
app.get('/', (req, res) => {
  if (req.session?.authenticated) return res.redirect('/dashboard');
  res.render('login', { error: null });
});
app.get('/login', (req, res) => {
  if (req.session?.authenticated) return res.redirect('/dashboard');
  res.render('login', { error: null });
});
app.post('/login', (req, res) => {
  if (req.body.password === DASHBOARD_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect('/dashboard');
  }
  res.render('login', { error: 'Wrong password' });
});
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ---------- Bot Control Page ----------
app.get('/bot', (req, res) => {
  res.render('bot');
});

// ---------- Dashboard ----------
app.get('/dashboard', (req, res) => {
  const env = readEnv();
  const modules = fs.readdirSync(MODULES_DIR).filter(f =>
    fs.statSync(path.join(MODULES_DIR, f)).isDirectory()
  );
  const envCount = Object.keys(env).length;
  res.render('dashboard', { env, modules, envCount });
});

// ======================== VERIFICATION ========================
app.get('/verification', (req, res) => {
  const verDir = path.join(MODULES_DIR, 'verification');
  const blacklist = readJson(verDir, 'blacklist.json') || [];
  const history = readJson(verDir, 'verification_history.json') || [];
  const counter = readJson(verDir, 'verification_count.json') || {};
  const totalVerifications = Object.values(counter).reduce((a, b) => a + b, 0);
  const env = readEnv();
  const verEnv = {};
  for (const k of ['CONTROL_PANEL_CHANNEL', 'VERIFICATION_LOG_CHANNEL', 'BLACKLIST_LOG_CHANNEL', 'VOICE_LOG_CHANNEL', 'NOT_VERIFIED_ROLE', 'MAN_ROLE', 'GIRL_ROLE', 'VERIFIED_ROLE', 'STAFF_ROLE', 'ALLOWED_VOICES', 'VERIFY_LOCK_MINUTES', 'VERIFICATION_TEAM_ROLE', 'VERIFICATION_CATEGORY', 'VERIFICATION_NOTIFY_COOLDOWN_SECONDS', 'GIRLS_VERIFICATION_VOICES', 'GIRLS_VOICE_LOG_CHANNEL']) {
    if (env[k]) verEnv[k] = env[k];
  }
  res.render('verification', { blacklist, history, counter, totalVerifications, verEnv });
});

app.post('/verification/blacklist/add', (req, res) => {
  const verDir = path.join(MODULES_DIR, 'verification');
  const blacklist = readJson(verDir, 'blacklist.json') || [];
  const { userId, reason } = req.body;
  if (!userId) return res.redirect('/verification?error=Missing+user+ID');
  blacklist.push({ id: userId.trim(), reason: reason || '', moderatorId: 'dashboard', createdAt: new Date().toISOString() });
  writeJson(blacklist, verDir, 'blacklist.json');
  res.redirect('/verification?msg=Added+to+blacklist');
});

app.post('/verification/blacklist/remove', (req, res) => {
  const verDir = path.join(MODULES_DIR, 'verification');
  let blacklist = readJson(verDir, 'blacklist.json') || [];
  const { userId } = req.body;
  blacklist = blacklist.filter(b => b.id !== userId);
  writeJson(blacklist, verDir, 'blacklist.json');
  res.redirect('/verification?msg=Removed+from+blacklist');
});

app.post('/verification/save', (req, res) => {
  const updates = {};
  for (const k of ['CONTROL_PANEL_CHANNEL', 'VERIFICATION_LOG_CHANNEL', 'BLACKLIST_LOG_CHANNEL', 'VOICE_LOG_CHANNEL', 'NOT_VERIFIED_ROLE', 'MAN_ROLE', 'GIRL_ROLE', 'VERIFIED_ROLE', 'STAFF_ROLE', 'ALLOWED_VOICES', 'VERIFY_LOCK_MINUTES', 'VERIFICATION_TEAM_ROLE', 'VERIFICATION_CATEGORY', 'VERIFICATION_NOTIFY_COOLDOWN_SECONDS', 'GIRLS_VERIFICATION_VOICES', 'GIRLS_VOICE_LOG_CHANNEL']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  writeEnv(updates);
  res.redirect('/verification?msg=Settings+saved');
});

// ======================== LEVELING ========================
app.get('/leveling', (req, res) => {
  const dataDir = path.join(MODULES_DIR, 'leveling/data');
  let store = readJson(dataDir, 'store.json') || readJson(BOT_DIR, 'data', 'leveling', 'store.json') || { users: {} };
  const users = Object.entries(store.users || {}).map(([id, s]) => ({
    id, ...s,
    totalXp: (s.textXp || 0) + (s.voiceXp || 0)
  })).sort((a, b) => b.totalXp - a.totalXp);
  const env = readEnv();
  res.render('leveling', { users, total: users.length, env });
});

app.post('/leveling/save', (req, res) => {
  const updates = {};
  for (const k of ['XP_MIN', 'XP_MAX', 'XP_COOLDOWN_SECONDS', 'VOICE_XP_PER_MINUTE', 'VOICE_AWARD_SECONDS', 'NO_XP_ROLE_ID', 'ROLE_DRAGON_LORD_ID', 'ROLE_BLACK_VOID_ID', 'ROLE_CRIMSON_WARD_ID', 'ROLE_SAPPHIRE_ACOLYTE_ID', 'ROLE_VOID_ID', 'ROLE_WRITER_MASTER_ID', 'ROLE_VOICE_MASTER_ID']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  writeEnv(updates);
  res.redirect('/leveling?msg=Saved');
});

// ======================== BOOSTER ========================
app.get('/booster', (req, res) => {
  const boosters = readJson(MODULES_DIR, 'booster', 'data.json') || { boosters: {} };
  const list = Object.entries(boosters.boosters || {}).map(([id, d]) => ({ id, ...d }));
  const env = readEnv();
  res.render('booster', { boosters: list, env });
});

app.post('/booster/save', (req, res) => {
  const updates = {};
  for (const k of ['COMMAND_PREFIX', 'BOOST_THANKS_CHANNEL_ID', 'PANEL_CHANNEL_ID', 'BOOSTER_ROLE_ID', 'CUSTOM_ROLE_BELOW_ID', 'CAN_RECREATE_ROLE_ID', 'DELETE_ROLE_WHEN_BOOST_LOST']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  writeEnv(updates);
  res.redirect('/booster?msg=Saved');
});

// ======================== CLANS ========================
app.get('/clans', (req, res) => {
  const sysDir = path.join(MODULES_DIR, 'system');
  const clanConfig = readJson(sysDir, 'clanConfig.json') || [];
  const clanPoints = readJson(sysDir, 'clanPoints.json') || {};
  const clanPanels = readJson(sysDir, 'clanPanels.json') || {};
  const sections = Array.isArray(clanConfig) ? clanConfig : [];
  const channels = sections.flatMap(s => s.channels || []);
  const validClans = channels.filter(c => c.id !== 'EMPTY');
  const env = readEnv();
  res.render('clans', { clans: validClans, clanPoints, clanPanels, sections, env });
});

app.post('/clans/save', (req, res) => {
  const updates = {};
  for (const k of ['CLAN_ROLE_PARENT_ID', 'CLAN_CATEGORY_ID']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  writeEnv(updates);
  res.redirect('/clans?msg=Saved');
});

// ======================== TICKET ========================
app.get('/ticket', (req, res) => {
  const data = readJson(MODULES_DIR, 'ticket', 'ticket-data.json') || {};
  const tickets = Object.entries(data.tickets || {}).map(([id, t]) => ({ id, ...t }));
  const env = readEnv();
  res.render('ticket', { tickets, env });
});

app.post('/ticket/save', (req, res) => {
  const updates = {};
  for (const k of ['PANEL_BANNER_URL', 'TICKET_BANNER_URL', 'TRANSCRIPT_LIMIT', 'AUTO_CLOSE_DAYS', 'AUTO_CLOSE_CHECK_MINUTES', 'TICKET_COMMAND_USER_ID', 'STAFF_ROLE_ID', 'TICKET_OPEN_ROLE_ID', 'GENERAL_CATEGORY_ID', 'SUPPORT_CATEGORY_ID', 'CLAN_CATEGORY_ID', 'CLOSED_CATEGORY_ID', 'LOG_CATEGORY_ID', 'LOG_CHANNEL_ID']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  writeEnv(updates);
  res.redirect('/ticket?msg=Saved');
});

// ======================== SYSTEM ========================
app.get('/system', (req, res) => {
  const config = readJson(MODULES_DIR, 'system', 'config.json') || {};
  const env = readEnv();
  res.render('system', { config, env });
});

app.post('/system/save-config', (req, res) => {
  const config = readJson(MODULES_DIR, 'system', 'config.json') || {};
  if (req.body.prefix !== undefined) config.prefix = req.body.prefix;
  if (req.body.ownerID !== undefined) config.ownerID = req.body.ownerID;
  if (req.body.securityChannel !== undefined) config.securityChannel = req.body.securityChannel;
  if (req.body.TOP_5_ROLE !== undefined) config.TOP_5_ROLE = req.body.TOP_5_ROLE;
  if (req.body.TOP_100K_ROLE !== undefined) config.TOP_100K_ROLE = req.body.TOP_100K_ROLE;
  if (req.body.TOP_200K_ROLE !== undefined) config.TOP_200K_ROLE = req.body.TOP_200K_ROLE;
  writeJson(config, MODULES_DIR, 'system', 'config.json');
  res.redirect('/system?msg=Config+saved');
});

app.post('/system/save-env', (req, res) => {
  const updates = {};
  for (const k of ['TICKET_COMMAND_USER_ID', 'STAFF_ROLE_ID']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  writeEnv(updates);
  res.redirect('/system?msg=Saved');
});

// ======================== LOGS ========================
app.get('/logs', (req, res) => {
  const history = readJson(MODULES_DIR, 'verification', 'verification_history.json') || [];
  const recent = history.slice(-200).reverse();
  res.render('logs', { logs: recent });
});

// ======================== SETTINGS (.env) ========================
app.get('/settings', (req, res) => {
  const env = readEnv();
  res.render('settings', { env, safeKeys: SAFE_ENV_KEYS });
});

app.post('/settings/save', (req, res) => {
  const updates = {};
  for (const key of SAFE_ENV_KEYS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  writeEnv(updates);
  res.redirect('/settings?msg=Saved');
});

// ======================== 404 ========================
app.use((req, res) => {
  res.status(404).send('Not found - <a href="/dashboard">Back to dashboard</a>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard: http://0.0.0.0:${PORT}`);
  console.log(`Password: ${DASHBOARD_PASSWORD}`);
});
