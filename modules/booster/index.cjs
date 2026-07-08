const fs = require("node:fs");
const path = require("node:path");
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder
} = require("discord.js");

const COMMAND_PREFIX = process.env.COMMAND_PREFIX || ".bootspanel";
const PANEL_OWNER_ID = process.env.PANEL_OWNER_ID || "1084793381491834890";
const BOOST_THANKS_CHANNEL_ID = process.env.BOOST_THANKS_CHANNEL_ID || "1417802734907687045";
const PANEL_CHANNEL_ID = process.env.PANEL_CHANNEL_ID || "1517160900602105876";
const BOOSTER_ROLE_ID = process.env.BOOSTER_ROLE_ID || "1417895783801294868";
const CUSTOM_ROLE_BELOW_ID = process.env.CUSTOM_ROLE_BELOW_ID || "1417933035239772200";
const CAN_RECREATE_ROLE_ID = process.env.CAN_RECREATE_ROLE_ID || "1417802492187512932";
const DELETE_ROLE_WHEN_BOOST_LOST = String(process.env.DELETE_ROLE_WHEN_BOOST_LOST || "true") === "true";
const BUTTON_EMOJIS = {
  createRole: process.env.BUTTON_CREATE_ROLE_EMOJI_ID || "",
  editRole: process.env.BUTTON_EDIT_ROLE_EMOJI_ID || "",
  autoReact: process.env.BUTTON_AUTO_REACT_EMOJI_ID || "",
  giveRole: process.env.BUTTON_GIVE_ROLE_EMOJI_ID || "",
  deleteRole: process.env.BUTTON_DELETE_ROLE_EMOJI_ID || "",
  deleteAutoReact: process.env.BUTTON_DELETE_AUTO_REACT_EMOJI_ID || "",
  confirmDelete: process.env.BUTTON_CONFIRM_DELETE_EMOJI_ID || "",
  cancelDelete: process.env.BUTTON_CANCEL_DELETE_EMOJI_ID || ""
};

const DB_PATH = path.join(__dirname, "data.json");
const PANEL_BANNER_PATH = path.join(__dirname, "assets", "booster-panel-banner.png");
const BOOST_THANKS_BANNER_PATH = path.join(__dirname, "assets", "boost-thanks-banner.png");

function loadDb() {
  if (!fs.existsSync(DB_PATH)) return { boosters: {} };
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch { return { boosters: {} }; }
}

