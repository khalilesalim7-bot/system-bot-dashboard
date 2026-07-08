const { createCanvas, loadImage } = require('@napi-rs/canvas');
const https = require('https');
const http = require('http');

const W = 930;
const H = 205;

function fetchBuffer(url, redirects = 4) {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== 'string') return reject(new Error('Missing image URL'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        resolve(fetchBuffer(new URL(res.headers.location, url).toString(), redirects - 1));
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
  const buffer = await fetchBuffer(src);
  return loadImage(buffer);
}

async function renderInviteCard({ username, avatarUrl, invites, todayInvites, leaves, realInvites }) {
  return renderStatsCard({
    username,
    avatarUrl,
    subtitle: 'INVITES',
    stats: [
      { label: 'TOTAL', value: invites || 0, icon: 'group' },
      { label: 'TODAY', value: todayInvites || 0, icon: 'calendar' },
      { label: 'LEAVES', value: leaves || 0, icon: 'leave' },
      { label: 'REAL', value: realInvites || 0, icon: 'user' }
    ]
  });
}

async function renderStatsCard({ username, avatarUrl, subtitle, stats }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const accent = '#4f7cff';
  const accent2 = '#55d7ff';
  const visibleStats = (Array.isArray(stats) ? stats : []).slice(0, 4);

  ctx.clearRect(0, 0, W, H);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#02050b');
  bg.addColorStop(0.5, '#07090e');
  bg.addColorStop(1, '#0a0d14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  drawGlow(ctx, 290, -80, 260, accent, 0.16);
  drawGlow(ctx, 820, 235, 330, accent2, 0.11);
  drawGlow(ctx, 100, 105, 190, accent, 0.06);

  ctx.save();
  ctx.shadowColor = 'rgba(76, 125, 255, 0.22)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;
  roundRect(ctx, 1, 1, W - 2, H - 2, 18);
  const panel = ctx.createLinearGradient(0, 0, W, H);
  panel.addColorStop(0, 'rgba(13, 16, 22, 0.95)');
  panel.addColorStop(0.48, 'rgba(6, 8, 12, 0.99)');
  panel.addColorStop(1, 'rgba(12, 14, 19, 0.95)');
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, 1, 1, W - 2, H - 2, 18);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, 1, 1, W - 2, H - 2, 18);
  ctx.clip();
  const topLine = ctx.createLinearGradient(0, 0, W, 0);
  topLine.addColorStop(0, 'rgba(255,255,255,0)');
  topLine.addColorStop(0.34, 'rgba(85, 215, 255, 0.28)');
  topLine.addColorStop(0.56, 'rgba(79, 124, 255, 0.78)');
  topLine.addColorStop(0.82, 'rgba(255,255,255,0)');
  ctx.strokeStyle = topLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 2);
  ctx.lineTo(W - 24, 2);
  ctx.stroke();
  ctx.restore();

  await drawProfile(ctx, username, avatarUrl, subtitle, accent);

  const divX = 218;
  const divGrad = ctx.createLinearGradient(0, 32, 0, H - 32);
  divGrad.addColorStop(0, 'rgba(255,255,255,0)');
  divGrad.addColorStop(0.5, 'rgba(255,255,255,0.21)');
  divGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 28);
  ctx.lineTo(divX, H - 28);
  ctx.stroke();

  const count = Math.max(1, visibleStats.length);
  const startX = 252;
  const rightPad = 28;
  const gap = count >= 4 ? 22 : 30;
  const cardW = (W - startX - rightPad - gap * (count - 1)) / count;
  const cardH = 154;
  const y = 26;

  visibleStats.forEach((stat, i) => {
    drawStatBox(ctx, startX + i * (cardW + gap), y, cardW, cardH, stat, accent, accent2, count);
  });

  return canvas.toBuffer('image/png');
}

