import { createCanvas, loadImage } from '@napi-rs/canvas';
import { backgrounds, getProfileLevels } from './config.js';

const cardWidth = 900;
const cardHeight = 330;
const leaderboardWidth = 1100;
const leaderboardHeight = 1280;

export async function renderRankCard({ user, stats, rank }) {
  const canvas = createCanvas(cardWidth, cardHeight);
  const ctx = canvas.getContext('2d');
  const theme = normalizeTheme(backgrounds[stats.backgroundIndex] ?? backgrounds[0]);
  const levels = getProfileLevels(stats);
  const progress = levels.total.nextXp === 0 ? 0 : levels.total.currentXp / levels.total.nextXp;

  drawRankBackground(ctx, theme);
  await drawRankAvatar(ctx, user, theme);
  drawRankText(ctx, { user, rank, levels, theme });
  drawRankProgress(ctx, { progress, currentXp: levels.total.currentXp, nextXp: levels.total.nextXp, theme });
  drawLevelBreakdown(ctx, { levels, stats, theme });

  return canvas.toBuffer('image/png');
}

export async function renderLeaderboardCard({ guild, entries }) {
  const canvas = createCanvas(leaderboardWidth, leaderboardHeight);
  const ctx = canvas.getContext('2d');
  const rows = entries.slice(0, 10);

  drawLeaderboardBackground(ctx);
  drawLeaderboardHeader(ctx, guild, rows);

  if (rows.length === 0) {
    drawEmptyLeaderboard(ctx);
  } else {
    for (let i = 0; i < rows.length; i++) {
      await drawLeaderboardRow(ctx, rows[i], i + 1);
    }
  }

  return canvas.toBuffer('image/png');
}

function normalizeTheme(theme) {
  return {
    start: theme?.start ?? '#020409',
    end: theme?.end ?? '#0b0f18',
    accent: theme?.accent ?? '#fbbf24',
    accent2: theme?.accent2 ?? '#fde68a',
    text: theme?.text ?? '#f8fafc',
    muted: theme?.muted ?? '#94a3b8',
    panel: theme?.panel ?? 'rgba(12, 15, 22, 0.88)',
    panel2: theme?.panel2 ?? 'rgba(5, 7, 11, 0.96)',
    stroke: theme?.stroke ?? 'rgba(255,255,255,0.15)',
    watermark: theme?.watermark ?? 'LEVEL UP',
    name: theme?.name ?? 'Yellow Gold',
    light: Boolean(theme?.light)
  };
}

function drawRankBackground(ctx, theme) {
  ctx.save();
  roundRect(ctx, 0, 0, cardWidth, cardHeight, 30);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
  bg.addColorStop(0, theme.start);
  bg.addColorStop(1, theme.end);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cardWidth, cardHeight);

  drawGlow(ctx, 95, 55, 220, theme.accent, theme.light ? 0.18 : 0.28);
  drawGlow(ctx, cardWidth - 120, 25, 260, theme.accent2, theme.light ? 0.16 : 0.23);
  drawGlow(ctx, cardWidth - 190, cardHeight + 30, 330, theme.accent, theme.light ? 0.16 : 0.22);

  ctx.globalAlpha = theme.light ? 0.10 : 0.13;
  ctx.strokeStyle = theme.light ? '#0f172a' : '#ffffff';
  ctx.lineWidth = 1.4;
  for (let i = -180; i < cardWidth + 260; i += 65) {
    ctx.beginPath();
    ctx.moveTo(i, cardHeight + 35);
    ctx.bezierCurveTo(i + 155, 240, i + 260, 95, i + 430, -45);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.shadowColor = hexToRgba(theme.accent, theme.light ? 0.16 : 0.30);
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 7;
  roundRect(ctx, 24, 24, cardWidth - 48, cardHeight - 48, 28);
  const panel = ctx.createLinearGradient(24, 24, cardWidth - 24, cardHeight - 24);
  panel.addColorStop(0, theme.panel);
  panel.addColorStop(1, theme.panel2);
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, 24, 24, cardWidth - 48, cardHeight - 48, 28);
  ctx.strokeStyle = theme.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  const topLine = ctx.createLinearGradient(70, 24, cardWidth - 70, 24);
  topLine.addColorStop(0, hexToRgba(theme.accent, 0));
  topLine.addColorStop(0.48, hexToRgba(theme.accent, 0.9));
  topLine.addColorStop(1, hexToRgba(theme.accent2, 0));
  ctx.strokeStyle = topLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, 25);
  ctx.lineTo(cardWidth - 72, 25);
  ctx.stroke();

  ctx.globalAlpha = theme.light ? 0.08 : 0.07;
  ctx.fillStyle = theme.text;
  ctx.font = '900 64px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(theme.watermark, cardWidth / 2 + 80, cardHeight / 2 + 6);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  ctx.restore();
}

