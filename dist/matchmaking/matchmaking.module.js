"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const matchmaking_controller_1 = require("./matchmaking.controller");
const matchmaking_service_1 = require("./matchmaking.service");
const matchmaking_gateway_1 = require("./matchmaking.gateway");
let MatchmakingModule = class MatchmakingModule {
};
exports.MatchmakingModule = MatchmakingModule;
exports.MatchmakingModule = MatchmakingModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule],
        controllers: [matchmaking_controller_1.MatchmakingController],
        providers: [matchmaking_service_1.MatchmakingService, matchmaking_gateway_1.MatchmakingGateway],
        exports: [matchmaking_service_1.MatchmakingService, matchmaking_gateway_1.MatchmakingGateway],
    })
], MatchmakingModule);
//# sourceMappingURL=matchmaking.module.js.map