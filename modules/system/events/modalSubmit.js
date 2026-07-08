const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFESSION_CHANNEL_ID = '1422879830306717706';
const LOG_CHANNEL_ID = '1422888371008700438';
const GIRLS_CONFESSION_CHANNEL_ID = '1523051575638098051';
const GIRLS_LOG_CHANNEL_ID = '1523057492773306579';
const APPROVE_ROLE_ID = '1417802492187512932';
const COUNT_FILE = path.join(__dirname, '../data/confessionCount.json');

const pendingConfessions = new Map();
const confessionThreads = new Map();
const CONFIG_BANNER_URL = process.env.CONFESSION_BANNER_URL || '';

function loadCount() {
  try { return JSON.parse(fs.readFileSync(COUNT_FILE, 'utf8')); } catch { return { count: 0, lastMessageId: null }; }
}

async function saveCount(data) {
  await fs.promises.writeFile(COUNT_FILE, JSON.stringify(data, null, 2));
}

function buildConfessionEmbed(number, confession, imageUrl) {
  const embed = new EmbedBuilder()
    .setTitle(`<a:15831lovenote:1469294524500021334> Anonymous Confession #${number}`)
    .setDescription(confession)
    .setColor(0xffffff)
    .setTimestamp();

  if (imageUrl) embed.setImage(imageUrl);
  else if (CONFIG_BANNER_URL) embed.setImage(CONFIG_BANNER_URL);

  return embed;
}

