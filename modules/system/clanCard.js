const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const W = 1920;
const H = 1080;

const BG_CANDIDATES = [
  path.join(__dirname, 'assets', 'clanboard-bg.png'),
  path.join(__dirname, 'assets', 'clanboard-background.png'),
  path.join(__dirname, 'assets', 'background.png'),
  path.join(__dirname, 'clanboard-bg.png')
];

function formatPoints(points) {
  return Number(points || 0).toLocaleString('en-US');
}

function safeName(value, fallback = 'Unknown') {
  return String(value || fallback)
    .replace(/[@#`*_~|<>]/g, '')
    .trim() || fallback;
}

function getClanName(clan) {
  return safeName(clan?.role?.name || clan?.name || clan?.channel?.name || 'Unknown Clan');
}

function getClanRoleId(clan) {
  return clan?.clanRoleId || clan?.role?.id || null;
}

function getClanPoints(clan) {
  return Number(clan?.points || 0);
}

function getClanMembersCount(guild, clan) {
  const roleId = getClanRoleId(clan);
  if (!guild || !roleId) return 0;
  return guild.members.cache.filter(m => m.roles.cache.has(roleId)).size;
}

function getLevel(points) {
  const p = Number(points || 0);
  if (p >= 5000) return 5;
  if (p >= 3000) return 4;
  if (p >= 2000) return 3;
  if (p >= 1000) return 2;
  return 1;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function hexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawFitText(ctx, text, x, y, maxWidth, font, minSize = 16, align = 'left') {
  let size = Number((font.match(/(\d+)px/) || [0, 24])[1]);
  let finalFont = font;

  while (size > minSize) {
    ctx.font = finalFont;
    if (ctx.measureText(String(text)).width <= maxWidth) break;
    size -= 2;
    finalFont = font.replace(/(\d+)px/, `${size}px`);
  }

  ctx.font = finalFont;
  ctx.textAlign = align;
  ctx.fillText(String(text), x, y);
}

function drawGlowText(ctx, text, x, y, font, color = '#ffffff', glow = 18, align = 'left') {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(255,255,255,0.55)';
  ctx.shadowBlur = glow;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function drawLine(ctx, x1, y1, x2, y2, alpha = 0.35) {
  ctx.save();
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const nw = img.width * scale;
  const nh = img.height * scale;
  const nx = x + (w - nw) / 2;
  const ny = y + (h - nh) / 2;
  ctx.drawImage(img, nx, ny, nw, nh);
}

function fetchBuffer(url, redirects = 4) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        const nextUrl = new URL(res.headers.location, url).toString();
        resolve(fetchBuffer(nextUrl, redirects - 1));
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`Image request failed: ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('Image request timeout')));
  });
}

async function loadImageAny(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) {
    const buffer = await fetchBuffer(src);
    return loadImage(buffer);
  }
  return loadImage(src);
}

async function loadBackground() {
  for (const file of BG_CANDIDATES) {
    if (fs.existsSync(file)) {
      try {
        return await loadImage(file);
      } catch (_) {}
    }
  }
  return null;
}

function drawFallbackBackground(ctx, w = W, h = H) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h));
  g.addColorStop(0, '#303030');
  g.addColorStop(0.35, '#111111');
  g.addColorStop(1, '#020202');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2 + 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, -80, Math.min(w, h) * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

async function drawBackground(ctx) {
  const bg = await loadBackground();
  if (bg) drawCoverImage(ctx, bg, 0, 0, W, H);
  else drawFallbackBackground(ctx, W, H);
  const overlay = ctx.createLinearGradient(0, 0, W, H);
  overlay.addColorStop(0, 'rgba(0,0,0,0.25)');
  overlay.addColorStop(0.45, 'rgba(0,0,0,0.47)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);
  const vignette = ctx.createRadialGradient(W / 2, H / 2, 350, W / 2, H / 2, 1050);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

async function drawBackgroundScaled(ctx, w, h) {
  const bg = await loadBackground();
  if (bg) drawCoverImage(ctx, bg, 0, 0, w, h);
  else drawFallbackBackground(ctx, w, h);
  const overlay = ctx.createLinearGradient(0, 0, w, h);
  overlay.addColorStop(0, 'rgba(0,0,0,0.42)');
  overlay.addColorStop(0.45, 'rgba(0,0,0,0.28)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.50)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, w, h);
  const vignette = ctx.createRadialGradient(w / 2, h / 2, 120, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawGlassPanel(ctx, x, y, w, h, r = 28, alpha = 0.22, borderAlpha = 0.40, glow = 10) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.12, 'rgba(255,255,255,0.08)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0.36)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = `rgba(255,255,255,${Math.min(borderAlpha, 0.45)})`;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = `rgba(255,255,255,${borderAlpha})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  roundRect(ctx, x + 2, y + 2, w - 4, Math.max(10, h * 0.28), r);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fill();
  ctx.restore();
}

function drawLocalGlass(ctx, x, y, w, h, r = 18, alpha = 0.10, borderAlpha = 0.30, glow = 0) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.5, 'rgba(255,255,255,0.035)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = g;
  ctx.fill();
  if (glow > 0) {
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = glow;
  }
  ctx.strokeStyle = `rgba(255,255,255,${borderAlpha})`;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

function drawLocalText(ctx, text, x, y, font, align = 'left') {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255,255,255,0.32)';
  ctx.shadowBlur = 8;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function getMemberDisplay(member) {
  if (!member) return 'None';
  const user = member.user || member;
  return safeName(
    member.displayName ||
    user.globalName ||
    user.username ||
    user.tag ||
    'Unknown User'
  );
}

function getMemberSub(member) {
  if (!member) return 'No user selected';
  const user = member.user || member;
  if (user.username) return `@${safeName(user.username)}`;
  if (member.id || user.id) return `ID: ${member.id || user.id}`;
  return 'Discord member';
}

function getAvatarUrl(member, size = 128) {
  const user = member?.user || member;
  if (!user || typeof user.displayAvatarURL !== 'function') return null;
  return user.displayAvatarURL({ extension: 'png', size, forceStatic: true });
}

function getRoleIconUrl(role, size = 64) {
  if (!role || typeof role.iconURL !== 'function') return null;
  return role.iconURL({ extension: 'png', size });
}

function getInitials(name) {
  const clean = safeName(name || 'U', 'U');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

async function drawAvatar(ctx, member, x, y, size) {
  ctx.save();
  const radius = size / 2;
  const cx = x + radius;
  const cy = y + radius;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  const url = getAvatarUrl(member, 256);
  let drawn = false;
  if (url) {
    try {
      const img = await loadImageAny(url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const scale = Math.max(size / img.width, size / img.height);
      const nw = img.width * scale;
      const nh = img.height * scale;
      ctx.drawImage(img, x + (size - nw) / 2, y + (size - nh) / 2, nw, nh);
      ctx.restore();
      drawn = true;
    } catch (_) {
      drawn = false;
    }
  }
  if (!drawn) {
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#555555');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.font = `900 ${Math.round(size * 0.36)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(getMemberDisplay(member)), cx, cy + 1);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

async function drawRoleIcon(ctx, role, x, y, size) {
  ctx.save();
  const url = getRoleIconUrl(role, 128);
  let drawn = false;
  if (url) {
    try {
      const img = await loadImageAny(url);
      ctx.save();
      roundRect(ctx, x, y, size, size, 18);
      ctx.clip();
      drawCoverImage(ctx, img, x, y, size, size);
      ctx.restore();
      drawn = true;
    } catch (_) {
      drawn = false;
    }
  }
  if (!drawn) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 10;
    hexPath(ctx, cx, cy, size / 2);
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#8b8b8b');
    g.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#111111';
    ctx.font = `900 ${Math.round(size * 0.42)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(role?.name || 'C').slice(0, 1), cx, cy + 1);
  }
  ctx.restore();
}

function drawStatBox(ctx, x, y, w, h, label, value, valueSize = 28) {
  drawLocalGlass(ctx, x, y, w, h, 18, 0.10, 0.28);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 15px Arial';
  ctx.globalAlpha = 0.82;
  ctx.fillText(String(label).toUpperCase(), x + w / 2, y + 28);
  ctx.globalAlpha = 1;
  ctx.font = `900 ${valueSize}px Arial`;
  drawFitText(ctx, String(value), x + w / 2, y + 63, w - 30, `900 ${valueSize}px Arial`, 16, 'center');
  ctx.restore();
}

function drawRankBadge(ctx, rank, x, y, size, premium = false) {
  ctx.save();
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;
  if (premium) {
    ctx.shadowColor = 'rgba(255,255,255,0.65)';
    ctx.shadowBlur = rank === 1 ? 22 : 12;
  }
  hexPath(ctx, cx, cy, r);
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  if (rank === 1) {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#b7b7b7');
    g.addColorStop(1, '#f8f8f8');
  } else if (rank === 2) {
    g.addColorStop(0, '#d8d8d8');
    g.addColorStop(1, '#737373');
  } else if (rank === 3) {
    g.addColorStop(0, '#c4c4c4');
    g.addColorStop(1, '#636363');
  } else {
    g.addColorStop(0, '#8b8b8b');
    g.addColorStop(1, '#4b4b4b');
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.62)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = rank === 1 ? '#111111' : '#ffffff';
  ctx.font = `800 ${Math.round(size * 0.43)}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;
  ctx.fillText(String(rank), cx, cy + 1);
  ctx.restore();
}

function drawClanRow(ctx, clan, rank, x, y, w, h, guild) {
  const top = rank <= 3;
  const points = getClanPoints(clan);
  const name = getClanName(clan);
  const members = getClanMembersCount(guild, clan);
  const level = getLevel(points);
  const rowAlpha = rank === 1 ? 0.25 : top ? 0.18 : 0.11;
  const borderAlpha = rank === 1 ? 0.82 : top ? 0.55 : 0.28;
  drawGlassPanel(ctx, x, y, w, h, top ? 28 : 20, rowAlpha, borderAlpha, top ? 18 : 4);
  if (top) {
    ctx.save();
    roundRect(ctx, x, y, w, h, 28);
    ctx.clip();
    const streak = ctx.createLinearGradient(x, y, x + w, y + h);
    streak.addColorStop(0, 'rgba(255,255,255,0)');
    streak.addColorStop(0.35, 'rgba(255,255,255,0.08)');
    streak.addColorStop(0.52, 'rgba(255,255,255,0.22)');
    streak.addColorStop(0.68, 'rgba(255,255,255,0.06)');
    streak.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  const badgeSize = top ? 72 : 46;
  drawRankBadge(ctx, rank, x + (top ? 62 : 70), y + (h - badgeSize) / 2, badgeSize, top);
  const textX = x + (top ? 185 : 155);
  const metaY = y + (top ? 39 : 33);
  const nameY = y + (top ? 95 : 70);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${top ? 22 : 18}px Arial, Helvetica, sans-serif`;
  ctx.fillText(`LEVEL ${level}  •  ${members} ${members === 1 ? 'MEMBER' : 'MEMBERS'}`, textX, metaY);
  drawFitText(ctx, name, textX, nameY, top ? 760 : 720, `700 ${top ? 48 : 34}px Arial, Helvetica, sans-serif`, top ? 34 : 24, 'left');
  const pointsX = x + w - 185;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${top ? 21 : 17}px Arial, Helvetica, sans-serif`;
  ctx.fillText('POINTS', pointsX, y + (top ? 44 : 35));
  ctx.font = `800 ${top ? 58 : 36}px Arial, Helvetica, sans-serif`;
  ctx.shadowColor = 'rgba(255,255,255,0.45)';
  ctx.shadowBlur = top ? 14 : 5;
  ctx.fillText(formatPoints(points), pointsX, y + (top ? 100 : 77));
  if (top) {
    ctx.font = '800 34px Arial, Helvetica, sans-serif';
    ctx.fillText('✦', x + w - 52, y + h / 2 + 10);
  }
  ctx.restore();
}

function drawHeader(ctx, totalClans) {
  drawGlowText(ctx, 'NYXEN', W / 2, 110, '800 78px Arial, Helvetica, sans-serif', '#ffffff', 20, 'center');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px Arial, Helvetica, sans-serif';
  ctx.fillText('—  CLAN LEADERBOARD  —', W / 2, 158);
  ctx.font = '800 23px Arial, Helvetica, sans-serif';
  ctx.fillText(`${Number(totalClans || 0)} ACTIVE CLANS`, W / 2, 196);
  ctx.restore();
  drawLine(ctx, 250, 265, 740, 265, 0.30);
  drawLine(ctx, 1180, 265, 1670, 265, 0.30);
  drawGlowText(ctx, 'TOP CLANS', W / 2, 285, '900 62px Arial, Helvetica, sans-serif', '#ffffff', 22, 'center');
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✧', W / 2, 325);
  ctx.restore();
}

async function renderClanboardCardLegacy({ guild, clans = [], page = 0, totalPages = 1, totalClans = 0 }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  await drawBackground(ctx);
  drawGlassPanel(ctx, 92, 42, W - 184, H - 84, 34, 0.07, 0.20, 8);
  drawHeader(ctx, totalClans || clans.length);
  const listX = 195;
  const listW = W - listX * 2;
  const rows = clans.slice(0, 5);
  const yStart = 350;
  const gap = 18;
  const heights = [132, 128, 128, 96, 96];
  for (let i = 0; i < rows.length; i++) {
    const clan = rows[i];
    const y = yStart + heights.slice(0, i).reduce((a, b) => a + b, 0) + gap * i;
    drawClanRow(ctx, clan, i + 1, listX, y, listW, heights[i], guild);
  }
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '700 20px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`PAGE ${Number(page || 0) + 1} / ${Math.max(1, Number(totalPages || 1))}`, W / 2, H - 72);
  ctx.font = '600 16px Arial, Helvetica, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  const now = new Date();
  ctx.fillText(
    `UPDATED ${now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}  •  ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    W / 2,
    H - 42
  );
  ctx.restore();
  return canvas.toBuffer('image/png');
}

async function renderClanPointsCard({ guild, clanRole, points = 0 }) {
  const canvas = createCanvas(1600, 900);
  const ctx = canvas.getContext('2d');

  drawCleanBackground(ctx, 1600, 900);
  drawCleanPanel(ctx, 70, 55, 1460, 790, 38, '#0d1014', '#29303a');
  await drawCleanCardHeader(ctx, guild, 'NYXEN', 'CLAN POINTS', 110, 90, 1380, 116);

  drawCleanPanel(ctx, 110, 246, 670, 330, 30, '#11151a', '#29303a');
  drawCleanPanel(ctx, 820, 246, 670, 154, 28, '#11151a', '#29303a');
  await drawRoleIcon(ctx, clanRole, 860, 290, 66);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.fillStyle = '#89939f';
  ctx.fillText('CLAN', 950, 306);
  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, safeName(clanRole?.name, 'Clan'), 950, 356, 480, '900 52px Arial, Helvetica, sans-serif', 30, 'left');
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.fillText('TOTAL CLAN POINTS', 154, 324);
  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, formatPoints(points), 154, 438, 560, '900 110px Arial, Helvetica, sans-serif', 56, 'left');
  ctx.restore();

  const level = getLevel(points);
  const memberCount = guild && clanRole
    ? guild.members.cache.filter(m => m.roles.cache.has(clanRole.id)).size
    : 0;

  drawCleanMetric(ctx, 820, 438, 205, 138, 'LEVEL', String(level));
  drawCleanMetric(ctx, 1052, 438, 205, 138, 'MEMBERS', String(memberCount));
  drawCleanMetric(ctx, 1284, 438, 206, 138, 'STATUS', 'ACTIVE', 32);
  drawCleanMetric(ctx, 110, 624, 670, 132, 'SERVER', safeName(guild?.name || 'NYXEN'), 34);
  drawCleanMetric(ctx, 820, 624, 670, 132, 'UPDATED', new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }), 34);

  return canvas.toBuffer('image/png');
}

async function drawMemberProfileBox(ctx, x, y, w, h, label, member) {
  drawCleanPanel(ctx, x, y, w, h, 24, '#11151a', '#29303a');

  await drawAvatar(ctx, member, x + 26, y + 34, 92);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = '900 19px Arial';
  ctx.globalAlpha = 0.82;
  ctx.fillText(String(label).toUpperCase(), x + 140, y + 48);
  ctx.globalAlpha = 1;
  drawFitText(ctx, getMemberDisplay(member), x + 140, y + 90, w - 170, '900 36px Arial', 22, 'left');
  ctx.globalAlpha = 0.72;
  ctx.font = '700 20px Arial';
  drawFitText(ctx, getMemberSub(member), x + 140, y + 122, w - 170, '700 20px Arial', 15, 'left');
  ctx.restore();
}

async function renderClanInfoCard({ guild, clanRole, points = 0, members, leader, coLeader, clanEntry }) {
  const canvas = createCanvas(1600, 900);
  const ctx = canvas.getContext('2d');

  drawCleanBackground(ctx, 1600, 900);
  drawCleanPanel(ctx, 70, 55, 1460, 790, 38, '#0d1014', '#29303a');
  await drawCleanCardHeader(ctx, guild, 'NYXEN', 'CLAN INFO', 110, 90, 1380, 116);

  drawCleanPanel(ctx, 110, 246, 920, 154, 28, '#11151a', '#29303a');
  await drawRoleIcon(ctx, clanRole, 154, 290, 66);
  ctx.save();
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.fillText('CLAN', 244, 306);
  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, safeName(clanRole?.name, 'Clan'), 244, 356, 700, '900 52px Arial, Helvetica, sans-serif', 30, 'left');
  ctx.restore();

  const memberCount = members?.size || members?.length || 0;
  const avgPoints = memberCount > 0 ? Math.floor(points / memberCount) : 0;

  const openedRaw = clanEntry?.clanFirstJoin || clanEntry?.firstJoin || clanEntry?.openedAt || clanEntry?.createdAt || null;
  const opened = openedRaw
    ? new Date(openedRaw).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
    : 'Not recorded';

  drawCleanMetric(ctx, 1070, 246, 420, 154, 'TOTAL POINTS', formatPoints(points), 48);

  await drawMemberProfileBox(ctx, 110, 436, 660, 160, 'Leader', leader);
  await drawMemberProfileBox(ctx, 830, 436, 660, 160, 'Co-Leader', coLeader);

  drawCleanMetric(ctx, 110, 632, 325, 116, 'MEMBERS', String(memberCount), 38);
  drawCleanMetric(ctx, 461, 632, 325, 116, 'LEVEL', String(getLevel(points)), 38);
  drawCleanMetric(ctx, 812, 632, 325, 116, 'AVG POINTS', formatPoints(avgPoints), 34);
  drawCleanMetric(ctx, 1165, 632, 325, 116, 'CLAN OPENED', opened, 28);

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.font = '800 18px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${safeName(clanRole?.name || 'Clan')} inside ${safeName(guild?.name || 'NYXEN')}`, 800, 815);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

async function drawMemberRow(ctx, member, rank, x, y, w, h, points) {
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = rank === 1 ? '#1b2027' : '#151a20';
  ctx.fill();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 22px Arial, Helvetica, sans-serif';
  ctx.fillText(String(rank).padStart(2, '0'), x + 48, y + h / 2);
  ctx.restore();

  await drawAvatar(ctx, member, x + 92, y + (h - 34) / 2, 34);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  drawFitText(ctx, getMemberDisplay(member), x + 150, y + h / 2 + 8, 760, '900 26px Arial, Helvetica, sans-serif', 18, 'left');
  ctx.textAlign = 'right';
  ctx.font = '900 26px Arial, Helvetica, sans-serif';
  ctx.fillText(`${formatPoints(points)} pts`, x + w - 32, y + h / 2 + 2);
  ctx.restore();
}

function getMemberPointValue(member, memberPoints = {}) {
  const userId = member?.id || member?.user?.id;
  return userId ? Number(memberPoints[userId] || 0) : 0;
}

async function drawTopMemberCard(ctx, member, rank, x, y, w, h, points) {
  drawCleanPanel(ctx, x, y, w, h, 24, rank === 1 ? '#1b2027' : '#11151a', '#29303a');
  await drawAvatar(ctx, member, x + 28, y + 44, 62);

  ctx.save();
  ctx.fillStyle = '#89939f';
  ctx.font = '900 16px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`TOP ${rank}`, x + 112, y + 45);

  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, getMemberDisplay(member), x + 112, y + 88, w - 144, '900 32px Arial, Helvetica, sans-serif', 20, 'left');

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px Arial, Helvetica, sans-serif';
  ctx.fillText(`${formatPoints(points)} pts`, x + 112, y + 124);
  ctx.restore();
}

async function renderClanMembersCard({ guild, clanRole, members, memberPoints = {}, page = 0 }) {
  const canvas = createCanvas(1600, 900);
  const ctx = canvas.getContext('2d');

  drawCleanBackground(ctx, 1600, 900);
  drawCleanPanel(ctx, 70, 55, 1460, 805, 38, '#0d1014', '#29303a');

  const arr = [...(members?.values ? members.values() : members || [])];
  const rankedMembers = arr
    .map(member => ({ member, points: getMemberPointValue(member, memberPoints) }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return getMemberDisplay(a.member).localeCompare(getMemberDisplay(b.member));
    });
  const topMembers = rankedMembers.slice(0, 3);
  const otherMembers = rankedMembers.slice(3);
  const MEMBERS_PER_PAGE = 4;
  const totalPages = Math.max(1, Math.ceil(otherMembers.length / MEMBERS_PER_PAGE));
  const currentPage = Math.max(0, Math.min(Number(page || 0), totalPages - 1));
  const pageMembers = otherMembers.slice(currentPage * MEMBERS_PER_PAGE, currentPage * MEMBERS_PER_PAGE + MEMBERS_PER_PAGE);

  await drawCleanCardHeader(ctx, guild, 'NYXEN', 'CLAN MEMBERS', 110, 90, 1380, 116);

  drawCleanPanel(ctx, 110, 226, 1380, 96, 28, '#11151a', '#29303a');
  await drawRoleIcon(ctx, clanRole, 154, 241, 66);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, `${safeName(clanRole?.name, 'Clan')} Members`, 244, 286, 780, '900 42px Arial, Helvetica, sans-serif', 26, 'left');
  ctx.fillStyle = '#89939f';
  ctx.font = '900 20px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`TOTAL ${arr.length}  |  PAGE ${currentPage + 1}/${totalPages}`, 1446, 286);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOP 3 MEMBERS', 110, 358);
  ctx.restore();

  if (topMembers.length === 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '900 26px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No members found in this clan.', 800, 438);
    ctx.restore();
  } else {
    const cardW = 426;
    const cardGap = 51;
    for (let i = 0; i < topMembers.length; i++) {
      await drawTopMemberCard(ctx, topMembers[i].member, i + 1, 110 + i * (cardW + cardGap), 378, cardW, 144, topMembers[i].points);
    }
  }

  drawCleanPanel(ctx, 110, 554, 1380, 288, 30, '#11151a', '#29303a');
  ctx.save();
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('#', 160, 612);
  ctx.textAlign = 'left';
  ctx.fillText('OTHER MEMBERS', 285, 612);
  ctx.textAlign = 'right';
  ctx.fillText('POINTS', 1435, 612);
  ctx.strokeStyle = '#2f3742';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(142, 638);
  ctx.lineTo(1458, 638);
  ctx.stroke();
  ctx.restore();

  if (pageMembers.length === 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '900 26px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(arr.length <= 3 ? 'No other members yet.' : 'No members found on this page.', 800, 728);
    ctx.restore();
  } else {
    const x = 142;
    const yStart = 648;
    const rowW = 1316;
    const rowH = 38;
    const gap = 7;

    for (let i = 0; i < pageMembers.length; i++) {
      const { member, points } = pageMembers[i];
      const rank = 4 + currentPage * MEMBERS_PER_PAGE + i;
      const y = yStart + i * (rowH + gap);

      await drawMemberRow(ctx, member, rank, x, y, rowW, rowH, points);
    }
  }

  return canvas.toBuffer('image/png');
}

function drawClanboardBackgroundClean(ctx) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#060708');
  bg.addColorStop(0.58, '#0c0f13');
  bg.addColorStop(1, '#14171c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.62, H * 0.20, 20, W * 0.62, H * 0.20, 720);
  glow.addColorStop(0, 'rgba(255,255,255,0.045)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function drawCleanBackground(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#060708');
  bg.addColorStop(0.58, '#0c0f13');
  bg.addColorStop(1, '#14171c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.62, h * 0.20, 20, w * 0.62, h * 0.20, Math.max(w, h) * 0.42);
  glow.addColorStop(0, 'rgba(255,255,255,0.045)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawCleanPanel(ctx, x, y, w, h, r = 28, fill = '#11151a', stroke = '#29303a') {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.44)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 22;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

async function drawCleanCardHeader(ctx, guild, title, subtitle, x, y, w, h) {
  drawCleanPanel(ctx, x, y, w, h, 26, '#14181e', '#2c333d');
  await drawServerIcon(ctx, guild, x + 36, y + 22, 72);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px Arial, Helvetica, sans-serif';
  ctx.fillText(String(title || 'NYXEN'), x + 128, y + 76);
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.fillText(String(subtitle || '').toUpperCase(), x + 355, y + 68);
  ctx.restore();
}

function drawCleanMetric(ctx, x, y, w, h, label, value, valueSize = 42) {
  drawCleanPanel(ctx, x, y, w, h, 24, '#11151a', '#29303a');
  ctx.save();
  ctx.fillStyle = '#89939f';
  ctx.font = '900 17px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(label).toUpperCase(), x + 32, y + 42);
  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, String(value), x + 32, y + h - 34, w - 64, `900 ${valueSize}px Arial, Helvetica, sans-serif`, 20, 'left');
  ctx.restore();
}

function getClanLeader(guild, clan, leaderRoleId) {
  const clanRoleId = getClanRoleId(clan);
  if (!guild || !clanRoleId || !leaderRoleId) return null;
  return guild.members.cache.find(member =>
    member.roles.cache.has(clanRoleId) &&
    member.roles.cache.has(leaderRoleId)
  ) || null;
}

async function drawServerIcon(ctx, guild, x, y, size) {
  const radius = size / 2;
  const cx = x + radius;
  const cy = y + radius;
  let drawn = false;
  const url = guild && typeof guild.iconURL === 'function'
    ? guild.iconURL({ extension: 'png', size: 128, forceStatic: true })
    : null;

  if (url) {
    try {
      const img = await loadImageAny(url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      drawCoverImage(ctx, img, x, y, size, size);
      ctx.restore();
      drawn = true;
    } catch (_) {
      drawn = false;
    }
  }

  if (!drawn) {
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, '#f3f5f7');
    g.addColorStop(1, '#6f7782');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1014';
    ctx.font = `900 ${Math.round(size * 0.36)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(guild?.name || 'NYXEN'), cx, cy + 1);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawClanboardStat(ctx, x, y, w, h, label, value) {
  drawCleanPanel(ctx, x, y, w, h, 24, '#11151a', '#29303a');
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.fillText(String(label).toUpperCase(), x + 42, y + 62);
  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, String(value), x + 42, y + 116, w - 84, '900 54px Arial, Helvetica, sans-serif', 28, 'left');
  ctx.restore();
}

async function drawClanboardHeaderClean(ctx, guild, totalClans) {
  drawCleanPanel(ctx, 144, 130, 1632, 130, 26, '#14181e', '#2c333d');
  await drawServerIcon(ctx, guild, 192, 158, 76);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 58px Arial, Helvetica, sans-serif';
  ctx.fillText('NYXEN', 292, 210);
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.fillText('TOP CLANS', 560, 202);
  ctx.restore();

  drawCleanPanel(ctx, 1461, 163, 213, 64, 22, '#0e1216', '#303842');
  ctx.save();
  ctx.fillStyle = '#f0f3f6';
  ctx.font = '900 21px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Number(totalClans || 0)} ACTIVE`, 1567, 195);
  ctx.restore();
}

async function drawTopClanStat(ctx, clan, x, y, w, h) {
  drawCleanPanel(ctx, x, y, w, h, 24, '#11151a', '#29303a');
  ctx.save();
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOP CLAN', x + 42, y + 62);
  ctx.restore();

  if (clan?.role) {
    await drawRoleIcon(ctx, clan.role, x + 42, y + 86, 58);
  }

  ctx.save();
  ctx.fillStyle = '#ffffff';
  drawFitText(ctx, getClanName(clan), x + 116, y + 132, w - 150, '900 56px Arial, Helvetica, sans-serif', 28, 'left');
  ctx.restore();
}

async function drawCleanClanRow(ctx, clan, rank, x, y, w, h, guild, leaderRoleId) {
  const fill = rank === 1 ? '#1b2027' : '#151a20';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = fill;
  ctx.fill();

  const leader = getClanLeader(guild, clan, leaderRoleId);
  await drawAvatar(ctx, leader, x + 28, y + (h - 48) / 2, 48);

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4f6f8';
  ctx.font = '900 24px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(rank).padStart(2, '0'), x + 96, y + h / 2);

  drawFitText(ctx, getClanName(clan), x + 200, y + h / 2 + 9, 520, '800 27px Arial, Helvetica, sans-serif', 20, 'left');

  const members = getClanMembersCount(guild, clan);
  ctx.font = '800 24px Arial, Helvetica, sans-serif';
  ctx.fillText(String(members), x + 862, y + h / 2);

  ctx.textAlign = 'center';
  ctx.font = '900 27px Arial, Helvetica, sans-serif';
  ctx.fillText(formatPoints(getClanPoints(clan)), x + 1375, y + h / 2);
  ctx.restore();
}

async function renderClanboardCard({
  guild,
  clans = [],
  allClans,
  page = 0,
  totalPages = 1,
  totalClans = 0,
  leaderRoleId
}) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const fullClans = Array.isArray(allClans) && allClans.length ? allClans : clans;
  const topClan = fullClans[0] || clans[0] || null;
  const activeClans = totalClans || fullClans.length || clans.length;
  const totalPoints = fullClans.reduce((sum, clan) => sum + getClanPoints(clan), 0);
  const totalMembers = fullClans.reduce((sum, clan) => sum + getClanMembersCount(guild, clan), 0);

  drawClanboardBackgroundClean(ctx);
  drawCleanPanel(ctx, 105, 90, 1710, 900, 36, '#0d1014', '#29303a');
  await drawClanboardHeaderClean(ctx, guild, activeClans);

  drawClanboardStat(ctx, 144, 303, 495, 168, 'Total Points', formatPoints(totalPoints));
  drawClanboardStat(ctx, 712, 303, 495, 168, 'Total Members', formatPoints(totalMembers));
  await drawTopClanStat(ctx, topClan, 1281, 303, 495, 168);

  drawCleanPanel(ctx, 144, 504, 1632, 470, 30, '#11151a', '#29303a');
  ctx.save();
  ctx.fillStyle = '#89939f';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RANK', 210, 582);
  ctx.fillText('CLAN', 390, 582);
  ctx.fillText('MEMBERS', 1035, 582);
  ctx.fillText('POINTS', 1524, 582);
  ctx.strokeStyle = '#2f3742';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(189, 608);
  ctx.lineTo(1731, 608);
  ctx.stroke();
  ctx.restore();

  const rows = clans.slice(0, 5);
  const rowX = 189;
  const rowW = 1542;
  const rowH = 52;
  const gap = 10;
  const pageOffset = Number(page || 0) * 5;
  for (let i = 0; i < rows.length; i++) {
    const clan = rows[i];
    await drawCleanClanRow(ctx, clan, pageOffset + i + 1, rowX, 625 + i * (rowH + gap), rowW, rowH, guild, leaderRoleId);
  }

  if (rows.length === 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '900 30px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No clans found', W / 2, 765);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.font = '800 18px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`PAGE ${Number(page || 0) + 1} / ${Math.max(1, Number(totalPages || 1))}`, W / 2, 943);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderClanInfoCard,
  renderClanPointsCard,
  renderClanMembersCard,
  renderClanboardCard
};