async function saveDb(db) {
  await fs.promises.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

async function getBoosterData(userId) {
  const db = loadDb();
  db.boosters[userId] ||= { roleId: null, editCount: 0, deletedRole: false, autoReact: null };
  await saveDb(db);
  return db.boosters[userId];
}

async function updateBoosterData(userId, patch) {
  const db = loadDb();
  db.boosters[userId] ||= { roleId: null, editCount: 0, deletedRole: false, autoReact: null };
  db.boosters[userId] = { ...db.boosters[userId], ...patch };
  await saveDb(db);
  return db.boosters[userId];
}

async function clearBoosterData(userId) {
  const db = loadDb();
  delete db.boosters[userId];
  await saveDb(db);
}

function normalizeColor(color) {
  const value = color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return null;
  return Number.parseInt(value.slice(1), 16);
}

function cleanName(name) {
  return name.trim().slice(0, 80);
}

function cleanEmoji(emoji) {
  return emoji.trim().slice(0, 100);
}

function parseCustomEmoji(input) {
  const match = input.trim().match(/^<a?:[a-zA-Z0-9_]{2,32}:(\d{17,22})>$/);
  return match?.[1] || null;
}

async function resolveGuildCustomEmoji(guild, input) {
  const emojiId = parseCustomEmoji(input);
  if (!emojiId) return null;
  return guild.emojis.cache.get(emojiId) || guild.emojis.fetch(emojiId).catch(() => null);
}

function splitEmojiInput(input) {
  return input.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
}

async function parseReactionEmojis(guild, input, max, customOnly = false) {
  const values = splitEmojiInput(input);
  if (!values.length) return { error: "Add at least one emoji.", reactions: [] };
  if (values.length > max) return { error: `Maximum is ${max} emojis.`, reactions: [] };
  const reactions = [];
  for (const value of values) {
    const customEmojiId = parseCustomEmoji(value);
    if (customEmojiId) {
      const customEmoji = await resolveGuildCustomEmoji(guild, value);
      if (!customEmoji) return { error: "Custom emojis must be from this server.", reactions: [] };
      reactions.push({ type: "custom", id: customEmoji.id });
      continue;
    }
    if (customOnly) return { error: "Use only server custom emojis.", reactions: [] };
    reactions.push({ type: "unicode", value });
  }
  return { error: null, reactions };
}

function getAutoReactLists(autoReact) {
  if (!autoReact) return { mention: [], message: [] };
  return {
    mention: autoReact.mentionEmojis || (autoReact.mentionEmojiId ? [{ type: "custom", id: autoReact.mentionEmojiId }] : []),
    message: autoReact.messageEmojis || (autoReact.messageEmojiId ? [{ type: "custom", id: autoReact.messageEmojiId }] : [])
  };
}

function addButtonEmoji(button, emojiId) {
  if (!emojiId) return button;
  return button.setEmoji({ id: emojiId });
}

async function deleteAutoReactForUser(userId, choice) {
  const data = await getBoosterData(userId);
  const current = getAutoReactLists(data.autoReact);
  if (choice === "tag" || choice === "both") current.mention = [];
  if (choice === "message" || choice === "both") current.message = [];
  const nextAutoReact = current.mention.length || current.message.length
    ? { mentionEmojis: current.mention, messageEmojis: current.message }
    : null;
  await updateBoosterData(userId, { autoReact: nextAutoReact });
  return nextAutoReact;
}

async function reactWithStoredEmoji(message, storedEmoji) {
  if (!storedEmoji) return;
  if (typeof storedEmoji === "string") {
    const emoji = message.guild.emojis.cache.get(storedEmoji) || await message.guild.emojis.fetch(storedEmoji).catch(() => null);
    if (emoji) await message.react(emoji).catch(() => null);
    return;
  }
  if (storedEmoji.type === "custom") {
    const emoji = message.guild.emojis.cache.get(storedEmoji.id) || await message.guild.emojis.fetch(storedEmoji.id).catch(() => null);
    if (emoji) await message.react(emoji).catch(() => null);
    return;
  }
  if (storedEmoji.type === "unicode" && storedEmoji.value) {
    await message.react(storedEmoji.value).catch(() => null);
  }
}

function isBooster(member) {
  return member.roles.cache.has(BOOSTER_ROLE_ID);
}

function canRecreateAfterDelete(member) {
  return member.roles.cache.has(CAN_RECREATE_ROLE_ID);
}

async function requireAutoSetupRole(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "This command works only inside the server.", flags: 64 });
    return false;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!canRecreateAfterDelete(member)) {
    await interaction.reply({ content: `You need <@&${CAN_RECREATE_ROLE_ID}> to use this command.`, flags: 64 });
    return false;
  }
  return true;
}

function slashCommands() {
  return [
    new (require("discord.js").SlashCommandBuilder)()
      .setName("setupautoreact").setDescription("Set tag auto react emojis for a user. Max 3 emojis.")
      .addUserOption((o) => o.setName("user").setDescription("User to set").setRequired(true))
      .addStringOption((o) => o.setName("emojis").setDescription("Max 3 emojis").setRequired(true))
      .toJSON(),
    new (require("discord.js").SlashCommandBuilder)()
      .setName("setupmsgemoji").setDescription("Set message auto react emojis for a user. Max 2 emojis.")
      .addUserOption((o) => o.setName("user").setDescription("User to set").setRequired(true))
      .addStringOption((o) => o.setName("emojis").setDescription("Max 2 emojis").setRequired(true))
      .toJSON(),
    new (require("discord.js").SlashCommandBuilder)()
      .setName("deletereacttag").setDescription("Delete tag auto react emojis for a user.")
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .toJSON(),
    new (require("discord.js").SlashCommandBuilder)()
      .setName("deletereactmsg").setDescription("Delete message auto react emojis for a user.")
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .toJSON()
  ];
}

