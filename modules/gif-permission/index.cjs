const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const GIF_PERMISSION_ROLE_ID = '1417802506356133929';
const SERVER_TAG_ROLE_ID = '1424852764642775141';
const GIF_PERMISSION_CATEGORY_ID = '1417802602648834118';

function registerGifPermission(client) {

const AI_API_KEY = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
const GIF_PERMISSION_PANEL_CHANNEL_ID = process.env.GIF_PERMISSION_PANEL_CHANNEL_ID || '';
const GIF_PERMISSION_LOG_CHANNEL_ID = process.env.GIF_PERMISSION_LOG_CHANNEL_ID || '';

const PANEL_FILE = path.join(__dirname, 'panel_message.json');
let panelData = {};
try {
  if (fs.existsSync(PANEL_FILE)) panelData = JSON.parse(fs.readFileSync(PANEL_FILE, 'utf8'));
} catch { panelData = {}; }

async function savePanelData() {
  await fs.promises.writeFile(PANEL_FILE, JSON.stringify(panelData, null, 2)).catch(() => {});
}

const activeVerifications = new Map();
const pendingImages = new Map();

function findActiveByChannelId(channelId) {
  for (const [userId, entry] of activeVerifications.entries()) {
    if (entry.channelId === channelId) return { userId, ...entry };
  }
  return null;
}

function buildClaimPanel() {
  const embed = new EmbedBuilder()
    .setColor(0xc9c9c9)
    .setDescription(`## <a:15831lovenote:1469294524500021334> GIF Permission Verification
Want access to upload and use GIFs in NYXEN <:DV_Ques:1467410089114603774>
Upload a clear profile screenshot and the bot will grant roles based on what is visible:

GIF Permission role: add this exact server invite link to your Discord profile:
<a:arewws:1516459068519223326> | **https://discord.gg/Bev3MJnJpQ** |

Server Tag role: enable the NYXEN server tag on your profile.

<a:3376blueexplosion:1473722191941210245> If both are visible, you receive both roles.
<a:3376blueexplosion:1473722191941210245> If only the server tag is visible, you receive only <@&1424852764642775141>.
<a:3376blueexplosion:1473722191941210245> If only the invite link is visible, you receive only the GIF Permission role.

<:42920arrowrightalt:1474946022953189486> Click the button below to claim the GIF Permission role.

Gif Perm Role : <@&1417802506356133929>
Server Tag Role : <@&1424852764642775141>`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gif_claim_btn')
      .setLabel('Claim GIF Perm')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('<:586735checkmark:1472282353337368587>')
  );

  return { embeds: [embed], components: [row] };
}

async function ensurePanel() {
  if (!GIF_PERMISSION_PANEL_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(GIF_PERMISSION_PANEL_CHANNEL_ID);
    if (!channel) return;
    const payload = buildClaimPanel();
    if (panelData.channelId === GIF_PERMISSION_PANEL_CHANNEL_ID && panelData.messageId) {
      try {
        const oldMsg = await channel.messages.fetch(panelData.messageId);
        if (oldMsg.author.id === client.user.id) {
          await oldMsg.edit(payload);
          return;
        }
      } catch {}
    }
    const sent = await channel.send(payload);
    panelData = { channelId: GIF_PERMISSION_PANEL_CHANNEL_ID, messageId: sent.id };
    await savePanelData();
  } catch (err) {
    console.warn(`GIF Permission panel skipped: ${err.message}`);
  }
}

async function createVerificationChannel(userId, guild) {
  if (activeVerifications.has(userId)) {
    const existing = activeVerifications.get(userId);
    try {
      const ch = await guild.channels.fetch(existing.channelId).catch(() => null);
      if (ch) return { channel: ch, alreadyExists: true };
    } catch {}
    activeVerifications.delete(userId);
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return null;

  const username = member.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20) || 'user';

  const channel = await guild.channels.create({
    name: `gif-verify-${username}`,
    type: ChannelType.GuildText,
    parent: GIF_PERMISSION_CATEGORY_ID,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AddReactions
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ]
  });

  return { channel, alreadyExists: false };
}

