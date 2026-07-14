import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AuthService } from '../auth.service';
import type {
  AuthenticatedRequest,
  AuthenticatedResponse,
} from '../auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<AuthenticatedResponse>();
    const accessToken = this.authService.getAccessTokenFromRequest(request);
    const refreshToken = this.authService.getRefreshTokenFromRequest(request);
    const authenticated = await this.authService.authenticate(
      accessToken,
      refreshToken,
    );

    if (!authenticated) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'برای دسترسی باید وارد شوید',
      });
    }

    if (authenticated.tokens) {
      this.authService.setAuthCookies(response, authenticated.tokens);
      request.accessToken = authenticated.tokens.accessToken;
    } else {
      request.accessToken = accessToken;
    }

    request.user = authenticated.user;
    return true;
  }
}