async function requireBooster(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "This panel works only inside the server.", flags: 64 });
    return false;
  }
  if (interaction.channelId !== PANEL_CHANNEL_ID) {
    await interaction.reply({ content: "This panel works only in the boost panel channel.", flags: 64 });
    return false;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isBooster(member)) {
    await interaction.reply({ content: "You need the booster role to use this panel.", flags: 64 });
    return false;
  }
  return true;
}

function panelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      addButtonEmoji(new ButtonBuilder().setCustomId("boost:create_role").setLabel("Create Role").setStyle(ButtonStyle.Secondary), BUTTON_EMOJIS.createRole),
      addButtonEmoji(new ButtonBuilder().setCustomId("boost:edit_role").setLabel("Edit Role").setStyle(ButtonStyle.Secondary), BUTTON_EMOJIS.editRole),
      addButtonEmoji(new ButtonBuilder().setCustomId("boost:auto_react").setLabel("Auto React").setStyle(ButtonStyle.Secondary), BUTTON_EMOJIS.autoReact),
      addButtonEmoji(new ButtonBuilder().setCustomId("boost:give_role").setLabel("Give Role").setStyle(ButtonStyle.Secondary), BUTTON_EMOJIS.giveRole)
    ),
    new ActionRowBuilder().addComponents(
      addButtonEmoji(new ButtonBuilder().setCustomId("boost:delete_role").setLabel("Delete Role").setStyle(ButtonStyle.Secondary), BUTTON_EMOJIS.deleteRole),
      addButtonEmoji(new ButtonBuilder().setCustomId("boost:delete_auto_react").setLabel("Delete Auto React").setStyle(ButtonStyle.Secondary), BUTTON_EMOJIS.deleteAutoReact)
    )
  ];
}

function panelEmbed() {
  return new EmbedBuilder()
    .setColor(0x980707)
    .setTitle("Boosters Control Panel")
    .setDescription("**Create your private booster role, edit it, set server-emoji auto reactions, and give your role to one member from the menu.**")
    .addFields(
      { name: "Limits", value: "1 custom role per booster\n3 edits per role", inline: true },
      { name: "Auto react", value: "Server custom emojis only", inline: true }
    )
    .setImage("attachment://booster-panel-banner.png");
}

async function sendPanel(channel) {
  const banner = new AttachmentBuilder(PANEL_BANNER_PATH, { name: "booster-panel-banner.png" });
  return channel.send({ embeds: [panelEmbed()], components: panelComponents(), files: [banner] });
}

function createRoleModal() {
  return new ModalBuilder().setCustomId("boost_modal:create_role").setTitle("Create booster role")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("role_name").setLabel("Role name").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("role_icon").setLabel("Role icon emoji").setPlaceholder("Example: <:Clueless:1145419577451352135>").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(120)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("role_color").setLabel("Role color").setPlaceholder("Example: #010000").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(7))
    );
}

function editRoleModal() {
  return new ModalBuilder().setCustomId("boost_modal:edit_role").setTitle("Edit booster role")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("role_name").setLabel("New role name").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("role_icon").setLabel("New role icon emoji").setPlaceholder("Example: <:Clueless:1145419577451352135>").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(120)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("role_color").setLabel("New role color").setPlaceholder("Example: #010000").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(7))
    );
}

