'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('worker_profile', 'worker_profile_user_id_fkey');
    await queryInterface.removeConstraint('worker_profile', 'worker_profile_user_id_fkey1');
    await queryInterface.addConstraint('worker_profile', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'worker_profile_user_id_fkey',
      references: {
        table: 'user',
        field: 'id',
      },
      onDelete: 'CASCADE',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('worker_profile', 'worker_profile_user_id_fkey');
  }
};
