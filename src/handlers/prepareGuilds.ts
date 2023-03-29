import { Guild, Message, PermissionFlagsBits } from "discord.js";
import { setTimeout as sleep } from "node:timers/promises";
import { clientLogger } from "../utils/logger/cluster";
import { getGuildDocument } from "../database";
import { inspect } from "util";
import Util from "../utils/Util";

const filter = (m: Message) => m.bulkDeletable;

export = async (guild: Guild) => {
    const document = await getGuildDocument(guild.id);
    await Util.func.checkGuildBans(guild);
    const { channelId, messageId } = document.counting;

    if (!channelId || !messageId) return;

    try {
        const channel = guild.channels.cache.get(channelId);
        const me = await guild.members.fetchMe();

        if (!channel) {
            document.counting.channelId = "";
            return document.safeSave();
        };

        if (
            channel.isTextBased()
            && channel.permissionsFor(me).has(PermissionFlagsBits.ViewChannel)
            && channel.permissionsFor(me).has(PermissionFlagsBits.ReadMessageHistory)
            && channel.permissionsFor(me).has(PermissionFlagsBits.ManageMessages)
        ) {
            let messages = await channel.messages.fetch({ limit: 100, after: messageId });
            messages = messages.filter(filter);

            if (messages.size) {
                let processing = true, fail = false;

                while (processing && !fail) {
                    messages = messages.filter(filter);

                    if (!messages.size) processing = false;
                    else await channel.bulkDelete(messages, true).catch(() => fail = true);

                    if (processing && !fail) {
                        messages = await channel.messages.fetch({ limit: 100, after: messageId });
                        if (messages.filter(filter).size) await sleep(3500);
                    };
                };
            };
        };
    } catch (e) {
        clientLogger.error(`[g${guild.id}] prepareGuilds: ${inspect(e)}`);
    };
};