function autoReactModal() {
  return new ModalBuilder().setCustomId("boost_modal:auto_react").setTitle("Auto react")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("mention_emoji").setLabel("Server emoji when someone tags you").setPlaceholder("Example: <:Clueless:1145419577451352135>").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(120)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("message_emoji").setLabel("Server emoji when you send a message").setPlaceholder("Example: <:Clueless:1145419577451352135>").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(120))
    );
}

async function setRoleEmoji(role, emoji, guild) {
  const value = cleanEmoji(emoji);
  if (!value) {
    await role.setUnicodeEmoji(null).catch(() => null);
    await role.setIcon(null).catch(() => null);
    return;
  }
  const customEmoji = await resolveGuildCustomEmoji(guild, value);
  if (parseCustomEmoji(value) && !customEmoji) throw new Error("Custom emoji must be from this server.");
  if (customEmoji) {
    const iconUrl = customEmoji.imageURL({ extension: "png", size: 128 });
    const response = await fetch(iconUrl);
    if (!response.ok) throw new Error("Could not download custom emoji image.");
    const iconBuffer = Buffer.from(await response.arrayBuffer());
    await role.setUnicodeEmoji(null).catch(() => null);
    await role.setIcon(iconBuffer);
    return;
  }
  await role.setIcon(null).catch(() => null);
  await role.setUnicodeEmoji(value);
}

async function moveRoleBelowAnchor(guild, role) {
  const anchorRole = guild.roles.cache.get(CUSTOM_ROLE_BELOW_ID) || await guild.roles.fetch(CUSTOM_ROLE_BELOW_ID).catch(() => null);
  if (!anchorRole) return;
  await role.setPosition(Math.max(anchorRole.position - 1, 1), `Move booster role below ${anchorRole.name}`).catch(() => null);
}

