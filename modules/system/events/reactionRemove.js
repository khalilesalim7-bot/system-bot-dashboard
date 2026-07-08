const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data/reactionRoles.json');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user, client) {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => {});

    let data = {};
    try { data = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { return; }

    const msgId = reaction.message.id;
    const emojiKey = reaction.emoji.toString();

    if (!data[msgId]) return;

    const roleId = data[msgId]?.[emojiKey] || data[msgId]?.[reaction.emoji.name];
    if (!roleId) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = guild.roles.cache.get(roleId);
    if (!role) return;

    await member.roles.remove(role).catch(() => {});
  }
};
