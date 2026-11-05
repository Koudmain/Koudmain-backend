'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('device_token', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'user', key: 'id' },
        onDelete: 'CASCADE',
      },
      token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      platform: {
        type: Sequelize.ENUM('IOS', 'ANDROID'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    // Use for user w/ multiple device
    await queryInterface.addIndex('device_token', ['user_id'], {
      name: 'device_token_user_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('device_token');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_device_token_platform";');
  },
};