async function handleButton(interaction) {
  if (!(await requireBooster(interaction))) return;
  const data = await getBoosterData(interaction.user.id);

  if (interaction.customId.startsWith("boost:cancel_delete:")) {
    const ownerId = interaction.customId.split(":")[2];
    if (ownerId !== interaction.user.id) { await interaction.reply({ content: "This confirmation is not for you.", flags: 64 }); return; }
    await interaction.update({ content: "Delete cancelled.", components: [] });
    return;
  }

  if (interaction.customId.startsWith("boost:confirm_delete:")) {
    const ownerId = interaction.customId.split(":")[2];
    if (ownerId !== interaction.user.id) { await interaction.reply({ content: "This confirmation is not for you.", flags: 64 }); return; }
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const canCreateAgain = canRecreateAfterDelete(member);
    if (!data.roleId) {
      await updateBoosterData(interaction.user.id, { deletedRole: !canCreateAgain, autoReact: null });
      await interaction.update({ content: canCreateAgain ? "No role was found. You can create a new booster role." : "No role was found, but your booster role slot is now closed.", components: [] });
      return;
    }
    const role = interaction.guild.roles.cache.get(data.roleId);
    if (role) {
      await role.delete(`Booster custom role deleted by ${interaction.user.tag}`).catch(async () => {
        await removeRoleFromMembers(interaction.guild, role.id);
      });
    }
    await updateBoosterData(interaction.user.id, { roleId: null, editCount: 0, deletedRole: !canCreateAgain, autoReact: null });
    await interaction.update({ content: canCreateAgain ? "Your booster role was deleted. You can create a new one." : "Your booster role was deleted. You cannot create another one again.", components: [] });
    return;
  }

  if (interaction.customId === "boost:create_role") {
    if (data.deletedRole) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!canRecreateAfterDelete(member)) { await interaction.reply({ content: "You already deleted your booster role. You cannot create another one.", flags: 64 }); return; }
      await updateBoosterData(interaction.user.id, { deletedRole: false });
    }
    if (data.roleId) { await interaction.reply({ content: "You already created one booster role.", flags: 64 }); return; }
    await interaction.showModal(createRoleModal());
    return;
  }

  if (interaction.customId === "boost:edit_role") {
    if (!data.roleId) { await interaction.reply({ content: "Create your booster role first.", flags: 64 }); return; }
    if (data.editCount >= 3) { await interaction.reply({ content: "You already used your 3 role edits.", flags: 64 }); return; }
    await interaction.showModal(editRoleModal());
    return;
  }

  if (interaction.customId === "boost:auto_react") {
    await interaction.showModal(autoReactModal());
    return;
  }

  if (interaction.customId === "boost:delete_auto_react") {
    const autoReactLists = getAutoReactLists(data.autoReact);
    if (!autoReactLists.mention.length && !autoReactLists.message.length) { await interaction.reply({ content: "You do not have auto react to delete.", flags: 64 }); return; }
    const embed = new EmbedBuilder().setColor(0xb51f55).setTitle("Delete auto react").setDescription("Warning: choose which auto react you want to delete.")
      .addFields({ name: "Tag auto react", value: autoReactLists.mention.length ? "Active" : "Not set", inline: true }, { name: "Message auto react", value: autoReactLists.message.length ? "Active" : "Not set", inline: true });
    const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`boost_delete_auto_react:${interaction.user.id}`).setPlaceholder("Choose what to delete")
      .addOptions({ label: "delete tag auto react", value: "tag" }, { label: "delete message auto react", value: "message" }, { label: "delete both", value: "both" }));
    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
    return;
  }

  if (interaction.customId === "boost:give_role") {
    if (!data.roleId) { await interaction.reply({ content: "Create your booster role first.", flags: 64 }); return; }
    const role = interaction.guild.roles.cache.get(data.roleId);
    if (!role) { await updateBoosterData(interaction.user.id, { roleId: null }); await interaction.reply({ content: "Your old role was not found. Create a new one.", flags: 64 }); return; }
    const row = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId(`boost_user_select:${interaction.user.id}`).setPlaceholder("Choose a member").setMinValues(1).setMaxValues(1));
    await interaction.reply({ content: `Choose who gets ${role}.`, components: [row], flags: 64 });
  }

  if (interaction.customId === "boost:delete_role") {
    if (!data.roleId) { await interaction.reply({ content: "You do not have a booster role to delete.", flags: 64 }); return; }
    const row = new ActionRowBuilder().addComponents(
      addButtonEmoji(new ButtonBuilder().setCustomId(`boost:confirm_delete:${interaction.user.id}`).setLabel("yes delete").setStyle(ButtonStyle.Danger), BUTTON_EMOJIS.confirmDelete),
      addButtonEmoji(new ButtonBuilder().setCustomId(`boost:cancel_delete:${interaction.user.id}`).setLabel("cancel").setStyle(ButtonStyle.Secondary), BUTTON_EMOJIS.cancelDelete)
    );
    await interaction.reply({ content: "Warning: deleting your booster role is final.", components: [row], flags: 64 });
  }
}

async function handleCreateRole(interaction) {
  if (!(await requireBooster(interaction))) return;
  const data = await getBoosterData(interaction.user.id);
  if (data.deletedRole) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!canRecreateAfterDelete(member)) { await interaction.reply({ content: "You already deleted your booster role. You cannot create another one.", flags: 64 }); return; }
    await updateBoosterData(interaction.user.id, { deletedRole: false });
  }
  if (data.roleId) { await interaction.reply({ content: "You already created one booster role.", flags: 64 }); return; }

  const name = cleanName(interaction.fields.getTextInputValue("role_name"));
  const emoji = interaction.fields.getTextInputValue("role_icon");
  const color = normalizeColor(interaction.fields.getTextInputValue("role_color"));
  if (!name || color === null) { await interaction.reply({ content: "Use a valid name and color like #010000.", flags: 64 }); return; }
  if (parseCustomEmoji(emoji) && !(await resolveGuildCustomEmoji(interaction.guild, emoji))) { await interaction.reply({ content: "Role icon custom emoji must be from this server.", flags: 64 }); return; }

  const role = await interaction.guild.roles.create({ name, color, reason: `Booster custom role for ${interaction.user.tag}` });
  await setRoleEmoji(role, emoji, interaction.guild);
  await moveRoleBelowAnchor(interaction.guild, role);
  const member = await interaction.guild.members.fetch(interaction.user.id);
  await member.roles.add(role).catch(() => null);
  await updateBoosterData(interaction.user.id, { roleId: role.id, editCount: 0 });
  await interaction.reply({ content: `Your booster role ${role} was created.`, flags: 64 });
}

