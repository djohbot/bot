"use strict";const util_1=require("util");let util=null;class Util{constructor(){if(util)return util;util=this}setClient(t){return this._client=t,this}setDatabase(t){return this._database=t,this}setLavaManager(t){return this._lavaManager=t,this}get client(){return this._client}get database(){return this._database}get lava(){return this._lavaManager}}Util.inspect=util_1.inspect,module.exports=new Util;