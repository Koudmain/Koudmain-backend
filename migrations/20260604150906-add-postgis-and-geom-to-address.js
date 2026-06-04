'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    await queryInterface.addColumn('address', 'geom', {
      type: Sequelize.GEOGRAPHY('POINT', 4326),
      allowNull: true
    });

    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS "idx_address_geom" ON "address" USING GIST ("geom");'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_address_geom";');

    await queryInterface.removeColumn('address', 'geom');

  }
};
