import { FastifyInstance, HookHandlerDoneFunction } from "fastify";
import config from "../../../config";
import discordoauth2 from "discord-oauth2";
import { manager } from "../../sharding";
import { ModifiedClient } from "../../constants/types";
const oauth2 = new discordoauth2({
    clientId: config.client.id,
    clientSecret: config.client.secret,
    redirectUri: config.redirectUri
});

export = (fastify: FastifyInstance, _: any, done: HookHandlerDoneFunction) => {
    fastify.get("/shards", async (_, res) => {
        const newBotInfo = await manager.broadcastEval((bot) => ({
            status: bot.ws.status,
            guilds: bot.guilds.cache.size,
            cachedUsers: bot.users.cache.size,
            users: bot.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0),
            ping: bot.ws.ping,
            loading: (bot as ModifiedClient).loading
        })).then((results) => results.reduce((info, next, index) => {
            for (const [key, value] of Object.entries(next)) {
                if (["guilds", "cachedUsers", "users"].includes(key)) info[key] = (info[key] || 0) + value;
            };
            info.shards[index] = next;
            return info;
        }, { shards: {}, lastUpdate: 0 }));
        newBotInfo.lastUpdate = Date.now();
        res.send(newBotInfo);
    });
    fastify.get("/login", (_, res): any => res.redirect(
        oauth2.generateAuthUrl({
            scope: ["identify", "guilds"],
            responseType: "code",
        })
    ));
    fastify.get("/logout", (req: any, res) => {
        req.session.user = null;
        res.redirect(req.session.lastPage);
    });
    fastify.get("/authorize", async (req: any, res) => {
        const a = await oauth2.tokenRequest({
            code: req.query.code,
            scope: ["identify", "guilds"],
            grantType: "authorization_code"
        }).catch(() => res.redirect(req.session.lastPage));

        if (!a.access_token) return res.redirect("/api/login");

        const user = await oauth2.getUser(a.access_token);
        req.session.user = user;
        res.redirect(req.session.lastPage);
    });

    fastify.get("/user/guilds", async (req: any, res) => {
        return res.status(423).send();

        const sharding = require("../../sharding").manager;

        const { user } = req.session;
        if (!user) return res.status(401).send();

        // @ts-ignore
        const allGuilds = await sharding.broadcastEval((bot, { userId }) => bot.guilds.cache.filter(async (g) => {
            //const member = await g.members.fetch(userId).then(() => true).catch(() => null);
            return g.members.cache.has(userId);
            // @ts-ignore
        }).map((g) => g), { context: { userId: user.id } }).then((a) => a.flat().map((guild) => ({
            // @ts-ignore
            id: guild.id,
            // @ts-ignore
            name: guild.name,
            // @ts-ignore
            iconUrl: guild.icon
                // @ts-ignore
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                : "https://cdn.iconscout.com/icon/free/png-256/discord-3215389-2673807.png"
        })));
        // @ts-ignore
        const managedGuilds = await sharding.broadcastEval((bot, { userId }) => bot.guilds.cache.filter(async (g) => {
            //const member = await g.members.fetch(userId).then((m) => m.permissions.has("ADMINISTRATOR")).catch(() => null);
            return g.members.cache.get(userId)?.permissions.has("ADMINISTRATOR");
            // @ts-ignore
        }).map((g) => g), { context: { userId: user.id } }).then((a) => a.flat().map((guild) => ({
            // @ts-ignore
            id: guild.id,
            // @ts-ignore
            name: guild.name,
            // @ts-ignore
            iconUrl: guild.icon
                // @ts-ignore
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                : "https://cdn.iconscout.com/icon/free/png-256/discord-3215389-2673807.png"
        })));

        res.send({ allGuilds, managedGuilds });
    });
    done();
};