async function handleEditRole(interaction) {
  if (!(await requireBooster(interaction))) return;
  const data = await getBoosterData(interaction.user.id);
  if (!data.roleId) { await interaction.reply({ content: "Create your booster role first.", flags: 64 }); return; }
  if (data.editCount >= 3) { await interaction.reply({ content: "You already used your 3 role edits.", flags: 64 }); return; }
  const role = interaction.guild.roles.cache.get(data.roleId);
  if (!role) { await updateBoosterData(interaction.user.id, { roleId: null }); await interaction.reply({ content: "Your old role was not found. Create a new one.", flags: 64 }); return; }

  const name = cleanName(interaction.fields.getTextInputValue("role_name"));
  const emoji = interaction.fields.getTextInputValue("role_icon");
  const color = normalizeColor(interaction.fields.getTextInputValue("role_color"));
  if (!name || color === null) { await interaction.reply({ content: "Use a valid name and color like #010000.", flags: 64 }); return; }
  if (parseCustomEmoji(emoji) && !(await resolveGuildCustomEmoji(interaction.guild, emoji))) { await interaction.reply({ content: "Role icon custom emoji must be from this server.", flags: 64 }); return; }

  await role.edit({ name, color, reason: `Booster role edit by ${interaction.user.tag}` });
  await setRoleEmoji(role, emoji, interaction.guild);
  await updateBoosterData(interaction.user.id, { editCount: data.editCount + 1 });
  await interaction.reply({ content: `Role updated. Edits used: ${data.editCount + 1}/3.`, flags: 64 });
}

async function handleAutoReact(interaction) {
  if (!(await requireBooster(interaction))) return;
  const mentionEmoji = cleanEmoji(interaction.fields.getTextInputValue("mention_emoji"));
  const messageEmoji = cleanEmoji(interaction.fields.getTextInputValue("message_emoji"));
  if (!mentionEmoji && !messageEmoji) { await interaction.reply({ content: "Add at least one server custom emoji.", flags: 64 }); return; }

  const mentionResult = mentionEmoji ? await parseReactionEmojis(interaction.guild, mentionEmoji, 1, true) : { error: null, reactions: [] };
  const messageResult = messageEmoji ? await parseReactionEmojis(interaction.guild, messageEmoji, 1, true) : { error: null, reactions: [] };
  if (mentionResult.error || messageResult.error) { await interaction.reply({ content: mentionResult.error || messageResult.error, flags: 64 }); return; }

  await updateBoosterData(interaction.user.id, { autoReact: { mentionEmojis: mentionResult.reactions, messageEmojis: messageResult.reactions } });
  await interaction.reply({ content: "Auto react updated.", flags: 64 });
}

async function handleUserSelect(interaction) {
  const ownerId = interaction.customId.split(":")[1];
  if (interaction.user.id !== ownerId) { await interaction.reply({ content: "This select menu is not for you.", flags: 64 }); return; }
  if (!(await requireBooster(interaction))) return;
  const data = await getBoosterData(ownerId);
  const role = interaction.guild.roles.cache.get(data.roleId);
  if (!role) { await interaction.reply({ content: "Your role was not found.", flags: 64 }); return; }
  const targetId = interaction.values[0];
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!target) { await interaction.reply({ content: "Member was not found.", flags: 64 }); return; }
  await target.roles.add(role);
  await interaction.update({ content: `${target} received ${role}.`, components: [] });
}

