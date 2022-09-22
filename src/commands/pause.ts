import { SlashCommandBuilder } from "discord.js";

export const options = new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Поставить плеер на паузу.")
    .setDMPermission(false)
    .toJSON();

import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import Util from "../util/Util";

export const run = async (interaction: ChatInputCommandInteraction) => {
    const member = interaction.member as GuildMember;

    if (!member.voice.channel)
        return interaction.reply({ content: "❌ Вы должны находится в голосовом канале.", ephemeral: true });
    if (
        interaction.guild.members.me.voice.channel
        && member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
    ) return interaction.reply({ content: "❌ Вы должны находится в том же голосовом канале, что и я.", ephemeral: true });

    const player = Util.lava.get(interaction.guildId);
    if (!player) {
        return interaction.reply({ content: "❌ На этом сервере ничего не играет.", ephemeral: true });
    };

    player.paused
        ? await interaction.reply("Пауза выключена.").then(() => player.pause(false))
        : await interaction.reply("Пауза включёна.").then(() => player.pause(true));
    setTimeout(() => interaction.deleteReply().catch(() => 0), 30 * 1000);
};