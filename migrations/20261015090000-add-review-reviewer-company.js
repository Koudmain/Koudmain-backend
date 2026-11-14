'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('review', 'reviewer_company_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'company', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.sequelize.query(`
      UPDATE review r
      SET reviewer_company_id = m.company_id
      FROM mission m
      WHERE r.mission_id = m.id AND r.type = 'Company_to_Worker';
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('review', 'reviewer_company_id');
  },
};