async function handleDeleteAutoReactSelect(interaction) {
  const ownerId = interaction.customId.split(":")[1];
  if (interaction.user.id !== ownerId) { await interaction.reply({ content: "This select menu is not for you.", flags: 64 }); return; }
  if (!(await requireBooster(interaction))) return;
  const choice = interaction.values[0];
  await deleteAutoReactForUser(ownerId, choice);
  await interaction.update({ content: `Deleted ${choice === "both" ? "tag and message" : choice} auto react.`, embeds: [], components: [] });
}

async function handleDeleteAutoReactCommand(interaction, kind) {
  if (!(await requireAutoSetupRole(interaction))) return;
  const target = interaction.options.getUser("user", true);
  const data = await getBoosterData(target.id);
  const lists = getAutoReactLists(data.autoReact);
  const currentList = kind === "mention" ? lists.mention : lists.message;
  if (!currentList.length) { await interaction.reply({ content: `${target} does not have ${kind === "mention" ? "tag" : "message"} auto react set.`, flags: 64 }); return; }
  await deleteAutoReactForUser(target.id, kind === "mention" ? "tag" : "message");
  await interaction.reply({ content: `Deleted ${kind === "mention" ? "tag" : "message"} auto react for ${target}.`, flags: 64 });
}

async function handleSetupAutoReactCommand(interaction, kind) {
  if (!(await requireAutoSetupRole(interaction))) return;
  const target = interaction.options.getUser("user", true);
  const emojis = interaction.options.getString("emojis", true);
  const max = kind === "mention" ? 3 : 2;
  const result = await parseReactionEmojis(interaction.guild, emojis, max, false);
  if (result.error) { await interaction.reply({ content: result.error, flags: 64 }); return; }
  const data = await getBoosterData(target.id);
  const lists = getAutoReactLists(data.autoReact);
  await updateBoosterData(target.id, { autoReact: { mentionEmojis: kind === "mention" ? result.reactions : lists.mention, messageEmojis: kind === "message" ? result.reactions : lists.message } });
  await interaction.reply({ content: `${kind === "mention" ? "Tag" : "Message"} auto react updated for ${target}.`, flags: 64 });
}

async function handleBoostStarted(oldMember, newMember) {
  const wasBoosting = Boolean(oldMember.premiumSince);
  const isBoostingNow = Boolean(newMember.premiumSince);
  if (wasBoosting || !isBoostingNow) return;
  const channel = newMember.guild.channels.cache.get(BOOST_THANKS_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildText) return;
  const banner = new AttachmentBuilder(BOOST_THANKS_BANNER_PATH, { name: "boost-thanks-banner.png" });
  const embed = new EmbedBuilder()
    .setColor(0x1a74e2)
    .setTitle("Thank you for boosting")
    .setDescription(`${newMember}, your boost just upgraded the server. Enjoy your booster perks.`)
    .addFields({ name: "Booster role", value: `<@&${BOOSTER_ROLE_ID}>`, inline: true })
    .setThumbnail(newMember.user.displayAvatarURL({ size: 256 }))
    .setImage("attachment://boost-thanks-banner.png")
    .setTimestamp();
  await channel.send({ embeds: [embed], files: [banner] }).catch(() => null);
}

async function cleanupLostBooster(oldMember, newMember) {
  const hadBoosterRole = oldMember.roles.cache.has(BOOSTER_ROLE_ID);
  const hasBoosterRoleNow = newMember.roles.cache.has(BOOSTER_ROLE_ID);
  if (!hadBoosterRole || hasBoosterRoleNow) return;
  const db = loadDb();
  const data = db.boosters[newMember.id];
  if (!data) return;
  const role = data.roleId ? newMember.guild.roles.cache.get(data.roleId) : null;
  if (role) {
    if (DELETE_ROLE_WHEN_BOOST_LOST) {
      await role.delete(`Booster role removed because ${newMember.user.tag} lost booster role`).catch(async () => {
        await removeRoleFromMembers(newMember.guild, role.id);
      });
    } else {
      await removeRoleFromMembers(newMember.guild, role.id);
    }
  }
  await clearBoosterData(newMember.id);
}