function buildVerificationEmbed() {
  return new EmbedBuilder()
    .setColor(0x8f7a7a)
    .setTitle('<:23:1473011496446464112> GIF Permission Verification')
    .setDescription(
      'Please upload **one clear screenshot** of your Discord profile.\n\n' +
      'Your screenshot can show the NYXEN invite link, the NYXEN server tag, or both.\n\n' +
      'Invite link gives the GIF Permission role.\n' +
      'Server tag gives only the Server Tag role.\n' +
      'If both are visible, you receive both roles.\n\n' +
      'Once your screenshot has been uploaded, press the **Verify** button below.'
    );
}

function buildVerificationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gif_verify_btn')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('<:586735checkmark:1472282353337368587>'),
    new ButtonBuilder()
      .setCustomId('gif_cancel_btn')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('<:no:1470786991451930735>')
  );
}

function buildSuccessEmbed(awardedRoleIds) {
  const awardedText = awardedRoleIds.length > 0
    ? awardedRoleIds.map((roleId) => `<@&${roleId}>`).join('\n')
    : 'No roles were awarded.';

  return new EmbedBuilder()
    .setColor(0xc7c7c7)
    .setTitle('<:586735checkmark:1472282353337368587> Verification Successful')
    .setDescription(`Your screenshot has been successfully verified.\nYou have received:\n${awardedText}`);
}

function buildFailureEmbed(reason) {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('<:no:1470786991451930735> Verification Failed')
    .setDescription(reason || 'Your screenshot could not be verified. Please try again.');
}

async function verifyImageWithAI(imageUrl, userTag) {
  if (!AI_API_KEY) {
    return { approved: false, confidence: 0, reason: 'AI API key is not configured.' };
  }

  try {
    const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imageRes.ok) {
      return { approved: false, confidence: 0, reason: 'Failed to download the uploaded screenshot.' };
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/png';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const systemPrompt = `You are a verification assistant. You MUST return ONLY valid JSON (no markdown, no code blocks, no extra text) with this exact structure:
{
  "approved": true or false,
  "confidence": number between 0 and 100,
  "hasInviteLink": true or false,
  "hasServerTag": true or false,
  "reason": "short explanation"
}

Check this Discord profile screenshot for the NYXEN server.

The user claiming this role is: ${userTag}
The profile screenshot MUST show THEIR OWN profile - the Discord username/tag visible in the screenshot must match "${userTag}".

Verify:
1. Is this a real Discord profile screenshot? (not edited/fake)
2. Does the Discord username/tag in the screenshot match "${userTag}"? Reject if it's someone else's profile.
3. Set "hasInviteLink" to true only if the NYXEN Discord invite link "discord.gg/Bev3MJnJpQ" is clearly visible somewhere in the profile.
4. Set "hasServerTag" to true only if the NYXEN server tag/member badge is clearly visible.
5. Is the screenshot clear enough to read?
6. Does the screenshot appear authentic and unedited?

Set "approved" to true if the screenshot is authentic, clear, matches "${userTag}", and either hasInviteLink or hasServerTag is true.
Reject immediately if the username does not match.
Important: the server tag alone does NOT qualify for the GIF Permission role. The invite link alone qualifies only for the GIF Permission role. If both are visible, both roles can be awarded.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Verify this Discord profile screenshot.' },
              { type: 'image_url', image_url: { url: dataUri } }
            ]
          }
        ],
        max_tokens: 300
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown');
      console.error('OpenRouter API error:', response.status, errText);
      return { approved: false, confidence: 0, reason: `AI verification service returned status ${response.status}.` };
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI returned invalid format:', text);
      return { approved: false, confidence: 0, reason: 'AI returned an invalid response format.' };
    }

    const result = JSON.parse(jsonMatch[0]);
    const hasInviteLink = Boolean(result.hasInviteLink);
    const hasServerTag = Boolean(result.hasServerTag);

    return {
      approved: Boolean(result.approved) && (hasInviteLink || hasServerTag),
      confidence: Number(result.confidence) || 0,
      hasInviteLink,
      hasServerTag,
      reason: String(result.reason || 'No reason provided.')
    };
  } catch (err) {
    console.error('AI verification error:', err);
    return { approved: false, confidence: 0, reason: `Verification error: ${err.message}` };
  }
}

