import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from '../auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.extractBearerToken(request);
    const user = await this.authService.getUserByAccessToken(accessToken);

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'برای دسترسی باید وارد شوید',
      });
    }

    request.user = user;
    request.accessToken = accessToken;
    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers?.authorization;
    if (typeof authorization !== 'string') {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');
    return scheme === 'Bearer' && token ? token : undefined;
  }
}
