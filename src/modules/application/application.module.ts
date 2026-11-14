import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Application } from './models/application.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerDocument } from '@/modules/workers/models/worker-document.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Company } from '@/modules/companies/models/company.model';
import { Address } from '@/modules/address/address.model';
import { User } from '@/modules/users/models/user.model';
import { ApplicationController } from './controllers/application.controller';
import { ApplicationService } from './services/application.service';
import { WorkersModule } from '@/modules/workers/workers.module';
import { ChatModule } from '@/modules/chat/chat.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Application,
      Publication,
      WorkerProfile,
      WorkerDocument,
      CompanyMember,
      Company,
      Address,
      User,
    ]),
    WorkersModule,
    ChatModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
