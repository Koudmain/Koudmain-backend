'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('worker_profile', 'skill_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'skill_category', key: 'id' },
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('company', 'owner_position', {
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
    await queryInterface.removeColumn('company', 'owner_position');
    await queryInterface.removeColumn('worker_profile', 'skill_category_id');
  },
};
