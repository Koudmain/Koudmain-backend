import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DriveModule } from './modules/drive/drive.module';
import { PublicationModule } from './modules/publication/publication.module';
import { PlanningModule } from './modules/planning/planning.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SkillModule } from './modules/skill/skill.module';
import { SkillCategoryModule } from './modules/skill-category/skill-category.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { ChatModule } from './modules/chat/chat.module';
import { WorkersModule } from './modules/workers/workers.module';
import { AddressModule } from './modules/address/address.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadModels: true,
      synchronize: true,
      sync: { alter: true },
    }),
    UsersModule,
    AuthModule,
    CompaniesModule,
    DriveModule,
    PublicationModule,
    PlanningModule,
    SkillModule,
    SkillCategoryModule,
    MailerModule,
    ChatModule,
    WorkersModule,
    AddressModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
