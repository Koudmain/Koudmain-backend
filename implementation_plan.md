# Implementation Plan - Associating Skills with Publications

This plan describes the backend changes required to link publications (`Publication`) to a list of skills (`Skill`). The database table for the join table (`publication_skill`) already exists in `db/koudmain-db.sql`, so no database schema changes are required.

## User Review Required

> [!NOTE]
> We will handle `skills` as an optional parameter (`skills?: number[]`) in publication creation and updating DTOs.
> The API will accept an array of skill IDs, update the `publication_skill` junction table, and return the list of associated skills when retrieving or updating publications.

## Proposed Changes

### 1. Database Model & Association Setup

We will declare a Many-to-Many association between `Publication` and `Skill` using the standard `sequelize-typescript` `@BelongsToMany` decorator.

#### [NEW] [publication-skill.model.ts](file:///home/mygp/delivery/Koudmain/Koudmain-backend/src/modules/publication/models/publication-skill.model.ts)
A new Sequelize-typescript model representing the junction table `publication_skill`.
```typescript
import { Table, Column, Model, ForeignKey, DataType } from 'sequelize-typescript';
import { Publication } from './publication.model';
import { Skill } from '@/modules/skill/models/skill.model';

@Table({ tableName: 'publication_skill', timestamps: false })
export class PublicationSkill extends Model {
  @ForeignKey(() => Publication)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare publication_id: number;

  @ForeignKey(() => Skill)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare skill_id: number;
}
```

#### [MODIFY] [publication.model.ts](file:///home/mygp/delivery/Koudmain/Koudmain-backend/src/modules/publication/models/publication.model.ts)
- Add `@BelongsToMany(() => Skill, () => PublicationSkill)` for skills relationship:
  ```typescript
  @BelongsToMany(() => Skill, () => PublicationSkill)
  declare skills?: Skill[];
  ```
- Update `PostPublicationDto` to support the optional list of skills:
  ```typescript
  declare skills?: number[];
  ```

#### [MODIFY] [skill.model.ts](file:///home/mygp/delivery/Koudmain/Koudmain-backend/src/modules/skill/models/skill.model.ts)
- Add `@BelongsToMany(() => Publication, () => PublicationSkill)` for the reverse relationship, using lazy resolution arrow functions to avoid circular reference evaluation issues:
  ```typescript
  @BelongsToMany(() => Publication, () => PublicationSkill)
  declare publications?: Publication[];
  ```

#### [MODIFY] [publication.module.ts](file:///home/mygp/delivery/Koudmain/Koudmain-backend/src/modules/publication/publication.module.ts)
- Register `PublicationSkill` model:
  ```typescript
  imports: [SequelizeModule.forFeature([Publication, PublicationSkill])]
  ```

---

### 2. Business Logic updates (Services & Controllers)

#### [MODIFY] [publication.service.ts](file:///home/mygp/delivery/Koudmain/Koudmain-backend/src/modules/publication/services/publication.service.ts)
- Include `Skill` model in `getAll`, `getById`, and `update` queries.
- In `create(publication)`:
  - Extract the optional `skills` ID array.
  - Create the publication entity.
  - If `skills` is provided, associate them via `await createdPublication.$set('skills', skills)`.
  - Return the publication with its skills included (reload or fetch by ID).
- In `update(id, publication)`:
  - Extract the optional `skills` ID array.
  - Perform the standard publication entity update.
  - If `skills` is provided, update the association via `await existingPublication.$set('skills', skills)`.
  - Return the updated publication with its skills.

---

### 3. Verification & Testing

#### [MODIFY] [publication.controller.spec.ts](file:///home/mygp/delivery/Koudmain/Koudmain-backend/src/modules/publication/controllers/publication.controller.spec.ts)
- Update `createDto` mock data to include an optional `skills: [1, 2]` field.
- Verify controller responds properly and matches updated response format.

#### [MODIFY] [publication.service.spec.ts](file:///home/mygp/delivery/Koudmain/Koudmain-backend/src/modules/publication/services/publication.service.spec.ts)
- Mock the `$set` method on the sequelize publication instances or mock the model save.
- Add test coverage for publication creation and updating with a list of associated skills.

#### [MODIFY] [app.e2e-spec.ts](file:///home/mygp/delivery/Koudmain/Koudmain-backend/test/app.e2e-spec.ts)
- Truncate `publication_skill` in `afterAll()`.
- Add/update tests:
  - Create a skill E2E.
  - Create a publication linked with that skill ID (`skills: [createdSkillId]`).
  - Expect 201 Created and verify the returned publication contains the skill list.
  - Verify that updating the publication's skills behaves correctly.

## Verification Plan

### Automated Tests
- Run NestJS backend unit tests: `npm run test`
- Run NestJS backend E2E tests: `docker exec koudmain-backend npx jest --config ./test/jest-e2e.json test/app.e2e-spec.ts`