async function drawProfile(ctx, username, avatarUrl, subtitle, accent) {
  const avatarSize = 92;
  const ax = 53;
  const ay = 30;
  const cx = ax + avatarSize / 2;
  const cy = ay + avatarSize / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  ctx.beginPath();
  ctx.arc(cx, cy, avatarSize / 2 + 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  try {
    const img = await loadImageAny(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, ax, ay, avatarSize, avatarSize);
    ctx.restore();
  } catch (_) {
    const fallback = ctx.createLinearGradient(ax, ay, ax + avatarSize, ay + avatarSize);
    fallback.addColorStop(0, '#1b2230');
    fallback.addColorStop(1, '#07090d');
    ctx.fillStyle = fallback;
    ctx.beginPath();
    ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, cy, avatarSize / 2 + 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.beginPath();
  ctx.arc(cx, cy, avatarSize / 2 + 8, -Math.PI * 0.18, Math.PI * 1.18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 25px Arial, sans-serif';
  ctx.fillText(fitText(ctx, cleanName(username), 195), 99, 159);

  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.font = '800 17px Arial, sans-serif';
  ctx.fillText(String(subtitle || 'STATS').toUpperCase(), 99, 185);
  ctx.textAlign = 'left';
}

function drawStatBox(ctx, x, y, w, h, stat, accent, accent2, count) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 11;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, x, y, w, h, 14);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(25, 30, 40, 0.80)');
  grad.addColorStop(0.56, 'rgba(13, 16, 22, 0.94)');
  grad.addColorStop(1, 'rgba(7, 8, 12, 0.98)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  const line = ctx.createLinearGradient(x + 20, y, x + w - 20, y);
  line.addColorStop(0, accent2);
  line.addColorStop(1, accent);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 27, y + 2.5);
  ctx.lineTo(x + w - 27, y + 2.5);
  ctx.stroke();

  const compact = count >= 4;
  const iconSize = compact ? 23 : 27;
  const labelFont = compact ? 18 : 22;
  const valueFont = compact ? 48 : 56;
  const iconX = x + (compact ? 33 : 42);
  const labelX = x + (compact ? 61 : 77);
  const labelY = y + 55;

  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = compact ? 2.7 : 3;
  drawIcon(ctx, stat.icon, iconX, labelY, iconSize);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.76)';
  ctx.font = `900 ${labelFont}px Arial, sans-serif`;
  ctx.fillText(fitText(ctx, String(stat.label || '').toUpperCase(), w - (labelX - x) - 12), labelX, labelY);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `300 ${valueFont}px Arial, sans-serif`;
  ctx.fillText(fitText(ctx, formatNumber(stat.value), w - 24), x + w / 2, y + 117);
  ctx.textAlign = 'left';
}

function drawIcon(ctx, type, x, y, size) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  if (type === 'leave') {
    ctx.rect(x - size * 0.38, y - size * 0.35, size * 0.45, size * 0.70);
    ctx.moveTo(x - size * 0.05, y);
    ctx.lineTo(x + size * 0.44, y);
    ctx.moveTo(x + size * 0.21, y - size * 0.22);
    ctx.lineTo(x + size * 0.44, y);
    ctx.lineTo(x + size * 0.21, y + size * 0.22);
    ctx.stroke();
  } else if (type === 'shield') {
    ctx.moveTo(x, y - size * 0.48);
    ctx.lineTo(x + size * 0.42, y - size * 0.30);
    ctx.lineTo(x + size * 0.33, y + size * 0.34);
    ctx.lineTo(x, y + size * 0.52);
    ctx.lineTo(x - size * 0.33, y + size * 0.34);
    ctx.lineTo(x - size * 0.42, y - size * 0.30);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'calendar') {
    ctx.rect(x - size * 0.43, y - size * 0.34, size * 0.86, size * 0.72);
    ctx.moveTo(x - size * 0.20, y - size * 0.48);
    ctx.lineTo(x - size * 0.20, y - size * 0.23);
    ctx.moveTo(x + size * 0.20, y - size * 0.48);
    ctx.lineTo(x + size * 0.20, y - size * 0.23);
    ctx.moveTo(x - size * 0.43, y - size * 0.12);
    ctx.lineTo(x + size * 0.43, y - size * 0.12);
    ctx.stroke();
  } else if (type === 'group') {
    ctx.arc(x - size * 0.15, y - size * 0.25, size * 0.18, 0, Math.PI * 2);
    ctx.moveTo(x - size * 0.46, y + size * 0.42);
    ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.05, x + size * 0.16, y + size * 0.42);
    ctx.moveTo(x + size * 0.28, y - size * 0.10);
    ctx.arc(x + size * 0.28, y - size * 0.10, size * 0.15, 0, Math.PI * 2);
    ctx.moveTo(x + size * 0.08, y + size * 0.43);
    ctx.quadraticCurveTo(x + size * 0.30, y + size * 0.18, x + size * 0.52, y + size * 0.43);
    ctx.stroke();
  } else {
    ctx.arc(x, y - size * 0.22, size * 0.20, 0, Math.PI * 2);
    ctx.moveTo(x - size * 0.40, y + size * 0.45);
    ctx.quadraticCurveTo(x, y + size * 0.04, x + size * 0.40, y + size * 0.45);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGlow(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, hexToRgba(color, alpha));
  g.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function cleanName(username) {
  return String(username || 'Unknown').replace(/[@#`*_~|<>]/g, '').slice(0, 24);
}

function fitText(ctx, value, maxWidth) {
  const text = String(value ?? '');
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed ? `${trimmed}...` : '';
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function hexToRgba(hex, alpha = 1) {
  const clean = String(hex || '#4c7dff').replace('#', '').slice(0, 6);
  const n = Number.parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  if (Number.isNaN(n)) return `rgba(76, 125, 255, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

module.exports = { renderInviteCard, renderStatsCard };
