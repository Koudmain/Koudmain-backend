'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('notification_delivery', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'user', key: 'id' },
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('notification_delivery', 'platform', {
      type: Sequelize.ENUM('IOS', 'ANDROID'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('notification_delivery', 'platform');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_notification_delivery_platform";',
    );
    await queryInterface.removeColumn('notification_delivery', 'user_id');
  },
};
