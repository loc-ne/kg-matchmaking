import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Server } from 'ws';
import { MatchmakingGateway } from './matchmaking/matchmaking.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
app.enableCors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
});
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());

  const server = app.getHttpServer();
  const wss = new Server({ server }); 
  const matchmakingGateway = app.get(MatchmakingGateway);
  matchmakingGateway.setServer(wss); 

  const port = process.env.PORT || 3001;
  console.log(`Loaded PORT from .env: ${process.env.PORT}`);
  await app.listen(port);
  console.log(`Matchmaking Service is running on port ${port}`);
}
bootstrap();