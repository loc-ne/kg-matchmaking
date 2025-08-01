import { Injectable, Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';

@Injectable()
export class MatchmakingGateway {
  private server: Server;
  private wsClients = new Map<string, WebSocket>();
  private logger = new Logger('MatchmakingGateway');

  setServer(server: Server) {
    this.server = server;
   
    this.server.on('connection', (client: WebSocket, req: any) => {
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
        } else {
          client.close(1008, 'userId is required');
        }
      } catch (error) {
        this.logger.error(`Error parsing WebSocket URL: ${error.message}`);
        client.close(1008, 'Invalid URL');
      }
    });

    this.server.on('error', (error) => {
      this.logger.error(`WebSocket Server Error: ${error.message}`);
    });
  }

  sendToUser(userId: string, message: any) {
    const client = this.wsClients.get(String(userId));
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    } else {
      this.logger.warn(`Cannot send to user ${userId}: Client not found or not connected`);
    }
  }
}