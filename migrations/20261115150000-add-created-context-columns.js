'use strict';

const TABLES_WITHOUT_CREATED_AT = [
  'address',
  'company_document',
  'company_job',
  'company_member',
  'contract',
  'conversation',
  'conversation_settings',
  'message_status',
  'mission',
  'publication_skill',
  'skill',
  'skill_category',
  'wallet',
  'worker_document',
  'worker_job',
  'worker_profile',
  'worker_skill',
];

const TABLES_WITH_CREATED_AT = [
  { table: 'application', hadDefault: true, wasNotNull: false },
  { table: 'company', hadDefault: true, wasNotNull: false },
  { table: 'document', hadDefault: false, wasNotNull: false },
  { table: 'invoice', hadDefault: false, wasNotNull: false },
  { table: 'message', hadDefault: true, wasNotNull: false },
  { table: 'payment_report', hadDefault: true, wasNotNull: false },
  { table: 'publication', hadDefault: true, wasNotNull: false },
  { table: 'refresh_session', hadDefault: true, wasNotNull: true },
  { table: 'review', hadDefault: true, wasNotNull: false },
  { table: 'user', hadDefault: true, wasNotNull: false },
  { table: 'wallet_transaction', hadDefault: true, wasNotNull: false },
  { table: 'worker_experience', hadDefault: true, wasNotNull: false },
  { table: 'worker_formation', hadDefault: true, wasNotNull: false },
  { table: 'worker_verification', hadDefault: true, wasNotNull: false },
];

const TABLES_WITH_CREATED_BY = [
  'address',
  'company',
  'company_document',
  'company_member',
  'contract',
  'conversation',
  'document',
  'invoice',
  'mission',
  'skill',
  'skill_category',
  'user',
  'wallet',
  'wallet_transaction',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const query = (sql) => queryInterface.sequelize.query(sql, { transaction });

      for (const table of TABLES_WITHOUT_CREATED_AT) {
        await queryInterface.addColumn(
          table,
          'created_at',
          {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('now'),
          },
          { transaction },
        );
      }

      for (const { table } of TABLES_WITH_CREATED_AT) {
        await query(`ALTER TABLE "${table}" ALTER COLUMN "created_at" SET DEFAULT now();`);
        await query(`UPDATE "${table}" SET "created_at" = now() WHERE "created_at" IS NULL;`);
        await query(`ALTER TABLE "${table}" ALTER COLUMN "created_at" SET NOT NULL;`);
      }

      for (const table of TABLES_WITH_CREATED_BY) {
        await queryInterface.addColumn(
          table,
          'created_by',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'user', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      await queryInterface.renameColumn('publication', 'created_by_user_id', 'created_by', {
        transaction,
      });
      await query(
        `ALTER TABLE "publication" DROP CONSTRAINT "publication_created_by_user_id_fkey";`,
      );
      await query(`
        ALTER TABLE "publication"
        ADD CONSTRAINT "publication_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "user" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL;
      `);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const query = (sql) => queryInterface.sequelize.query(sql, { transaction });

      await query(`ALTER TABLE "publication" DROP CONSTRAINT "publication_created_by_fkey";`);
      await queryInterface.renameColumn('publication', 'created_by', 'created_by_user_id', {
        transaction,
      });
      await query(`
        ALTER TABLE "publication"
        ADD CONSTRAINT "publication_created_by_user_id_fkey"
        FOREIGN KEY ("created_by_user_id") REFERENCES "user" ("id")
        DEFERRABLE INITIALLY IMMEDIATE;
      `);

      for (const table of TABLES_WITH_CREATED_BY) {
        await queryInterface.removeColumn(table, 'created_by', { transaction });
      }

      for (const { table, hadDefault, wasNotNull } of TABLES_WITH_CREATED_AT) {
        if (!wasNotNull) {
          await query(`ALTER TABLE "${table}" ALTER COLUMN "created_at" DROP NOT NULL;`);
        }
        if (!hadDefault) {
          await query(`ALTER TABLE "${table}" ALTER COLUMN "created_at" DROP DEFAULT;`);
        }
      }

      for (const table of TABLES_WITHOUT_CREATED_AT) {
        await queryInterface.removeColumn(table, 'created_at', { transaction });
      }
    });
  },
};
