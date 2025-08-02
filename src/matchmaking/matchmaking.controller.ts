import { Controller, Post, Body, UseGuards, Request, BadRequestException, Get } from '@nestjs/common';
import { JoinQueueDto } from './dto/join-queue.dto';
import { MatchmakingService } from './matchmaking.service';
import { OptionalAuthGuard } from './optional-auth.guard';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private matchmakingService: MatchmakingService) { }

  @Post('queue/join')
  async joinQueue(@Body() dto: JoinQueueDto) {
    let playerData;
    console.log('dtoData:', dto);
    if (dto.user && dto.user.sub && dto.user.username) {
      const response = await fetch(`${process.env.AUTH_SERVICE_URL}/api/v1/users/${dto.user.sub}/elo/${dto.timeControl.type}`);
      const data = await response.json();
      playerData = {
        userId: dto.user.sub,
        username: dto.user.username,
        rating: data.elo,
        timeControl: dto.timeControl,
        isGuest: false
      };
      console.log('playerData:', playerData);
    } else {
      if (!dto.guestName) {
        throw new BadRequestException('Guest name is required for non-authenticated users');
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
  @Post('queue/leave')
  @UseGuards(OptionalAuthGuard) 
  async leaveQueue(@Request() req, @Body() body: { guestId?: string }) {
    const userId = req.user?.sub || body.guestId;

    if (!userId) {
      throw new BadRequestException('User ID or Guest ID required');
    }

    return this.matchmakingService.leaveQueue(userId);
  }

  @Get('queue/status')
  @UseGuards(OptionalAuthGuard) 
  async getQueueStatus(@Request() req) {
    const userId = req.user?.sub || req.query.guestId;

    if (!userId) {
      throw new BadRequestException('User ID or Guest ID required');
    }

    return this.matchmakingService.getQueueStatus(userId as string);
  }
}