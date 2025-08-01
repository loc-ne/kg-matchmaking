import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';

@Module({
  imports: [HttpModule],
  controllers: [MatchmakingController],
  providers: [MatchmakingService, MatchmakingGateway],
  exports: [MatchmakingService, MatchmakingGateway],
})
export class MatchmakingModule {}