import { JoinQueueDto } from './dto/join-queue.dto';
import { MatchmakingService } from './matchmaking.service';
export declare class MatchmakingController {
    private matchmakingService;
    constructor(matchmakingService: MatchmakingService);
    joinQueue(req: any, dto: JoinQueueDto): Promise<any>;
    leaveQueue(req: any, body: {
        guestId?: string;
    }): Promise<any>;
    getQueueStatus(req: any): Promise<any>;
}
