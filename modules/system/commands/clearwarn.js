const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const modlogsPath = path.join(__dirname, '../data/modlogs.json');
function readModlogs() { try { return JSON.parse(fs.readFileSync(modlogsPath, 'utf8') || '{}'); } catch { return {}; } }

const logChannelId = '1519422796604903465';

module.exports = {
    name: 'clearwarn',
    description: '**Reset a member\'s warnings.**',
    async execute(message, args) {
        const modlogs = readModlogs();
        // --- PERMISSION CHECK ---
        const allowedRoleId = '1417802492187512932';
        if (
            !message.member.permissions.has('Administrator') && 
            !message.member.roles.cache.has(allowedRoleId)
        ) {
            return;
        }

        // --- ARGUMENT CHECK ---
        const userId = args[0];
        if (!userId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription('**Missing MEMBER ID.**')
                .setColor('Red')
                .setTimestamp();
            return message.channel.send({ embeds: [errorEmbed] });
        }

        // --- RESET WARNINGS ---
        if (modlogs[userId]) {
            modlogs[userId].warn = 0;
            modlogs[userId].history = [];
            await fs.promises.writeFile(require('path').join(__dirname, '../data/modlogs.json'), JSON.stringify(modlogs, null, 2));
        }

        // --- SUCCESS EMBED ---
        const embed = new EmbedBuilder()
            .setTitle('CLEAR WARNS')
            .setDescription(`**<a:DVrefresh:1467408774745554986> The warnings for ${userId} have been reset.**`)
            .setColor(0x929090)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });

        // --- LOG CHANNEL ---
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
                .setTitle('CLEAR WARNS')
                .setDescription(`**<a:DVrefresh:1467408774745554986> Warnings cleared for ${userId}**`)
                .addFields(
                    { name: '**<:AR_shield:1463435777894781071> Moderator :**', value: message.author.tag, inline: true },
                    { name: '**<:membr:1464331396284809364> Member :**', value: `<@${userId}> (${userId})`, inline: true },
                    { name: '**<a:Earthd:1464307651323363529> Date :**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setColor(0x929090)
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        }
    }
};