module.exports.pendingConfessions = pendingConfessions;
module.exports.confessionThreads = confessionThreads;
module.exports.buildConfessionEmbed = buildConfessionEmbed;
module.exports.name = 'interactionCreate';
module.exports.execute = async function(interaction) {
  // ===== MODAL SUBMIT =====
  if (interaction.isModalSubmit()) {
    const [type, , channelId] = interaction.customId.split('_');
    const channel = interaction.guild.channels.cache.get(channelId);

    if (type === 'rename' && channel) {
      const name = interaction.fields.getTextInputValue('new_name');
      await channel.setName(name);
      return interaction.reply({ content: '✅ Channel renamed.', flags: 64 });
    }

    if (type === 'limit' && channel) {
      const limit = parseInt(interaction.fields.getTextInputValue('limit'));
      if (isNaN(limit) || limit < 0 || limit > 99) {
        return interaction.reply({ content: '❌ Invalid number.', flags: 64 });
      }
      await channel.setUserLimit(limit);
      return interaction.reply({ content: '✅ User limit updated.', flags: 64 });
    }

    if (interaction.customId.startsWith('confessReply_')) {
      const msgId = interaction.customId.slice('confessReply_'.length);
      const replyText = interaction.fields.getTextInputValue('replyText');

      await interaction.deferReply({ flags: 64 });

      try {
        const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);
        if (!msg) return interaction.editReply('Original confession not found.');

        const originalTitle = msg.embeds[0]?.title || '';
        const match = originalTitle.match(/#(\d+)/);
        const num = match ? match[1] : '';

        const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return interaction.editReply('Log channel not found.');

        const reviewEmbed = new EmbedBuilder()
          .setTitle('⏳ Pending Reply')
          .setDescription(replyText)
          .addFields(
            { name: 'Replying to', value: `Confession #${num || '?'} | [Jump](${msg.url})`, inline: false },
            { name: 'Submitted by', value: `<@${interaction.user.id}>`, inline: false }
          )
          .setColor(0xf1c40f)
          .setTimestamp();

        const reviewRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('confess_approve').setLabel('Approve').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('confess_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const logMsg = await logChannel.send({ embeds: [reviewEmbed], components: [reviewRow] });

        pendingConfessions.set(logMsg.id, {
          type: 'reply',
          replyText,
          originalMsgId: msgId,
          confessionNum: num,
          userId: interaction.user.id
        });

        return interaction.editReply('Reply submitted for review.');
      } catch (err) {
        console.error('Reply error:', err);
        return interaction.editReply('Could not process reply.');
      }
    }

    if (interaction.customId === 'confessionModal') {
      const confession = interaction.fields.getTextInputValue('confessionText');

      await interaction.deferReply({ flags: 64 });

      try {
        const channel = interaction.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
        if (!channel) {
          return interaction.editReply({ content: '❌ Confession channel not found.' });
        }

        const thread = await channel.threads.create({
          name: `confession-${interaction.user.username}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 90) || 'confession',
          type: ChannelType.PrivateThread,
          invitable: false,
          reason: 'Confession submission'
        });

        await thread.members.add(interaction.user.id);

        await thread.send({ content: `**Your confession:**\n${confession}` });

        const uploadEmbed = new EmbedBuilder()
          .setTitle('<a:15831lovenote:1469294524500021334> Upload Images (Optional)')
          .setDescription('Drag and drop any images below, then click **Submit** when done.\n\nIf you have no images, just click **Submit** directly.')
          .setColor(0x9b59b6);

        const submitRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confession_submit')
            .setLabel('Submit')
            .setStyle(ButtonStyle.Success)
            .setEmoji('<a:arewws:1516459068519223326>')
        );

        await thread.send({ embeds: [uploadEmbed], components: [submitRow] });

        confessionThreads.set(thread.id, { userId: interaction.user.id, confessionText: confession });

        return interaction.editReply({ content: `✅ Private thread created: ${thread}. Upload images if you want, then click Submit.` });
      } catch (err) {
        console.error('Confession modal error:', err);
        return interaction.editReply({ content: '❌ Could not create thread. Try again later.' });
      }
    }

    if (interaction.customId === 'girlsConfessionModal') {
      const confession = interaction.fields.getTextInputValue('confessionText');

      await interaction.deferReply({ flags: 64 });

      try {
        const channel = interaction.guild.channels.cache.get(GIRLS_CONFESSION_CHANNEL_ID);
        if (!channel) {
          return interaction.editReply({ content: '❌ Girls confession channel not found.' });
        }

        const thread = await channel.threads.create({
          name: `girls-confession-${interaction.user.username}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 90) || 'girls-confession',
          type: ChannelType.PrivateThread,
          invitable: false,
          reason: 'Girls confession submission'
        });

        await thread.members.add(interaction.user.id);
        await thread.send({ content: `**Your confession:**\n${confession}` });

        const uploadEmbed = new EmbedBuilder()
          .setTitle('<a:15831lovenote:1469294524500021334> Upload Images (Optional)')
          .setDescription('Drag and drop any images below, then click **Submit** when done.\n\nIf you have no images, just click **Submit** directly.')
          .setColor(0xffffff);

        const submitRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('girls_confession_submit')
            .setLabel('Submit')
            .setStyle(ButtonStyle.Success)
            .setEmoji('<a:arewws:1516459068519223326>')
        );

        await thread.send({ embeds: [uploadEmbed], components: [submitRow] });

        confessionThreads.set(thread.id, { userId: interaction.user.id, confessionText: confession, type: 'girls' });

        return interaction.editReply({ content: `✅ Private thread created: ${thread}. Upload images if you want, then click Submit.` });
      } catch (err) {
        console.error('Girls confession modal error:', err);
        return interaction.editReply({ content: '❌ Could not create thread. Try again later.' });
      }
    }

  }

  // ===== BUTTONS =====
  if (interaction.isButton()) {
    if (interaction.customId === 'confess_approve' || interaction.customId === 'confess_cancel' || interaction.customId === 'girls_confess_approve' || interaction.customId === 'girls_confess_cancel') {
      const isApprove = interaction.customId === 'confess_approve' || interaction.customId === 'girls_confess_approve';
      const isGirls = interaction.customId === 'girls_confess_approve' || interaction.customId === 'girls_confess_cancel';

      if (!interaction.member.roles.cache.has(APPROVE_ROLE_ID) && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: 'You do not have permission.', flags: 64 });
      }

      const data = pendingConfessions.get(interaction.message.id);
      if (!data) {
        return interaction.reply({ content: 'This confession has already been processed.', flags: 64 });
      }

      pendingConfessions.delete(interaction.message.id);

      if (isApprove) {
        if (data.type === 'reply') {
          const confessionChannel = interaction.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
          if (confessionChannel) {
            try {
              const originalMsg = await confessionChannel.messages.fetch(data.originalMsgId).catch(() => null);
              if (originalMsg) {
                const replyEmbed = new EmbedBuilder()
                  .setTitle(`<a:15831lovenote:1469294524500021334> Anonymous Reply${data.confessionNum ? ` to Confession #${data.confessionNum}` : ''}`)
                  .setDescription(data.replyText)
                  .setColor(0xffffff)
                  .setTimestamp();

                const replyRow = new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setCustomId('confession_btn').setLabel('Submit a Confession').setStyle(ButtonStyle.Secondary).setEmoji('<a:arewws:1516459068519223326>'),
                  new ButtonBuilder().setCustomId('confess_reply').setLabel('Reply').setStyle(ButtonStyle.Primary)
                );

                await originalMsg.reply({ embeds: [replyEmbed], components: [replyRow], allowedMentions: { repliedUser: false } });
                await originalMsg.edit({ components: [] }).catch(() => {});
              }
            } catch {}
          }
          await interaction.message.edit({
            embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x00ff00).setTitle('✅ Approved Reply')],
            components: []
          });
        } else if (isGirls) {
          const girlsChannel = interaction.guild.channels.cache.get(GIRLS_CONFESSION_CHANNEL_ID);
          if (girlsChannel) {
            const countData = loadCount();
            countData.count += 1;
            const number = countData.count;

            const anonEmbed = buildConfessionEmbed(number, data.confession, data.imageUrl);

            const submitRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('girls_confession_btn').setLabel('Submit a Confession').setStyle(ButtonStyle.Secondary).setEmoji('<a:arewws:1516459068519223326>')
            );

            const newMsg = await girlsChannel.send({ embeds: [anonEmbed], components: [submitRow] });

            if (countData.lastMessageId) {
              try {
                const prevMsg = await girlsChannel.messages.fetch(countData.lastMessageId).catch(() => null);
                if (prevMsg) {
                  await prevMsg.edit({ components: [] }).catch(() => {});
                }
              } catch {}
            }

            countData.lastMessageId = newMsg.id;
            await saveCount(countData);
          }

          await interaction.message.edit({
            embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x00ff00).setTitle('✅ Approved Girls Confession')],
            components: []
          });
        } else {
          const confessionChannel = interaction.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
          if (confessionChannel) {
            const countData = loadCount();
            countData.count += 1;
            const number = countData.count;

            const anonEmbed = buildConfessionEmbed(number, data.confession, data.imageUrl);

            const submitRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('confession_btn').setLabel('Submit a Confession').setStyle(ButtonStyle.Secondary).setEmoji('<a:arewws:1516459068519223326>'),
              new ButtonBuilder().setCustomId('confess_reply').setLabel('Reply').setStyle(ButtonStyle.Primary)
            );

            const newMsg = await confessionChannel.send({ embeds: [anonEmbed], components: [submitRow] });

            if (countData.lastMessageId) {
              try {
                const prevMsg = await confessionChannel.messages.fetch(countData.lastMessageId).catch(() => null);
                if (prevMsg) {
                  await prevMsg.edit({ components: [] }).catch(() => {});
                }
              } catch {}
            }

            countData.lastMessageId = newMsg.id;
            await saveCount(countData);
          }

          await interaction.message.edit({
            embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x00ff00).setTitle('✅ Approved Confession')],
            components: []
          });
        }
      } else {
        await interaction.message.edit({
          embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor(0xff0000).setTitle(data.type === 'reply' ? '❌ Cancelled Reply' : '❌ Cancelled Confession')],
          components: []
        });
      }

      return interaction.reply({ content: `Confession ${isApprove ? 'approved' : 'cancelled'}.`, flags: 64 });
    }

    if (interaction.customId === 'confess_reply') {
      const modal = new ModalBuilder()
        .setCustomId(`confessReply_${interaction.message.id}`)
        .setTitle('Reply to Confession');

      const input = new TextInputBuilder()
        .setCustomId('replyText')
        .setLabel('Your reply')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }
  }
};