async function drawRankAvatar(ctx, user, theme) {
  const x = 58;
  const y = 70;
  const size = 132;
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.50)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = theme.light ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  try {
    const avatarUrl = user?.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    if (!avatarUrl) throw new Error('Missing avatar');
    const response = await fetch(avatarUrl);
    if (!response.ok) throw new Error(`Avatar request failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const avatar = await loadImage(buffer);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, x, y, size, size);
    ctx.restore();
  } catch {
    const fallback = ctx.createLinearGradient(x, y, x + size, y + size);
    fallback.addColorStop(0, theme.accent);
    fallback.addColorStop(1, theme.end);
    ctx.fillStyle = fallback;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = theme.light ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 10, -Math.PI * 0.2, Math.PI * 1.35);
  ctx.stroke();
}

function drawRankText(ctx, { user, rank, levels, theme }) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = theme.text;
  ctx.font = '900 40px Arial, sans-serif';
  ctx.fillText(fitText(ctx, user?.username ?? 'Unknown', 270), 230, 78);

  ctx.fillStyle = theme.muted;
  ctx.font = '800 18px Arial, sans-serif';
  ctx.fillText(theme.name.toUpperCase(), 232, 106);

  drawInfoChip(ctx, 510, 45, 132, 56, 'RANK', `#${rank}`, theme.accent, theme);
  drawInfoChip(ctx, 704, 45, 146, 56, 'LEVEL', `${levels.total.level}`, theme.accent2, theme);
}

function drawRankProgress(ctx, { progress, currentXp, nextXp, theme }) {
  const x = 230;
  const y = 136;
  const width = 610;
  const height = 30;
  const safeProgress = clamp01(progress);

  ctx.fillStyle = theme.muted;
  ctx.font = '900 18px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${formatNumber(currentXp)} / ${formatNumber(nextXp)} XP`, x + width, y - 13);
  ctx.textAlign = 'left';

  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = theme.light ? 'rgba(148, 163, 184, 0.45)' : 'rgba(255,255,255,0.12)';
  ctx.fill();

  if (safeProgress > 0) {
    roundRect(ctx, x, y, Math.max(height, width * safeProgress), height, height / 2);
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, theme.accent);
    gradient.addColorStop(1, theme.accent2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.save();
  ctx.shadowColor = hexToRgba(theme.accent, 0.45);
  ctx.shadowBlur = 14;
  ctx.fillStyle = theme.light ? '#ffffff' : '#f8fafc';
  ctx.beginPath();
  ctx.arc(x + Math.max(height / 2, width * safeProgress), y + height / 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLevelBreakdown(ctx, { levels, stats, theme }) {
  const cards = [
    { label: 'TEXT LV', value: levels.text.level, detail: `${formatNumber(stats.textXp ?? stats.xp ?? 0)} XP`, x: 230, accent: theme.accent },
    { label: 'VOICE LV', value: levels.voice.level, detail: `${formatNumber(stats.voiceXp ?? 0)} XP`, x: 430, accent: theme.accent2 },
    { label: 'TOTAL LV', value: levels.total.level, detail: `${formatNumber((stats.textXp ?? stats.xp ?? 0) + (stats.voiceXp ?? 0))} XP`, x: 630, accent: theme.accent }
  ];

  for (const item of cards) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    roundRect(ctx, item.x, 214, 170, 72, 18);
    ctx.fillStyle = theme.light ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.07)';
    ctx.fill();
    ctx.restore();

    roundRect(ctx, item.x, 214, 170, 72, 18);
    ctx.strokeStyle = theme.light ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '900 14px Arial, sans-serif';
    ctx.fillStyle = item.accent;
    ctx.fillText(item.label, item.x + 18, 239);

    ctx.font = '900 29px Arial, sans-serif';
    ctx.fillStyle = theme.text;
    ctx.fillText(`${item.value}`, item.x + 18, 272);

    ctx.font = '800 15px Arial, sans-serif';
    ctx.fillStyle = theme.muted;
    ctx.textAlign = 'right';
    ctx.fillText(item.detail, item.x + 152, 271);
    ctx.textAlign = 'left';
  }
}

function drawInfoChip(ctx, x, y, width, height, label, value, accent, theme) {
  ctx.save();
  ctx.shadowColor = hexToRgba(accent, theme.light ? 0.18 : 0.30);
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  roundRect(ctx, x, y, width, height, 18);
  ctx.fillStyle = theme.light ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.07)';
  ctx.fill();
  ctx.restore();

  roundRect(ctx, x, y, width, height, 18);
  ctx.strokeStyle = hexToRgba(accent, 0.36);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '900 13px Arial, sans-serif';
  ctx.fillText(label, x + 18, y + 22);
  ctx.fillStyle = theme.text;
  ctx.font = '900 25px Arial, sans-serif';
  ctx.fillText(value, x + 18, y + 49);
}

function drawLeaderboardBackground(ctx) {
  ctx.save();
  roundRect(ctx, 0, 0, leaderboardWidth, leaderboardHeight, 34);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, leaderboardWidth, leaderboardHeight);
  bg.addColorStop(0, '#030201');
  bg.addColorStop(0.48, '#080601');
  bg.addColorStop(1, '#1a1103');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, leaderboardWidth, leaderboardHeight);

  drawGlow(ctx, 125, 90, 330, '#fbbf24', 0.20);
  drawGlow(ctx, leaderboardWidth - 95, 90, 350, '#fde68a', 0.14);
  drawGlow(ctx, leaderboardWidth - 160, leaderboardHeight - 120, 430, '#f59e0b', 0.16);
  drawGlow(ctx, 115, leaderboardHeight - 110, 300, '#fbbf24', 0.10);

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = -280; i < 1300; i += 90) {
    ctx.beginPath();
    ctx.moveTo(i, leaderboardHeight + 80);
    ctx.bezierCurveTo(i + 190, 860, i + 360, 390, i + 650, -90);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 126px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOP 10', leaderboardWidth / 2, 210);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  ctx.restore();

  roundRect(ctx, 2, 2, leaderboardWidth - 4, leaderboardHeight - 4, 34);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawLeaderboardHeader(ctx, guild, rows) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 58px Arial, sans-serif';
  ctx.fillText('Leaderboard', 62, 88);

  ctx.fillStyle = '#fde68a';
  ctx.font = '800 24px Arial, sans-serif';
  const guildName = guild?.name ? fitText(ctx, guild.name, 520) : 'Server ranking';
  ctx.fillText(`${guildName} • top ${Math.max(rows.length, 10)}`, 66, 130);

  ctx.save();
  ctx.shadowColor = 'rgba(251, 191, 36, 0.24)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, 780, 54, 260, 82, 24);
  const pillGradient = ctx.createLinearGradient(780, 54, 1040, 136);
  pillGradient.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
  pillGradient.addColorStop(1, 'rgba(253, 230, 138, 0.12)');
  ctx.fillStyle = pillGradient;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, 780, 54, 260, 82, 24);
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 18px Arial, sans-serif';
  ctx.fillText('RANKING MODE', 812, 88);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 30px Arial, sans-serif';
  ctx.fillText('TOTAL XP', 812, 121);
}

