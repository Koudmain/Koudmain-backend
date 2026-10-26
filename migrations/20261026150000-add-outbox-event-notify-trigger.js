'use strict';

const CHANNEL = 'outbox_event_created';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Déclenche une notification Postgres à chaque insertion dans outbox_event
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION notify_outbox_event_created()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify('${CHANNEL}', NEW.id::text);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER outbox_event_created_trigger
      AFTER INSERT ON outbox_event
      FOR EACH ROW
      EXECUTE FUNCTION notify_outbox_event_created();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP TRIGGER IF EXISTS outbox_event_created_trigger ON outbox_event;',
    );
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS notify_outbox_event_created();');
  },
};
