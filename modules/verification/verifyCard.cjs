const { renderStatsCard } = require('../system/commands/inviteCard.cjs');

async function renderVerifyCard({ username, avatarUrl, userVerifications, todayVerifications, totalVerifications }) {
  return renderStatsCard({
    username,
    avatarUrl,
    subtitle: 'VERIFY',
    stats: [
      { label: 'TOTAL', value: totalVerifications || 0, icon: 'shield' },
      { label: 'TODAY', value: todayVerifications || 0, icon: 'calendar' },
      { label: 'YOURS', value: userVerifications || 0, icon: 'user' }
    ]
  });
}

module.exports = { renderVerifyCard };
