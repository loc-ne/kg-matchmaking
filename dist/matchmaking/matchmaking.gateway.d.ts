import { Server } from 'ws';
export declare class MatchmakingGateway {
    private server;
    private wsClients;
    private logger;
    setServer(server: Server): void;
    sendToUser(userId: string, message: any): void;
}
