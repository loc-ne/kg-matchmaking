"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingController = void 0;
const common_1 = require("@nestjs/common");
const join_queue_dto_1 = require("./dto/join-queue.dto");
const matchmaking_service_1 = require("./matchmaking.service");
const optional_auth_guard_1 = require("./optional-auth.guard");
let MatchmakingController = class MatchmakingController {
    matchmakingService;
    constructor(matchmakingService) {
        this.matchmakingService = matchmakingService;
    }
    async joinQueue(req, dto) {
        let playerData;
        if (req.user) {
            const response = await fetch(`http://localhost:4001/api/v1/users/${req.user.sub}/elo/${dto.timeControl.type}`);
            const data = await response.json();
            playerData = {
                userId: req.user.sub,
                username: req.user.username,
                rating: data.elo,
                timeControl: dto.timeControl,
                isGuest: false
            };
        }
        else {
            if (!dto.guestName) {
                throw new common_1.BadRequestException('Guest name is required for non-authenticated users');
            }
            playerData = {
                userId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                username: dto.guestName,
                timeControl: dto.timeControl,
                isGuest: true
            };
        }
        return this.matchmakingService.joinQueue(playerData);
    }
    async leaveQueue(req, body) {
        const userId = req.user?.sub || body.guestId;
        if (!userId) {
            throw new common_1.BadRequestException('User ID or Guest ID required');
        }
        return this.matchmakingService.leaveQueue(userId);
    }
    async getQueueStatus(req) {
        const userId = req.user?.sub || req.query.guestId;
        if (!userId) {
            throw new common_1.BadRequestException('User ID or Guest ID required');
        }
        return this.matchmakingService.getQueueStatus(userId);
    }
};
exports.MatchmakingController = MatchmakingController;
__decorate([
    (0, common_1.Post)('queue/join'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, join_queue_dto_1.JoinQueueDto]),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "joinQueue", null);
__decorate([
    (0, common_1.Post)('queue/leave'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "leaveQueue", null);
__decorate([
    (0, common_1.Get)('queue/status'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "getQueueStatus", null);
exports.MatchmakingController = MatchmakingController = __decorate([
    (0, common_1.Controller)('matchmaking'),
    __metadata("design:paramtypes", [matchmaking_service_1.MatchmakingService])
], MatchmakingController);
//# sourceMappingURL=matchmaking.controller.js.map