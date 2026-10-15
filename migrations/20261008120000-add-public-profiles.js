'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('company', 'description', { type: Sequelize.TEXT });
    await queryInterface.addColumn('company', 'logo_url', { type: Sequelize.STRING(255) });
    await queryInterface.addColumn('company', 'cover_image_url', { type: Sequelize.STRING(255) });
    await queryInterface.addColumn('company', 'specialties', { type: Sequelize.STRING(255) });
    await queryInterface.addColumn('company', 'capacity', { type: Sequelize.INTEGER });
    await queryInterface.addColumn('company', 'team_size', { type: Sequelize.STRING(100) });
    await queryInterface.addColumn('company', 'meal_provided', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('company', 'dress_code', { type: Sequelize.STRING(255) });
    await queryInterface.addColumn('company', 'siret_verified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('company', 'koudmain_validated', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('company', 'average_rating', {
      type: Sequelize.DECIMAL(3, 2),
      defaultValue: 0,
    });
    await queryInterface.addColumn('company', 'review_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addColumn('worker_profile', 'review_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addColumn('worker_profile', 'response_rate', {
      type: Sequelize.DECIMAL(5, 2),
    });
    await queryInterface.addColumn('worker_profile', 'avg_response_time_min', {
      type: Sequelize.INTEGER,
    });
    await queryInterface.addColumn('worker_profile', 'missions_completed', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addColumn('review', 'rated_company_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'company', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addColumn('review', 'payment_on_time', { type: Sequelize.BOOLEAN });
    await queryInterface.addColumn('review', 'mission_matches_listing', {
      type: Sequelize.BOOLEAN,
    });
    await queryInterface.addColumn('application', 'cv_document_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'document', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('application', 'cover_letter_document_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'document', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('application', 'responded_at', { type: Sequelize.DATE });
    await queryInterface.addColumn('mission', 'paid_at', { type: Sequelize.DATE });
    await queryInterface.addColumn('mission', 'payment_due_date', { type: Sequelize.DATE });

    await queryInterface.createTable('worker_experience', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'worker_profile', key: 'id' },
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      duration_months: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.createTable('worker_formation', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'worker_profile', key: 'id' },
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      institution: { type: Sequelize.STRING(255) },
      type: { type: Sequelize.STRING(50) },
      obtained_date: { type: Sequelize.DATEONLY },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.createTable('worker_verification', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'worker_profile', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.STRING(50), allowNull: false },
      status: { type: Sequelize.STRING(50), defaultValue: 'PENDING' },
      verified_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.createTable('payment_report', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mission', key: 'id' },
      },
      reporter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'user', key: 'id' },
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company', key: 'id' },
      },
      report_type: { type: Sequelize.STRING(50), allowNull: false },
      description: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(50), defaultValue: 'OPEN' },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
      resolved_at: { type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    for (const table of [
      'payment_report',
      'worker_verification',
      'worker_formation',
      'worker_experience',
    ]) {
      await queryInterface.dropTable(table);
    }
    for (const [table, column] of [
      ['mission', 'payment_due_date'],
      ['mission', 'paid_at'],
      ['application', 'responded_at'],
      ['application', 'cover_letter_document_id'],
      ['application', 'cv_document_id'],
      ['review', 'mission_matches_listing'],
      ['review', 'payment_on_time'],
      ['review', 'rated_company_id'],
      ['worker_profile', 'missions_completed'],
      ['worker_profile', 'avg_response_time_min'],
      ['worker_profile', 'response_rate'],
      ['worker_profile', 'review_count'],
      ['company', 'review_count'],
      ['company', 'average_rating'],
      ['company', 'koudmain_validated'],
      ['company', 'siret_verified'],
      ['company', 'dress_code'],
      ['company', 'meal_provided'],
      ['company', 'team_size'],
      ['company', 'capacity'],
      ['company', 'specialties'],
      ['company', 'cover_image_url'],
      ['company', 'logo_url'],
      ['company', 'description'],
    ])
      await queryInterface.removeColumn(table, column);
  },
};
