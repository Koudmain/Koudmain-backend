'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('application', 'status', {
      type: Sequelize.ENUM('Pending', 'Accepted', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending',
    });

    await queryInterface.changeColumn('application', 'publication_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn('application', 'worker_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // Un travailleur = Une candidature.
    await queryInterface.addConstraint('application', {
      fields: ['publication_id', 'worker_id'],
      type: 'unique',
      name: 'application_publication_id_worker_id_unique',
    });

    // Lecture de candidature
    await queryInterface.addIndex('application', ['publication_id'], {
      name: 'application_publication_id_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('application', 'application_publication_id_idx');
    await queryInterface.removeConstraint(
      'application',
      'application_publication_id_worker_id_unique',
    );

    await queryInterface.changeColumn('application', 'worker_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.changeColumn('application', 'publication_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.changeColumn('application', 'status', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_application_status";');
  },
};
