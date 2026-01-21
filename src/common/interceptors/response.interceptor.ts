import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs';

interface StandardResponse {
  success: boolean;
  data: unknown;
  message: string | null;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse> {
    return next.handle().pipe(
      map((data: unknown): StandardResponse => {
        // If data already has success field, return as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          (data as { success: unknown }).success === true
        ) {
          return data as StandardResponse;
        }

        // Otherwise wrap in standard format
        const dataObj = data as { data?: unknown; message?: string } | null;
        return {
          success: true,
          data: dataObj?.data ?? data,
          message: dataObj?.message ?? null,
        };
      }),
    );
  }
}
