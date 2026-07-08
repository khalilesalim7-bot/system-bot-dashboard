const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'server',
    description: 'Shows server information',
    execute(message) {
        const { guild } = message;

        const embed = new EmbedBuilder()
            .setColor('#bd5a5a')
            .setTitle(`<a:400125purplebook:1467937849553981470> SERVER INFO`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '<:DVaa:1468325361535418760> NAME', value: guild.name, inline: true },
                { name: '<a:DVquestion_mark:1467415104785092761> ID', value: guild.id, inline: true },
                { name: ' OWNER <a:13768angelwing:1467942675255656468>', value: `<@${guild.ownerId}>`, inline: true },
                { name: '<:membr:1464331396284809364> MEMBERS', value: `${guild.memberCount}`, inline: true },
                { name: '<:26254directory:1467928139840880771> CHANNELS', value: `${guild.channels.cache.size}`, inline: true },
                { name: '<a:clockss:1464333581798346834> CREATED AT', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` }
            )
            .setFooter({ text: `HI! ${message.author.tag}` })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
