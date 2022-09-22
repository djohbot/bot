import { Guild, Message, PermissionFlagsBits, TextChannel } from "discord.js";
import { clientLogger } from "../util/logger/normal";
import { inspect } from "util";
import Util from "../util/Util";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export = async (guild: Guild) => {
    const gdb = await Util.database.guild(guild.id);
    await Util.func.checkGuildBans(guild);
    const { channel: channelId, message: messageId } = gdb.get();

    try {
        const channel = guild.channels.cache.get(channelId);
        if (
            channel instanceof TextChannel
            && channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ViewChannel)
            && channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ReadMessageHistory)
            && channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageMessages)
        ) {
            let messages = await channel.messages.fetch({ limit: 100, after: messageId });
            messages = messages.filter((m) => m.createdTimestamp > Date.now() - 14 * 24 * 60 * 60 * 1000);
            if (messages.size) {
                let processing = true, fail = false;
                const filter = (m: Message) =>
                    m.createdTimestamp > Date.now() - 14 * 24 * 60 * 60 * 1000;

                while (processing && !fail) {
                    messages = messages.filter(filter);
                    if (!messages.size) processing = false;
                    else {
                        await channel.bulkDelete(messages, true).catch(() => fail = true);
                    };
                    if (processing && !fail) {
                        messages = await channel.messages.fetch({ limit: 100, after: messageId }).catch(() => { fail = true; return null; });
                        if (messages?.filter(filter).size) await sleep(3500);
                    };
                };
            };
        };
    } catch (e) {
        clientLogger.error(`[g${guild.id}] prepareGuilds: ${inspect(e)}`);
    };
};