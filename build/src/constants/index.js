"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.formatScore=exports.generateID=exports.getPermissionLevel=void 0;const config_1=__importDefault(require("../../config")),database_1=__importDefault(require("../database/")),getPermissionLevel=e=>config_1.default.admins[0]==e.user.id?5:config_1.default.admins.includes(e.user.id)?4:e.guild.ownerId==e.user.id?3:e.permissions.has("MANAGE_GUILD")?2:0;exports.getPermissionLevel=getPermissionLevel;const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",generateID=()=>{let e;const{generatedIds:r}=database_1.default.global.get();for(;!e&&r.includes(e);){e="";for(let r=0;r<10;r++)e+=chars[Math.floor(Math.random()*chars.length)]}return e};exports.generateID=generateID;const medals={"1й":"🥇","2й":"🥈","3й":"🥉"},formatNumberSuffix=e=>{let r=`${e}`;return"0"==r?"N/A":r+"й"},formatScore=(e,r,t,o)=>{let s=formatNumberSuffix(r+1);return s=medals[s]||`**${s}**:`,o===e?`${s} *__<@${e}>, **счёт:** ${t[e]||0}__*`:`${s} <@${e}>, **счёт:** ${t[e]||0}`};exports.formatScore=formatScore;