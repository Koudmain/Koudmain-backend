'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const category of ['IDENTITY', 'RIB', 'DIPLOMA', 'KBIS']) {
      await queryInterface.sequelize.query(
        `ALTER TYPE document_category ADD VALUE IF NOT EXISTS '${category}' BEFORE 'OTHER';`,
      );
    }

    await queryInterface.addColumn('document', 'version_id', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'seed',
    });

    await queryInterface.addColumn('document', 'checksum_sha256', {
      type: Sequelize.STRING(64),
      allowNull: false,
      defaultValue: '0'.repeat(64),
    });

    for (const column of ['version_id', 'checksum_sha256']) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "document" ALTER COLUMN "${column}" DROP DEFAULT;`,
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('document', 'checksum_sha256');
    await queryInterface.removeColumn('document', 'version_id');

    await queryInterface.sequelize.query(`
      UPDATE "document" SET category = 'OTHER'
      WHERE category IN ('IDENTITY', 'RIB', 'DIPLOMA', 'KBIS');
    `);
  },
};
