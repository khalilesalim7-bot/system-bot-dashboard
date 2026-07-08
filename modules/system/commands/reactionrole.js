const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data/reactionRoles.json');

const allowedRoleId = '1417802492187512932';

module.exports = {
  name: 'addreactionrole',
  description: '**Add a reaction role to a message**',
  async execute(message, args) {
    if (!message.member.roles.cache.has(allowedRoleId) && !message.member.permissions.has('Administrator')) return;

    if (args.length < 3) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setTitle('Error').setDescription('**Usage: .addreactionrole <messageId> <roleId> <emoji>**').setColor('Red')]
      });
    }

    const msgId = args[0];
    const roleId = args[1];
    const emoji = args[2];

    const role = message.guild.roles.cache.get(roleId);
    if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setTitle('Error').setDescription('**Invalid Role ID.**').setColor('Red')] });

    let data = {};
    try { data = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch {}

    if (!data[msgId]) data[msgId] = {};
    data[msgId][emoji] = roleId;
    await fs.promises.writeFile(dataFile, JSON.stringify(data, null, 2));

    // Try to react to the message
    try {
      const channel = message.channel;
      const msg = await channel.messages.fetch(msgId);
      await msg.react(emoji);
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle('Reaction Role Added')
      .setDescription(`**Message:** ${msgId}\n**Role:** ${role}\n**Emoji:** ${emoji}`)
      .setColor(0x00ff00)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
