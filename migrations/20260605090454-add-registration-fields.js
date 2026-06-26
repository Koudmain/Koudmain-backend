'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `CREATE TYPE "user_role" AS ENUM ('WORKER', 'EMPLOYER');`,
    );

    await queryInterface.addColumn('user', 'phone_number', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn('user', 'email_verified_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('user', 'birth_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('user', 'role', {
      type: Sequelize.ENUM('WORKER', 'EMPLOYER'),
      allowNull: false,
      defaultValue: 'WORKER',
    });

    await queryInterface.removeColumn('user', 'is_worker_active');
    await queryInterface.removeColumn('user', 'is_employer_active');

    await queryInterface.addColumn('worker_profile', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.renameColumn(
      'worker_profile',
      'max_distance_km',
      'work_radius',
    );

    await queryInterface.createTable('worker_trade', {
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'worker_profile', key: 'id' },
        onDelete: 'CASCADE',
      },
      skill_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'skill_category', key: 'id' },
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.addColumn('company', 'owner_position', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('company', 'company_type', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.createTable('company_trade', {
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'company', key: 'id' },
        onDelete: 'CASCADE',
      },
      skill_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'skill_category', key: 'id' },
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.changeColumn('user', 'first_name', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    await queryInterface.changeColumn('user', 'last_name', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    await queryInterface.changeColumn('user', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });

    await queryInterface.changeColumn('user', 'password', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn('company', 'name', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    await queryInterface.changeColumn('worker_profile', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'user', key: 'id' },
      onDelete: 'CASCADE',
    });

    await queryInterface.sequelize.query(`
      INSERT INTO "skill_category" ("name") VALUES
        ('Restaurant FOH'),
        ('Restaurant BOH'),
        ('Café')
      ON CONFLICT DO NOTHING;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM "skill_category"
      WHERE "name" IN ('Restaurant FOH', 'Restaurant BOH', 'Café');
    `);

    await queryInterface.dropTable('company_trade');
    await queryInterface.removeColumn('company', 'company_type');
    await queryInterface.removeColumn('company', 'owner_position');
    await queryInterface.dropTable('worker_trade');

    await queryInterface.renameColumn(
      'worker_profile',
      'work_radius',
      'max_distance_km',
    );
    await queryInterface.removeColumn('worker_profile', 'bio');

    await queryInterface.addColumn('user', 'is_employer_active', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('user', 'is_worker_active', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    // ── Revert NOT NULL constraints (retour à nullable) ──────────────────────

    await queryInterface.changeColumn('worker_profile', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'user', key: 'id' },
      onDelete: 'CASCADE',
    });

    await queryInterface.changeColumn('company', 'name', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.changeColumn('user', 'password', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn('user', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.changeColumn('user', 'last_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.changeColumn('user', 'first_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.removeColumn('user', 'role');
    await queryInterface.removeColumn('user', 'birth_date');
    await queryInterface.removeColumn('user', 'email_verified_at');
    await queryInterface.removeColumn('user', 'phone_number');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "user_role";`);
  },
};
