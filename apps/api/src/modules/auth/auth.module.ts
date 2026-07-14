import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { OtpCodeEntity } from './entities/otp-code.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from './entities/user.entity';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpCodeEntity, RefreshTokenEntity, UserEntity]),
  ],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
