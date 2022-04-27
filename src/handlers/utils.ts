
import { Collection, Guild, GuildMember, Message, TextChannel } from "discord.js";
import db from "../database";
const bulks = new Map<string, Message[]>(), rates = new Map<string, number>();

export const deleteMessage = (message: Message) => {
    if (!message.channel) return;
    const rate = rates.get(message.channel.id) || 0;
    rates.set(message.channel.id, rate + 1);

    setTimeout(() => rates.set(message.channel.id, (rates.get(message.channel.id) || 0) - 1), 10000);

    const bulk = bulks.get(message.channel.id) || [];
    if (bulk.length) bulk.push(message);
    else if (rate < 3) message.delete().catch(() => null);
    else {
        bulks.set(message.channel.id, [message]);
        setTimeout(() => {
            if (!message.channel) return;
            (message.channel as TextChannel).bulkDelete(bulks.get(message.channel.id)).catch(() => null);
            bulks.delete(message.channel.id);
        }, 5000);
    };
};

export const checkGuildBans = async (guild: Guild) => {
    if (!guild.available) return;

    const gdb = await db.guild(guild.id);
    let { bans } = gdb.get();
    let ids = Object.keys(bans).filter((key) => bans[key] !== -1 && bans[key] <= Date.now());
    if (!ids.length) return;

    await Promise.all(ids.map(async (key) => {
        if (!guild.me.permissions.has("BAN_MEMBERS")) return;

        await guild.bans.remove(key)
            .then(() => gdb.removeFromObject("bans", key))
            .catch(() => gdb.removeFromObject("bans", key));
    }));
};