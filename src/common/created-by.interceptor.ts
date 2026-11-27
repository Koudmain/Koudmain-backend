import { AsyncLocalStorage } from 'node:async_hooks';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  OnModuleInit,
} from '@nestjs/common';
import { Model, ModelCtor, Sequelize } from 'sequelize-typescript';
import { Observable } from 'rxjs';
import type { JwtPayload } from '@/decorators/current-user.decorator';

const currentUserId = new AsyncLocalStorage<number | undefined>();

const attributesForColumns = (model: ModelCtor, columns: string[]) =>
  Object.entries(model.getAttributes())
    .filter(([, attribute]) => columns.includes(attribute.field ?? ''))
    .map(([name]) => name);

const setCreatedBy = (instance: Model) => {
  const userId = currentUserId.getStore();
  if (!userId) return;
  for (const attribute of attributesForColumns(instance.constructor as ModelCtor, ['created_by'])) {
    instance.set(attribute, userId);
  }
};

const IMMUTABLE_COLUMNS = ['created_at', 'created_by'];

@Injectable()
export class CreatedByInterceptor implements NestInterceptor, OnModuleInit {
  constructor(private readonly sequelize: Sequelize) {}

  onModuleInit() {
    this.sequelize.addHook('beforeCreate', setCreatedBy);
    this.sequelize.addHook('beforeBulkCreate', (instances: Model[]) =>
      instances.forEach(setCreatedBy),
    );
    this.sequelize.addHook('beforeUpdate', (instance: Model, options: { fields?: string[] }) => {
      const immutable = attributesForColumns(instance.constructor as ModelCtor, IMMUTABLE_COLUMNS);
      options.fields = options.fields?.filter((field) => !immutable.includes(field));
      for (const attribute of immutable) {
        if (!instance.changed(attribute as keyof Model)) continue;
        instance.set(attribute, instance.previous(attribute));
        instance.changed(attribute as keyof Model, false);
      }
    });
    this.sequelize.addHook('beforeBulkUpdate', (options) => {
      const { attributes, model } = options as typeof options & {
        attributes: Record<string, unknown>;
        model: ModelCtor;
      };
      const immutable = attributesForColumns(model, IMMUTABLE_COLUMNS);
      options.fields = options.fields?.filter((field) => !immutable.includes(String(field)));
      for (const attribute of immutable) delete attributes[attribute];
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const userId = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user?.sub;
    return new Observable((subscriber) =>
      currentUserId.run(userId, () => next.handle().subscribe(subscriber)),
    );
  }
}
