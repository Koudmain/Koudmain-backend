'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('outbox_event', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        // Ex: APPLICATION_CREATED. Volontairement un varchar libre, pas un enum Postgres :
        // de nouveaux types d'événements s'ajouteront au fil des tickets suivants, sans
        // dépendre de cette migration.
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('Pending', 'Published'),
        allowNull: false,
        defaultValue: 'Pending',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Requête du relais outbox : les événements en attente, du plus ancien au plus récent.
    await queryInterface.addIndex('outbox_event', ['status', 'created_at'], {
      name: 'outbox_event_status_created_at_idx',
    });

    await queryInterface.createTable('notification_delivery', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      outbox_event_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'outbox_event', key: 'id' },
        onDelete: 'CASCADE',
      },
      application_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'application', key: 'id' },
        onDelete: 'CASCADE',
      },
      channel: {
        type: Sequelize.ENUM('Push', 'Websocket'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('Sent', 'Failed'),
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    await queryInterface.addIndex('notification_delivery', ['application_id'], {
      name: 'notification_delivery_application_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_delivery');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_notification_delivery_status";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_notification_delivery_channel";',
    );

    await queryInterface.dropTable('outbox_event');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_outbox_event_status";');
  },
};
