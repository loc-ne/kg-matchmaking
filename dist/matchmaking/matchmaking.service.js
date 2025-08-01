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
var MatchmakingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const matchmaking_gateway_1 = require("./matchmaking.gateway");
let MatchmakingService = MatchmakingService_1 = class MatchmakingService {
    httpService;
    matchmakingGateway;
    logger = new common_1.Logger(MatchmakingService_1.name);
    userQueue = new Map();
    guestQueue = new Map();
    constructor(httpService, matchmakingGateway) {
        this.httpService = httpService;
        this.matchmakingGateway = matchmakingGateway;
    }
    async joinQueue(playerData) {
        const queueEntry = {
            ...playerData,
            joinedAt: new Date(),
        };
        if (queueEntry.isGuest) {
            if (this.guestQueue.has(queueEntry.userId)) {
                this.logger.warn(`Guest ${queueEntry.userId} already in queue`);
                return {
                    message: 'Already in queue',
                };
            }
        }
        else {
            if (this.userQueue.has(queueEntry.userId)) {
                this.logger.warn(`User ${queueEntry.userId} already in queue`);
                return {
                    message: 'Already in queue',
                };
            }
            queueEntry.balanceColor = await this.getUserBalanceColor(queueEntry.userId, queueEntry.timeControl);
        }
        const opponent = queueEntry.isGuest
            ? this.findGuestOpponent(queueEntry)
            : this.findUserOpponent(queueEntry);
        if (opponent) {
            opponent.isGuest
                ? this.guestQueue.delete(opponent.userId)
                : this.userQueue.delete(opponent.userId);
            try {
                const colors = queueEntry.isGuest
                    ? this.assignGuestColors()
                    : this.assignUserColors(queueEntry, opponent);
                const gameResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.post('http://localhost:3003/api/v1/games', {
                    player1: {
                        userId: queueEntry.userId,
                        username: queueEntry.username,
                        rating: queueEntry.rating,
                        isGuest: queueEntry.isGuest,
                    },
                    player2: {
                        userId: opponent.userId,
                        username: opponent.username,
                        rating: opponent.rating,
                        isGuest: opponent.isGuest,
                    },
                    timeControl: queueEntry.timeControl,
                    colors,
                }));
                const url = `/game/${gameResponse.data.gameId}`;
                const gameId = gameResponse.data.gameId;
                [queueEntry.userId, opponent.userId].forEach(userId => {
                    this.matchmakingGateway.sendToUser(userId, { url, gameId });
                });
                return { url, gameId };
            }
            catch (error) {
                queueEntry.isGuest
                    ? this.guestQueue.set(queueEntry.userId, queueEntry)
                    : this.userQueue.set(queueEntry.userId, queueEntry);
                opponent.isGuest
                    ? this.guestQueue.set(opponent.userId, opponent)
                    : this.userQueue.set(opponent.userId, opponent);
                this.logger.error('Failed to create game:', error);
                throw new Error('Failed to create game');
            }
        }
        else {
            queueEntry.isGuest
                ? this.guestQueue.set(queueEntry.userId, queueEntry)
                : this.userQueue.set(queueEntry.userId, queueEntry);
            this.logger.log(`User ${queueEntry.username} added to ${queueEntry.isGuest ? 'guest' : 'user'} queue for ${queueEntry.timeControl}`);
            return {
                message: 'added to queue',
            };
        }
    }
    findGuestOpponent(player) {
        for (const [userId, opponent] of this.guestQueue) {
            if (this.isTimeControlMatch(opponent.timeControl, player.timeControl) && userId !== player.userId) {
                return opponent;
            }
        }
        return null;
    }
    findUserOpponent(player) {
        for (const [userId, opponent] of this.userQueue) {
            if (!this.isTimeControlMatch(opponent.timeControl, player.timeControl) || userId === player.userId)
                continue;
            const ratingDiff = Math.abs(opponent.rating - player.rating);
            if (ratingDiff <= 100) {
                return opponent;
            }
        }
        return null;
    }
    isTimeControlMatch(tc1, tc2) {
        return tc1.type === tc2.type &&
            tc1.initialTime === tc2.initialTime &&
            tc1.increment === tc2.increment;
    }
    assignUserColors(player1, player2) {
        const p1Balance = player1.balanceColor || 0;
        const p2Balance = player2.balanceColor || 0;
        if (p1Balance < p2Balance) {
            return { player1: 'white', player2: 'black' };
        }
        else if (p2Balance < p1Balance) {
            return { player1: 'black', player2: 'white' };
        }
        else {
            const player1White = Math.random() < 0.5;
            return {
                player1: player1White ? 'white' : 'black',
                player2: player1White ? 'black' : 'white'
            };
        }
    }
    assignGuestColors() {
        const player1White = Math.random() < 0.5;
        return {
            player1: player1White ? 'white' : 'black',
            player2: player1White ? 'black' : 'white'
        };
    }
    async getUserBalanceColor(userId, timeControl) {
        try {
            const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`http://localhost:4001/api/v1/users/${userId}/rating/${timeControl.type}/balance`));
            return response.data.balance || 0;
        }
        catch (error) {
            this.logger.error(`Failed to get color balance for user ${userId} from Auth Service:`, error);
            return 0;
        }
    }
    async leaveQueue(userId) {
        let wasInQueue = false;
        if (this.userQueue.has(userId)) {
            this.userQueue.delete(userId);
            wasInQueue = true;
            this.logger.log(`User ${userId} removed from user queue`);
        }
        if (this.guestQueue.has(userId)) {
            this.guestQueue.delete(userId);
            wasInQueue = true;
            this.logger.log(`Guest ${userId} removed from guest queue`);
        }
        if (!wasInQueue) {
            return {
                message: 'Not in queue',
                inQueue: false
            };
        }
        return {
            message: 'Left queue successfully',
            inQueue: false
        };
    }
    async getQueueStatus(userId) {
        const userEntry = this.userQueue.get(userId);
        const guestEntry = this.guestQueue.get(userId);
        if (userEntry) {
            return {
                inQueue: true,
                queueType: 'user',
                joinedAt: userEntry.joinedAt,
                timeControl: userEntry.timeControl,
                rating: userEntry.rating,
                queueSize: this.userQueue.size
            };
        }
        if (guestEntry) {
            return {
                inQueue: true,
                queueType: 'guest',
                joinedAt: guestEntry.joinedAt,
                timeControl: guestEntry.timeControl,
                rating: guestEntry.rating,
                queueSize: this.guestQueue.size
            };
        }
        return {
            inQueue: false,
            message: 'Not in queue'
        };
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = MatchmakingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        matchmaking_gateway_1.MatchmakingGateway])
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map