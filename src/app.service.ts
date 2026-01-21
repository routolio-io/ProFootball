import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck(): { status: string; timestamp: number; service: string } {
    return {
      status: 'ok',
      timestamp: Math.floor(Date.now() / 1000),
      service: 'ProFootball API',
    };
  }
}