function drawEmptyLeaderboard(ctx) {
  drawDarkPanel(ctx, 90, 470, leaderboardWidth - 180, 220, 28);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 38px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('No XP yet', leaderboardWidth / 2, 560);
  ctx.fillStyle = '#fde68a';
  ctx.font = '700 24px Arial, sans-serif';
  ctx.fillText('Send messages or stay active in voice to enter the top 10.', leaderboardWidth / 2, 610);
  ctx.textAlign = 'left';
}

async function drawLeaderboardRow(ctx, entry, fallbackRank) {
  const rowHeight = 92;
  const rowGap = 16;
  const x = 58;
  const rank = entry.rank ?? fallbackRank;
  const y = 170 + (fallbackRank - 1) * (rowHeight + rowGap);
  const width = leaderboardWidth - 116;
  const accent = rankAccent(rank);
  const levels = getProfileLevels(entry);
  const progress = levels.total.nextXp === 0 ? 0 : levels.total.currentXp / levels.total.nextXp;

  ctx.save();
  ctx.shadowColor = rank <= 3 ? hexToRgba(accent, 0.20) : 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, x, y, width, rowHeight, 24);
  const rowGradient = ctx.createLinearGradient(x, y, x + width, y + rowHeight);
  rowGradient.addColorStop(0, rank <= 3 ? hexToRgba(accent, 0.20) : 'rgba(255,255,255,0.07)');
  rowGradient.addColorStop(0.42, 'rgba(10, 14, 22, 0.93)');
  rowGradient.addColorStop(1, 'rgba(3, 5, 9, 0.96)');
  ctx.fillStyle = rowGradient;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, x, y, width, rowHeight, 24);
  ctx.strokeStyle = rank <= 3 ? hexToRgba(accent, 0.70) : 'rgba(255,255,255,0.13)';
  ctx.lineWidth = rank <= 3 ? 2.7 : 1.4;
  ctx.stroke();

  roundRect(ctx, x, y, 8, rowHeight, 24);
  ctx.fillStyle = accent;
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.font = '900 35px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${rank}`, x + 50, y + rowHeight / 2);
  ctx.textAlign = 'left';

  await drawLeaderboardAvatar(ctx, entry.user, x + 105, y + 16, 60, accent);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 25px Arial, sans-serif';
  ctx.fillText(fitText(ctx, entry.displayName ?? entry.user?.username ?? `User ${entry.userId}`, 315), x + 184, y + 39);

  ctx.fillStyle = '#fde68a';
  ctx.font = '800 17px Arial, sans-serif';
  ctx.fillText(`Text LV ${levels.text.level}   Voice LV ${levels.voice.level}`, x + 184, y + 67);

  const barX = x + 496;
  const barY = y + 60;
  const barWidth = 210;
  const barHeight = 13;
  roundRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fill();

  const safeProgress = clamp01(progress);
  if (safeProgress > 0) {
    roundRect(ctx, barX, barY, Math.max(barHeight, barWidth * safeProgress), barHeight, barHeight / 2);
    const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    progressGradient.addColorStop(0, accent);
    progressGradient.addColorStop(1, '#fde68a');
    ctx.fillStyle = progressGradient;
    ctx.fill();
  }

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '900 17px Arial, sans-serif';
  ctx.fillText(`${formatNumber(entry.xp)} XP`, barX, y + 40);

  roundRect(ctx, x + width - 176, y + 18, 134, 56, 18);
  const levelGradient = ctx.createLinearGradient(x + width - 176, y + 18, x + width - 42, y + 74);
  levelGradient.addColorStop(0, hexToRgba(accent, 0.17));
  levelGradient.addColorStop(1, 'rgba(255,255,255,0.07)');
  ctx.fillStyle = levelGradient;
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.34);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '900 17px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL', x + width - 109, y + 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 32px Arial, sans-serif';
  ctx.fillText(`${levels.total.level}`, x + width - 109, y + 70);
  ctx.textAlign = 'left';
}

