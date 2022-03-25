import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import { ModifiedClient } from "../constants/types";
import db from "../database/";

export const options = new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Установить громкость плеера.")
    .addIntegerOption((o) => o.setName("volume").setDescription("Новая громкость плеера.").setRequired(true).setMinValue(1).setMaxValue(200))
    .toJSON();
export const permission = 0;

export async function run(interaction: CommandInteraction) {
    if (!(interaction.member instanceof GuildMember)) return;
    const client = interaction.client as ModifiedClient;
    const gdb = await db.guild(interaction.guild.id);

    if (gdb.get().channel == interaction.channelId) return interaction.reply({ content: "❌ Эта команда недоступна в данном канале.", ephemeral: true });

    if (!interaction.member.voice.channel) return interaction.reply({ content: "❌ Вы должны находится в голосовом канале.", ephemeral: true });
    if (
        interaction.guild.me.voice.channel &&
        interaction.member.voice.channel.id != interaction.guild.me.voice.channel.id
    ) return interaction.reply({ content: "❌ Вы должны находится в том же голосовом канале, что и я.", ephemeral: true });

    const player = client.manager.get(interaction.guildId);
    if (!player) {
        return await interaction.reply({
            content: "❌ На этом сервере ничего не играет.",
            ephemeral: true
        });
    };

    await interaction.reply(`Новая громкость - \`${interaction.options.getInteger("volume")}%\``)
        .then(() => player.setVolume(interaction.options.getInteger("volume")));
};