import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MatchmakingGateway } from './matchmaking.gateway';

interface TimeControl {
    type: string;        // "bullet", "blitz", "rapid", "classical"
    initialTime: number; // Initial time in seconds
    increment: number;   // Increment per move in seconds
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

@Injectable()
export class MatchmakingService {
    private readonly logger = new Logger(MatchmakingService.name);
    private userQueue = new Map<string, QueueEntry>();
    private guestQueue = new Map<string, QueueEntry>();

    constructor(
        private httpService: HttpService,
        private readonly matchmakingGateway: MatchmakingGateway
    ) { }

    async joinQueue(playerData: QueueEntry): Promise<any> {
        const queueEntry: QueueEntry = {
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
        } else {
            if (this.userQueue.has(queueEntry.userId)) {
                this.logger.warn(`User ${queueEntry.userId} already in queue`);
                return {
                    message: 'Already in queue',
                };
            }
            // ✅ Get balance from Auth Service API
            queueEntry.balanceColor = await this.getUserBalanceColor(queueEntry.userId, queueEntry.timeControl);
        }

        const opponent = queueEntry.isGuest
            ? this.findGuestOpponent(queueEntry)
            : this.findUserOpponent(queueEntry);

        if (opponent) {
            // ✅ FIX: Delete opponent from correct queue
            opponent.isGuest
                ? this.guestQueue.delete(opponent.userId)
                : this.userQueue.delete(opponent.userId);

            try {
                // Assign colors
                const colors = queueEntry.isGuest
                    ? this.assignGuestColors()
                    : this.assignUserColors(queueEntry, opponent);

                // Call Game Service to create room
                const gameResponse = await firstValueFrom(
                    this.httpService.post(`${process.env.GAME_SERVICE_URL}/api/v1/games`, {
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
                    })
                );
                const url = `/game/${gameResponse.data.gameId}`;
                const gameId = gameResponse.data.gameId;

                [queueEntry.userId, opponent.userId].forEach(userId => {
                    this.matchmakingGateway.sendToUser(userId, { url, gameId });
                });

                return { url, gameId };

            } catch (error) {

                queueEntry.isGuest
                    ? this.guestQueue.set(queueEntry.userId, queueEntry)
                    : this.userQueue.set(queueEntry.userId, queueEntry);

                opponent.isGuest  // ✅ Use opponent.isGuest
                    ? this.guestQueue.set(opponent.userId, opponent)
                    : this.userQueue.set(opponent.userId, opponent);

                this.logger.error('Failed to create game:', error);
                throw new Error('Failed to create game');
            }
        } else {
            queueEntry.isGuest
                ? this.guestQueue.set(queueEntry.userId, queueEntry)
                : this.userQueue.set(queueEntry.userId, queueEntry);

            this.logger.log(`User ${queueEntry.username} added to ${queueEntry.isGuest ? 'guest' : 'user'} queue for ${queueEntry.timeControl}`);

            return {
                message: 'added to queue',
            };
        }
    }

    private findGuestOpponent(player: QueueEntry): QueueEntry | null {
        for (const [userId, opponent] of this.guestQueue) {
            if (this.isTimeControlMatch(opponent.timeControl, player.timeControl) && userId !== player.userId) {
                return opponent;
            }
        }
        return null;
    }

    private findUserOpponent(player: QueueEntry): QueueEntry | null {
        for (const [userId, opponent] of this.userQueue) {
            // ✅ Compare timeControl objects and ratings
            if (!this.isTimeControlMatch(opponent.timeControl, player.timeControl) || userId === player.userId) continue;
            const ratingDiff = Math.abs(opponent.rating - player.rating);
            if (ratingDiff <= 100) {
                return opponent;
            }
        }
        return null;
    }

    private isTimeControlMatch(tc1: TimeControl, tc2: TimeControl): boolean {
        return tc1.type === tc2.type &&
            tc1.initialTime === tc2.initialTime &&
            tc1.increment === tc2.increment;
    }

    private assignUserColors(player1: QueueEntry, player2: QueueEntry): { player1: string, player2: string } {
        const p1Balance = player1.balanceColor || 0;
        const p2Balance = player2.balanceColor || 0;

        if (p1Balance < p2Balance) {
            return { player1: 'white', player2: 'black' };
        } else if (p2Balance < p1Balance) {
            return { player1: 'black', player2: 'white' };
        } else {
            // Equal balance → random
            const player1White = Math.random() < 0.5;
            return {
                player1: player1White ? 'white' : 'black',
                player2: player1White ? 'black' : 'white'
            };
        }
    }

    private assignGuestColors(): { player1: string, player2: string } {
        const player1White = Math.random() < 0.5;
        return {
            player1: player1White ? 'white' : 'black',
            player2: player1White ? 'black' : 'white'
        };
    }

    // ✅ NEW: Call Auth Service API instead of direct DB access
    private async getUserBalanceColor(userId: string, timeControl: TimeControl): Promise<number> {
        try {
            this.logger.log(`Calling Auth Service with userId: ${userId}, timeControl: ${JSON.stringify(timeControl)}`);
            const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
            // ✅ Use timeControl.type instead of mapping

            const response = await firstValueFrom(
                this.httpService.get(`${process.env.AUTH_SERVICE_URL}/api/v1/users/${userId}/rating/${timeControl.type}/balance`)
            );

            return response.data.balance || 0;
        } catch (error) {
            this.logger.error(`Failed to get color balance for user ${userId} from Auth Service:`, error);
            return 0; // Default balance for resilience
        }
    }

    async leaveQueue(userId: string): Promise<any> {
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

    async getQueueStatus(userId: string): Promise<any> {
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
}