async function logVerification(guild, data) {
  if (!GIF_PERMISSION_LOG_CHANNEL_ID) return;
  try {
    const logChannel = await guild.channels.fetch(GIF_PERMISSION_LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(data.approved ? 0x1f8b4c : 0xff0000)
      .setTitle('GIF Permission Verification Log')
      .addFields(
        { name: 'User', value: `<@${data.userId}> (${data.userTag})`, inline: false },
        { name: 'Status', value: data.approved ? '✅ Approved' : '❌ Rejected', inline: true },
        { name: 'Confidence', value: `${data.confidence}%`, inline: true },
        { name: 'Invite Link', value: data.hasInviteLink ? 'Yes' : 'No', inline: true },
        { name: 'Server Tag', value: data.hasServerTag ? 'Yes' : 'No', inline: true },
        { name: 'Reason', value: data.reason, inline: false },
        { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp();

    if (data.screenshotUrl) {
      embed.setImage(data.screenshotUrl);
    }

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('GIF Permission log error:', err);
  }
}

client.once(Events.ClientReady, async () => {
  await ensurePanel();
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const activeEntry = findActiveByChannelId(message.channel.id);
  if (!activeEntry) return;

  if (message.author.id !== activeEntry.userId) {
    await message.delete().catch(() => {});
    return;
  }

  const imageAttachment = message.attachments.find(a => {
    const type = (a.contentType || '').toLowerCase();
    return type.startsWith('image/');
  });

  if (!imageAttachment) {
    await message.delete().catch(() => {});
    const warning = await message.channel.send({ content: `${message.author}, please upload only image files (PNG, JPEG, GIF).` }).catch(() => {});
    setTimeout(() => warning?.delete().catch(() => {}), 5000);
    return;
  }

  if (imageAttachment.size > 10 * 1024 * 1024) {
    await message.delete().catch(() => {});
    const warning = await message.channel.send({ content: `${message.author}, the image is too large. Maximum size is 10MB.` }).catch(() => {});
    setTimeout(() => warning?.delete().catch(() => {}), 5000);
    return;
  }

  const prevData = pendingImages.get(message.channel.id);
  if (prevData && prevData.messageId) {
    try {
      const prevMsg = await message.channel.messages.fetch(prevData.messageId).catch(() => null);
      if (prevMsg) await prevMsg.delete().catch(() => {});
    } catch {}
  }

  pendingImages.set(message.channel.id, {
    userId: message.author.id,
    imageUrl: imageAttachment.url,
    messageId: message.id
  });

  await message.channel.send({ content: `${message.author}, screenshot received. You can now press **Verify**.` }).then(m => {
    setTimeout(() => m?.delete().catch(() => {}), 4000);
  }).catch(() => {});
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  const { customId } = interaction;

  if (customId === 'gif_claim_btn') {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const result = await createVerificationChannel(interaction.user.id, guild);

    if (!result) {
      return interaction.editReply({ content: 'Failed to create verification channel. Please try again later.' });
    }

    if (result.alreadyExists) {
      return interaction.editReply({ content: `You already have an active verification channel: <#${result.channel.id}>` });
    }

    activeVerifications.set(interaction.user.id, {
      channelId: result.channel.id,
      createdAt: Date.now()
    });

    const embed = buildVerificationEmbed();
    const buttons = buildVerificationButtons();
    await result.channel.send({ embeds: [embed], components: [buttons] });
    await result.channel.send({ content: `<@${interaction.user.id}>` }).then(m => setTimeout(() => m.delete().catch(() => {}), 1000)).catch(() => {});

    return interaction.editReply({ content: `Your verification channel has been created: <#${result.channel.id}>` });
  }

  if (customId === 'gif_verify_btn') {
    await interaction.deferReply({ ephemeral: true });

    const channelId = interaction.channel.id;
    const activeEntry = findActiveByChannelId(channelId);

    if (!activeEntry || interaction.user.id !== activeEntry.userId) {
      return interaction.editReply({ content: 'You cannot use this button.' });
    }

    const pendingImage = pendingImages.get(channelId);
    if (!pendingImage) {
      return interaction.editReply({ content: 'Please upload a screenshot first before pressing Verify.' });
    }

    const loadingMsg = await interaction.channel.send({ content: '🔍 Verifying your screenshot with AI...' }).catch(() => {});

    const result = await verifyImageWithAI(pendingImage.imageUrl, interaction.user.tag);

    if (loadingMsg) await loadingMsg.delete().catch(() => {});

    const guild = interaction.guild;

    if (result.approved && result.confidence >= 95) {
      const origMsg = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
      if (origMsg) {
        try {
          const disabledRow = ActionRowBuilder.from(origMsg.components[0]);
          disabledRow.components.forEach(c => c.setDisabled(true));
          await origMsg.edit({ components: [disabledRow] }).catch(() => {});
        } catch {}
      }

      const awardedRoleIds = [];
      if (result.hasInviteLink) awardedRoleIds.push(GIF_PERMISSION_ROLE_ID);
      if (result.hasServerTag) awardedRoleIds.push(SERVER_TAG_ROLE_ID);

      const member = await guild.members.fetch(activeEntry.userId).catch(() => null);
      if (member) {
        await member.roles.add(awardedRoleIds, 'GIF/profile verification approved').catch(err => {
          console.error('Failed to add verified profile roles:', err);
        });
      }

      await interaction.channel.send({ embeds: [buildSuccessEmbed(awardedRoleIds)] }).catch(() => {});

      await logVerification(guild, {
        userId: activeEntry.userId,
        userTag: interaction.user.tag,
        approved: true,
        confidence: result.confidence,
        hasInviteLink: result.hasInviteLink,
        hasServerTag: result.hasServerTag,
        reason: result.reason,
        screenshotUrl: pendingImage.imageUrl
      });

      setTimeout(async () => {
        activeVerifications.delete(activeEntry.userId);
        pendingImages.delete(channelId);
        await interaction.channel.delete('GIF Permission verification completed').catch(() => {});
      }, 30000);

      return interaction.editReply({ content: '✅ Verification successful! Channel will be deleted shortly.' });
    } else {
      await logVerification(guild, {
        userId: activeEntry.userId,
        userTag: interaction.user.tag,
        approved: false,
        confidence: result.confidence,
        hasInviteLink: result.hasInviteLink,
        hasServerTag: result.hasServerTag,
        reason: result.reason,
        screenshotUrl: pendingImage.imageUrl
      });

      pendingImages.delete(channelId);

      await interaction.channel.send({ embeds: [buildFailureEmbed(result.reason)] }).catch(() => {});

      return interaction.editReply({ content: '❌ Verification failed. You can upload a new screenshot and try again.' });
    }
  }

  if (customId === 'gif_cancel_btn') {
    await interaction.deferReply({ ephemeral: true });

    const channelId = interaction.channel.id;
    const activeEntry = findActiveByChannelId(channelId);

    const isOwner = activeEntry && interaction.user.id === activeEntry.userId;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      return interaction.editReply({ content: 'You cannot cancel this verification.' });
    }

    const targetUserId = activeEntry ? activeEntry.userId : interaction.user.id;
    activeVerifications.delete(targetUserId);
    pendingImages.delete(channelId);

    await interaction.channel.delete('GIF Permission verification cancelled').catch(() => {});
    return interaction.editReply({ content: 'Verification cancelled. Channel deleted.' }).catch(() => {});
  }
});

}

module.exports = { registerGifPermission };
