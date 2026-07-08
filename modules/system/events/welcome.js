const { EmbedBuilder, Colors } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    try {
      // Embed الترحيب للقناة
      const channelEmbed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(` <a:h3:1464354548553355426> Welcome too **${member.guild.name}** !!`)
        .setDescription(` <a:whitestars:1463491918527856780> **Welcome <@${member.id}>! **
        **We’re happy to have you here.**
        
        ** <a:arrowgold:1463491747303657520> Make yourself at home and enjoy the vibes!**
        
        **owner User: unfuckwithable3** `)
        .setImage("https://media.discordapp.net/attachments/1517874322428133571/1520553068486459552/image.png?ex=6a419ce6&is=6a404b66&hm=5bad756555932e4aed20cc10085639b83577b7da5244262c81f459577e404335&=&format=webp&quality=lossless&width=1045&height=286")
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      // قناة الترحيب
      const welcomeChannel = member.guild.channels.cache.get('1417802660509122685');
      if (welcomeChannel) welcomeChannel.send({ embeds: [channelEmbed] });

      // Embed الترحيب فال DM
      const dmEmbed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(` Welcome To NYXEN COMMUNITY`)
        .setDescription(`**<a:2751whitesparklingstars:1467936611152171320>  Hey <@${member.id}>! , welcome to ${member.guild.name}

You’ve just joined a community focused on ART <:Screenshot_20260615_000851remove:1516038437252239462>**

**<:1333177605624565880:1463482367615303713> 𝐂𝐎𝐌𝐌𝐔𝐍𝐈𝐓𝐘 𝐑𝐔𝐋𝐄𝐒 :**

**read the rules to keep the vibe clean and friendly.** https://discord.com/channels/1417800065967325216/1417802723415425075

### <a:arewws:1516459068519223326>  Getting Started :
  **Let us know who you are!!**

  **Don’t be shy—ask and join the conversations!**
 `)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage("https://media.discordapp.net/attachments/1477629389238960261/1516688491034050660/clipfly-ai-20260616191135.gif?ex=6a338dba&is=6a323c3a&hm=60f9f4b3beb9f77698a2c7fe31910be830ef491e427094f9970a394f3bd2d823&=&width=405&height=228")

      // نرسل DM
      try {
        await member.send({ embeds: [dmEmbed] });
      } catch {
        console.log(`ماقدرتش نرسل DM لـ ${member.user.tag}`);
      }

    } catch (err) {
      console.log(`وقع خطأ: ${err}`);
    }
  }
};