async function drawLeaderboardAvatar(ctx, user, x, y, size, accent) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  try {
    const avatarUrl = user?.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
    if (!avatarUrl) throw new Error('Missing avatar URL');
    const response = await fetch(avatarUrl);
    if (!response.ok) throw new Error(`Avatar request failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const avatar = await loadImage(buffer);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, x, y, size, size);
    ctx.restore();
  } catch {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 + 3, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDarkPanel(ctx, x, y, width, height, radius) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.42)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fill();
  ctx.restore();

  roundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawGlow(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, hexToRgba(color, alpha));
  gradient.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function rankAccent(rank) {
  if (rank === 1) return '#fbbf24';
  if (rank === 2) return '#cbd5e1';
  if (rank === 3) return '#f97316';
  return '#fde68a';
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-US');
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function fitText(ctx, value, maxWidth) {
  const text = String(value ?? '');
  if (ctx.measureText(text).width <= maxWidth) return text;

  let trimmed = text;
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed.length > 0 ? `${trimmed}...` : '';
}

function hexToRgba(hex, alpha = 1) {
  const fallback = `rgba(251, 191, 36, ${alpha})`;
  if (typeof hex !== 'string' || !hex.startsWith('#')) return fallback;

  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((char) => char + char).join('')
    : clean.slice(0, 6);

  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return fallback;

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
