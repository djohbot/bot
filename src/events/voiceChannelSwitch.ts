import { GuildMember, VoiceChannel, StageChannel } from "discord.js";
import { ModifiedClient } from "../constants/types";

export const name = "voiceChannelSwitch";
export async function run(client: ModifiedClient, member: GuildMember, oldChannel: VoiceChannel | StageChannel, newChannel: VoiceChannel | StageChannel) {
    const gset = await client.db.settings(member.guild.id);
    const { voices } = gset.get();
    const gdb = await client.db.guild(member.guild.id);

    if (gdb.get().voices[oldChannel.id] == member.user.id) {
        oldChannel.delete().catch(() => null) && gdb.removeFromObject("voices", oldChannel.id);
    };
    if (voices.lobby == newChannel.id && voices.enabled) {
        member.guild.channels.create("Комната " + member.user.tag, {
            type: "GUILD_VOICE",
            parent: newChannel.parentId,
            permissionOverwrites: [{
                id: member.user.id,
                allow: ["MANAGE_CHANNELS", "PRIORITY_SPEAKER", "STREAM"]
            }]
        }).then((ch) => {
            member.voice.setChannel(ch.id).catch(() => null) && gdb.setOnObject("voices", ch.id, member.user.id);
        }).catch(() => null);
    };
};