"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.cacheGSets=void 0;const mongoose_1=require("mongoose"),dbCache=new Map,dbSaveQueue=new Map,gSetObject={guildid:"",delMuted:!1,purgePinned:!1,detectScamLinks:!1,voices:{enabled:!1,lobby:"",parent:""}},gSetSchema=new mongoose_1.Schema(gSetObject,{minimize:!0}),GSet=(0,mongoose_1.model)("GSet",gSetSchema),get=e=>new Promise(((t,a)=>GSet.findOne({guildid:e},((c,d)=>c?a(c):(d||((d=new GSet(gSetObject)).guildid=e),t(d)))))),load=async e=>{const t=await get(e),a={},c=gSetObject;for(const e in c)a[e]=t[e]||c[e];return dbCache.set(e,a)},save=async(e,t)=>{if(!dbSaveQueue.has(e)){dbSaveQueue.set(e,t);const a=await get(e),c=dbCache.get(e),d=dbSaveQueue.get(e);for(const e of d)a[e]=c[e];return a.save().then((()=>{let t=dbSaveQueue.get(e);t.length>d.length?(dbSaveQueue.delete(e),save(e,t.filter((e=>!d.includes(e))))):dbSaveQueue.delete(e)})).catch(console.log)}dbSaveQueue.get(e).push(...t)};async function cacheGSets(e){let t=await GSet.find({$or:[...e].map((e=>({guildid:e})))});return await Promise.all([...e].map((async e=>{const a=t.find((t=>t.guildid==e))||{guildid:e},c={},d=gSetObject;for(const e in d)c[e]=a[e]||d[e];return dbCache.set(e,c)})))}exports.default=()=>async e=>(dbCache.has(e)||await load(e),{reload:()=>load(e),unload:()=>dbCache.delete(e),get:()=>Object.assign({},dbCache.get(e)),set:(t,a)=>(dbCache.get(e)[t]=a,save(e,[t]),dbCache.get(e)),setMultiple:t=>{let a=dbCache.get(e);return Object.assign(a,t),save(e,Object.keys(t)),dbCache.get(e)},addToArray:(t,a)=>(dbCache.get(e)[t].push(a),save(e,[t]),dbCache.get(e)),removeFromArray:(t,a)=>(dbCache.get(e)[t]=dbCache.get(e)[t].filter((e=>e!==a)),save(e,[t]),dbCache.get(e)),setOnObject:(t,a,c)=>(dbCache.get(e)[t][a]=c,save(e,[t]),dbCache.get(e)),removeFromObject:(t,a)=>(delete dbCache.get(e)[t][a],save(e,[t]),dbCache.get(e)),reset:()=>{let t=dbCache.get(e);return Object.assign(t,gSetObject),t.guildid=e,save(e,Object.keys(gSetObject)),dbCache.get(e)}}),exports.cacheGSets=cacheGSets;