import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(private readonly app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
    ];

    const corsOptions: ServerOptions['cors'] = {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };

    const serverOptions: ServerOptions = {
      ...options,
      cors: corsOptions,
    } as ServerOptions;

    return super.createIOServer(port, serverOptions) as Server;
  }
}
