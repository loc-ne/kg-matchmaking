"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingGateway = void 0;
const common_1 = require("@nestjs/common");
const ws_1 = require("ws");
let MatchmakingGateway = class MatchmakingGateway {
    server;
    wsClients = new Map();
    logger = new common_1.Logger('MatchmakingGateway');
    setServer(server) {
        this.server = server;
        this.server.on('connection', (client, req) => {
            try {
                if (!req.url || !req.headers.host) {
                    client.close(1008, 'Invalid request: missing url or host');
                    return;
                }
                const url = new URL(req.url, `http://${req.headers.host}`);
                const userId = url.searchParams.get('userId');
                if (userId) {
                    this.wsClients.set(userId, client);
                    client.on('close', () => {
                        this.wsClients.delete(userId);
                    });
                }
                else {
                    client.close(1008, 'userId is required');
                }
            }
            catch (error) {
                this.logger.error(`Error parsing WebSocket URL: ${error.message}`);
                client.close(1008, 'Invalid URL');
            }
        });
        this.server.on('error', (error) => {
            this.logger.error(`WebSocket Server Error: ${error.message}`);
        });
    }
    sendToUser(userId, message) {
        const client = this.wsClients.get(String(userId));
        if (client && client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
        else {
            this.logger.warn(`Cannot send to user ${userId}: Client not found or not connected`);
        }
    }
};
exports.MatchmakingGateway = MatchmakingGateway;
exports.MatchmakingGateway = MatchmakingGateway = __decorate([
    (0, common_1.Injectable)()
], MatchmakingGateway);
//# sourceMappingURL=matchmaking.gateway.js.map