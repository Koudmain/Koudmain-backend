'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE document_category AS ENUM ('CONTRACT', 'INVOICE', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.createTable('document', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      original_filename: {
        type: Sequelize.STRING,
        allowNull: true
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('CONTRACT', 'INVOICE', 'OTHER'),
        allowNull: false
      },
      size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('document', {
      fields: ['id', 'category'],
      type: 'unique',
      name: 'uq_document_id_category'
    });

    await queryInterface.createTable('contract', {
      document_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false
      },
      document_category: {
        type: Sequelize.ENUM('CONTRACT', 'INVOICE', 'OTHER'),
        allowNull: false,
        defaultValue: 'CONTRACT'
      },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mission', key: 'id' },
        onDelete: 'CASCADE'
      },
      signed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      worker_signature_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      employer_signature_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true
      }
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "contract"
      ADD CONSTRAINT "fk_contract_document"
      FOREIGN KEY ("document_id", "document_category")
      REFERENCES "document" ("id", "category") ON DELETE CASCADE;

      ALTER TABLE "contract"
      ADD CONSTRAINT "check_contract_category"
      CHECK ("document_category" = 'CONTRACT');
    `);

    await queryInterface.createTable('invoice', {
      document_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false
      },
      document_category: {
        type: Sequelize.ENUM('CONTRACT', 'INVOICE', 'OTHER'),
        allowNull: false,
        defaultValue: 'INVOICE'
      },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mission', key: 'id' },
        onDelete: 'CASCADE'
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      amount_ht: {
        type: Sequelize.NUMERIC(10, 2),
        allowNull: true
      },
      amount_ttc: {
        type: Sequelize.NUMERIC(10, 2),
        allowNull: true
      },
      fee_amount: {
        type: Sequelize.NUMERIC(10, 2),
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true
      }
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "invoice"
      ADD CONSTRAINT "fk_invoice_document"
      FOREIGN KEY ("document_id", "document_category")
      REFERENCES "document" ("id", "category") ON DELETE CASCADE;

      ALTER TABLE "invoice"
      ADD CONSTRAINT "check_invoice_category"
      CHECK ("document_category" = 'INVOICE');
    `);

    await queryInterface.createTable('document_assignment', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'document', key: 'id' },
        onDelete: 'CASCADE'
      },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'worker_profile', key: 'id' },
        onDelete: 'SET NULL'
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'company', key: 'id' },
        onDelete: 'SET NULL'
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "document_assignment"
      ADD CONSTRAINT "check_owner_exists"
      CHECK ("worker_id" IS NOT NULL OR "company_id" IS NOT NULL);
    `);

    await queryInterface.createTable('document_context', {
      document_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: 'document', key: 'id' },
        onDelete: 'CASCADE'
      },
      publication_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'publication', key: 'id' },
        onDelete: 'SET NULL'
      },
      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'conversation', key: 'id' },
        onDelete: 'SET NULL'
      },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'mission', key: 'id' },
        onDelete: 'SET NULL'
      }
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "document_context"
      ADD CONSTRAINT "check_context_exists"
      CHECK ("publication_id" IS NOT NULL OR "conversation_id" IS NOT NULL OR "mission_id" IS NOT NULL);
    `);

    await queryInterface.addColumn('message', 'document_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'document', key: 'id' },
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('message', 'document_id');

    await queryInterface.dropTable('document_context');
    await queryInterface.dropTable('document_assignment');
    await queryInterface.dropTable('invoice');
    await queryInterface.dropTable('contract');
    await queryInterface.dropTable('document');

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS document_category;`);
  }
};
