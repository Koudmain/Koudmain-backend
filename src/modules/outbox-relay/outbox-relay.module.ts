import { Module } from '@nestjs/common';
import { ApplicationModule } from '@/modules/application/application.module';
import { OutboxRelayService } from './outbox-relay.service';

@Module({
  imports: [ApplicationModule],
  providers: [OutboxRelayService],
})
export class OutboxRelayModule {}
