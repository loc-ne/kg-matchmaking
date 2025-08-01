import { HttpService } from '@nestjs/axios';
import { MatchmakingGateway } from './matchmaking.gateway';
interface TimeControl {
    type: string;
    initialTime: number;
    increment: number;
}
interface QueueEntry {
    userId: string;
    username: string;
    rating: number;
    timeControl: TimeControl;
    isGuest: boolean;
    joinedAt: Date;
    balanceColor?: number;
}
export declare class MatchmakingService {
    private httpService;
    private readonly matchmakingGateway;
    private readonly logger;
    private userQueue;
    private guestQueue;
    constructor(httpService: HttpService, matchmakingGateway: MatchmakingGateway);
    joinQueue(playerData: QueueEntry): Promise<any>;
    private findGuestOpponent;
    private findUserOpponent;
    private isTimeControlMatch;
    private assignUserColors;
    private assignGuestColors;
    private getUserBalanceColor;
    leaveQueue(userId: string): Promise<any>;
    getQueueStatus(userId: string): Promise<any>;
}
export {};
