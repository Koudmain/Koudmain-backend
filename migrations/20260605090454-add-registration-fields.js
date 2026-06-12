'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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

    await queryInterface.addColumn('company', 'establishment_type', {
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('company_trade');
    await queryInterface.removeColumn('company', 'establishment_type');
    await queryInterface.removeColumn('company', 'owner_position');
    await queryInterface.dropTable('worker_trade');
  },
};
