import { SlashCommandBuilder } from 'discord.js';
import { backgrounds } from './config.js';

const backgroundChoices = backgrounds.map((background, index) => ({
  name: `${index + 1}. ${background.name}`,
  value: index
}));

export const commands = [
  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your rank card'),

  new SlashCommandBuilder()
    .setName('rankuser')
    .setDescription('Show another user rank card')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User to show')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top XP users'),

  new SlashCommandBuilder()
    .setName('background')
    .setDescription('Choose your rank card background')
    .addIntegerOption((option) =>
      option
        .setName('theme')
        .setDescription('Background theme')
        .setRequired(true)
        .addChoices(...backgroundChoices)
    )
].map((command) => command.toJSON());