async function removeRoleFromMembers(guild, roleId) {
  await guild.members.fetch();
  const members = guild.members.cache.filter((member) => member.roles.cache.has(roleId));
  for (const member of members.values()) {
    await member.roles.remove(roleId).catch(() => null);
  }
}

async function handleAutoReactions(message) {
  if (!message.guild || message.author.bot) return;
  const db = loadDb();
  const authorData = db.boosters[message.author.id];
  const authorLists = getAutoReactLists(authorData?.autoReact);
  for (const storedEmoji of authorLists.message) {
    await reactWithStoredEmoji(message, storedEmoji);
  }
  for (const mentionedUser of message.mentions.users.values()) {
    if (mentionedUser.bot || mentionedUser.id === message.author.id) continue;
    if (!message.mentions.has(mentionedUser, { ignoreRepliedUser: true })) continue;
    const mentionedData = db.boosters[mentionedUser.id];
    const mentionedLists = getAutoReactLists(mentionedData?.autoReact);
    for (const storedEmoji of mentionedLists.mention) {
      await reactWithStoredEmoji(message, storedEmoji);
    }
  }
}

async function handlePrefixCommand(message) {
  if (!message.guild || message.author.bot) return false;
  if (message.content.trim().toLowerCase() !== COMMAND_PREFIX.toLowerCase()) return false;
  if (message.author.id !== PANEL_OWNER_ID) {
    await message.reply("Only the panel owner can use this command.").catch(() => null);
    return true;
  }
  const channel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildText) {
    await message.reply("Panel channel was not found.").catch(() => null);
    return true;
  }
  await sendPanel(channel);
  await message.reply(`Boost panel sent in ${channel}.`).catch(() => null);
  return true;
}

function registerBooster(client) {
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "setupautoreact") { await handleSetupAutoReactCommand(interaction, "mention"); return; }
        if (interaction.commandName === "setupmsgemoji") { await handleSetupAutoReactCommand(interaction, "message"); return; }
        if (interaction.commandName === "deletereacttag") { await handleDeleteAutoReactCommand(interaction, "mention"); return; }
        if (interaction.commandName === "deletereactmsg") { await handleDeleteAutoReactCommand(interaction, "message"); return; }
      }
      if (interaction.isButton() && interaction.customId.startsWith("boost:")) { await handleButton(interaction); return; }
      if (interaction.isModalSubmit()) {
        if (interaction.customId === "boost_modal:create_role") await handleCreateRole(interaction);
        if (interaction.customId === "boost_modal:edit_role") await handleEditRole(interaction);
        if (interaction.customId === "boost_modal:auto_react") await handleAutoReact(interaction);
        return;
      }
      if (interaction.isUserSelectMenu() && interaction.customId.startsWith("boost_user_select:")) { await handleUserSelect(interaction); return; }
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("boost_delete_auto_react:")) { await handleDeleteAutoReactSelect(interaction); }
    } catch (error) {
      console.error(error);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "Something went wrong. Check bot permissions and role position.", flags: 64 }).catch(() => null);
      }
    }
  });

  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    await handleBoostStarted(oldMember, newMember);
    await cleanupLostBooster(oldMember, newMember);
  });

  client.on("messageCreate", async (message) => {
    const handledCommand = await handlePrefixCommand(message);
    if (!handledCommand) await handleAutoReactions(message);
  });

  console.log("Booster module loaded.");
}

module.exports = { registerBooster, slashCommands };
