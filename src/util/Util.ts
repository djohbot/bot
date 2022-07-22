import config from "../../config";
import { BcBotBumpAction, ModifiedClient } from "../constants/types";
import { inspect } from "util";
import { Manager, Player } from "erela.js";
import { Collection, Guild, GuildMember, Message, MessageActionRow, MessageButton, MessageOptions, TextChannel, WebhookClient } from "discord.js";
import { splitBar } from "string-progressbar";
import prettyms from "pretty-ms";
import i18n from "./i18n";
import { UserFetcher } from "../handlers/bottleneck";
const uselesswebhook = new WebhookClient({ url: config.useless_webhook });

let util: Util | null = null;

class Util {
    constructor() {
        if (util) return util;
        util = this;
    };

    private _client: ModifiedClient | null = null;
    private _database: typeof import("../database/") | null = null;
    private _lavaManager: Manager | null = null;
    public i18n = i18n;
    public inspect = inspect;
    public wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    public prettyBytes = (bytes: number, maximumFractionDigits = 2): string => {
        const suffixes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        let i = 0;
        while (bytes >= 1024) {
            bytes /= 1024;
            i++;
        };
        return `${bytes.toFixed(maximumFractionDigits)} ${suffixes[i]}`;
    };
    public func = {
        tickMusicPlayers: async (player: Player): Promise<void | Message> => {
            try {
                const track = player.queue.current;
                const message = player.get("message") as Message | undefined;
                if (!track || !message || !message.editable) return;

                const duration = Math.floor(track.duration / 1000) * 1000;
                const position = Math.floor(player.position / 1000) * 1000;
                const progressComponent = [
                    splitBar(duration, position, 20)[0],
                    ` [`,
                    prettyms(position, { colonNotation: true, compact: true }),
                    ` / `,
                    prettyms(duration, { colonNotation: true, compact: true }),
                    `]`
                ].join("");
                return await message.edit({
                    content: null,
                    embeds: [{
                        title: track.title,
                        url: track.uri,
                        thumbnail: {
                            url: track.thumbnail
                        },
                        fields: [{
                            name: "Автор",
                            value: track.author,
                            inline: true
                        }, {
                            name: "Прогресс",
                            value: progressComponent,
                        }]
                    }]
                });
            } catch { return; };
        },
        updateGuildStatsChannels: async (guildId: string): Promise<void> => {
            let failed = false;
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;
            const gdb = await this._database.guild(guildId);
            let { statschannels } = gdb.get();
            if (!Object.keys(statschannels).length) return;

            const whethertofetchmembers = Object.values(statschannels).some((x) => x.includes("{users}") || x.includes("{bots}"));

            let fetchedMembers: null | Collection<string, GuildMember> = null;
            if (whethertofetchmembers) fetchedMembers = await guild.members.fetch({ force: true, time: 30_000 }).catch(() => { failed = true; return null; });
            if (failed) return;

            const statsdata = {
                members: guild.memberCount,
                channels: guild.channels.cache.size,
                roles: guild.roles.cache.size,
                users: fetchedMembers?.filter((m) => !m.user.bot).size,
                bots: fetchedMembers?.filter((m) => m.user.bot).size
            };

            for (const [channelId, text] of Object.entries(statschannels)) {
                const channel = guild.channels.cache.get(channelId);
                if (!channel) {
                    gdb.removeFromObject("statschannels", channelId);
                    continue;
                };
                let newtext = text
                    .replace(/\{members\}/g, statsdata.members.toString())
                    .replace(/\{channels\}/g, statsdata.channels.toString())
                    .replace(/\{roles\}/g, statsdata.roles.toString());

                if (whethertofetchmembers) newtext = newtext
                    .replace(/\{users\}/g, statsdata.users.toString())
                    .replace(/\{bots\}/g, statsdata.bots.toString());

                await channel.edit({ name: newtext });
            };
        },
        checkGuildBans: async (guild: Guild) => {
            if (!guild.available) return;

            const gdb = await this.database.guild(guild.id);
            let { bans } = gdb.get();
            let ids = Object.keys(bans).filter((key) => bans[key] !== -1 && bans[key] <= Date.now());
            if (!ids.length) return;

            await Promise.all(ids.map(async (key) => {
                if (!guild.me.permissions.has("BAN_MEMBERS")) return;

                await guild.bans.remove(key)
                    .then(() => gdb.removeFromObject("bans", key))
                    .catch(() => gdb.removeFromObject("bans", key));
            }));
        },
        processBotBump: async (options: BcBotBumpAction) => {
            const { data } = options;
            const global = await this.database.global();
            global.addToArray("boticordBumps", data);

            const fetchUser = (data: BcBotBumpAction["data"]) => this.client.users.fetch(data.user).catch(() => null);
            const user = await UserFetcher.schedule(fetchUser, data);

            let dmsent = false;

            await user.send({
                embeds: [{
                    title: "Мониторинг",
                    description: [
                        "Спасибо за ап на `boticord.top`!",
                        "Нажав на кнопку ниже, вы подпишетесь на уведомления о возможности поднимать в рейтинге нашего бота."
                    ].join("\n")
                }],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton().setLabel("Подписаться").setStyle("SECONDARY").setCustomId(`subscribe:boticord:${data.user}`)
                    )
                ]
            }).then(async () => { dmsent = true; }).catch(() => null);

            if (dmsent) {
                await this.func.uselesslog({ content: `${user.tag} ${user} (\`${user.id}\`) bumped on boticord.top` });
            } else {
                const channel = this.client.channels.cache.get("957937585999736858") as TextChannel;

                await channel.send({
                    content: `${user},`,
                    embeds: [{
                        title: "Мониторинг",
                        description: [
                            "Спасибо за ап на `boticord.top`!",
                            "Нажав на кнопку ниже, вы подпишетесь на уведомления о возможности поднимать в рейтинге нашего бота.",
                            "Дайте боту возможность писать вам в личные сообщения, посредством удаления из чёрного списка бота или выдавая доступ на общих серверах с ботом писать в личные сообщения пользователям без добавления в друзья"
                        ].join("\n"),
                        image: {
                            url: "https://cdn.discordapp.com/attachments/768041170076827648/999436594664702012/UR4yHOER.gif"
                        }
                    }],
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageButton().setLabel("Подписаться").setStyle("SECONDARY").setCustomId(`subscribe:boticord:${data.user}`)
                        )
                    ]
                });
            };
        },
        uselesslog: (opts: MessageOptions) => uselesswebhook.send(opts)
    };

    public setClient(client: ModifiedClient): Util {
        import("discord-logs").then((x) => x.default(client))
        client.util = this;
        this._client = client;
        return this;
    };
    public setDatabase(database: typeof import("../database/")): Util {
        this._database = database;
        return this;
    };
    public setLavaManager(lavaManager: Manager): Util {
        this._lavaManager = lavaManager;
        return this;
    };

    get client() {
        return this._client;
    };
    get database() {
        return this._database;
    };
    get lava() {
        return this._lavaManager;
    };
};

export = new Util;