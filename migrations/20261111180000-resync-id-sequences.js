'use strict';

// Ids used to be computed with max(id) + 1, which never advanced the serial sequences.
// Move each sequence past the current max so Postgres can assign ids again.
const TABLES = ['user', 'publication', 'skill'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${table}";`,
      );
    }
  },

  async down() {
    // Nothing to undo: a sequence ahead of max(id) is valid.
  },
};
