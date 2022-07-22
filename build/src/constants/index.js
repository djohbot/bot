"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatScore = exports.generateID = exports.getPermissionLevel = void 0;
const config_1 = __importDefault(require("../../config"));
const getPermissionLevel = (member) => {
    if (config_1.default.admins[0] == member.user.id)
        return 5;
    if (config_1.default.admins.includes(member.user.id))
        return 4;
    if (member.guild.ownerId == member.user.id)
        return 3;
    if (member.permissions.has("MANAGE_GUILD"))
        return 2;
    return 0;
};
exports.getPermissionLevel = getPermissionLevel;
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generateID = () => {
    let id;
    while (!id) {
        id = "";
        for (let i = 0; i < 10; i++)
            id += chars[Math.floor(Math.random() * chars.length)];
    }
    ;
    return id;
};
exports.generateID = generateID;
const medals = {
    "1й": "🥇", "2й": "🥈", "3й": "🥉"
};
const formatNumberSuffix = (n) => {
    let str = `${n}`;
    if (str == "0")
        return "N/A";
    return str + "й";
};
const formatScore = (id, index, users, userid) => {
    let suffix = formatNumberSuffix(index + 1);
    suffix = medals[suffix] || `**${suffix}**:`;
    if (userid === id)
        return `${suffix} *__<@${id}>, **счёт:** ${(users[id] || 0)}__*`;
    else
        return `${suffix} <@${id}>, **счёт:** ${(users[id] || 0)}`;
};
exports.formatScore = formatScore;
