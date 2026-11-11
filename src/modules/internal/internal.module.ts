import { Module } from '@nestjs/common';
import { ApplicationModule } from '@/modules/application/application.module';
import { PushModule } from '@/modules/push/push.module';
import { InternalController } from '@/modules/internal/controllers/internal.controller';
import { InternalAuthGuard } from '@/modules/internal/internal-auth.guard';
import { NotificationDeliveryService } from '@/modules/internal/services/notification-delivery.service';

@Module({
  imports: [ApplicationModule, PushModule],
  controllers: [InternalController],
  providers: [InternalAuthGuard, NotificationDeliveryService],
})
export class InternalModule {}
