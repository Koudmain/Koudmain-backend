'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const statusType = Sequelize.ENUM('Pending', 'Accepted', 'Rejected');

    // Une seule transaction : sans elle, un échec à mi-parcours laisse la table à moitié migrée.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const run = (sql) => queryInterface.sequelize.query(sql, { transaction });

      // Nettoyage des données existantes, sinon les contraintes ci-dessous échouent.
      await run(`
        UPDATE application SET status = CASE lower(status)
          WHEN 'accepted' THEN 'Accepted'
          WHEN 'rejected' THEN 'Rejected'
          WHEN 'pending' THEN 'Pending'
          ELSE status END
        WHERE status IS NOT NULL`);
      await run(`UPDATE application SET status = 'Pending' WHERE status IS NULL`);

      const [unknown] = await run(`
        SELECT DISTINCT status FROM application
        WHERE status NOT IN ('Pending', 'Accepted', 'Rejected')`);
      if (unknown.length > 0) {
        throw new Error(
          `application.status contient des valeurs inconnues (${unknown.map((r) => r.status).join(', ')}) : ` +
            'les corriger à la main avant de relancer la migration',
        );
      }

      // Candidature sans publication ou sans travailleur : inutilisable.
      await run(`DELETE FROM application WHERE publication_id IS NULL OR worker_id IS NULL`);

      // Doublons (publication, worker) : on garde celle déjà traitée, sinon la plus ancienne.
      await run(`
        DELETE FROM application WHERE id IN (
          SELECT id FROM (
            SELECT id, row_number() OVER (
              PARTITION BY publication_id, worker_id
              ORDER BY (status <> 'Pending') DESC, id ASC
            ) AS rank
            FROM application
          ) ranked WHERE rank > 1
        )`);

      // Change the type
      await queryInterface.changeColumn(
        'application',
        'status',
        { type: statusType },
        { transaction },
      );

      // Then set default value
      await queryInterface.changeColumn(
        'application',
        'status',
        { type: statusType, allowNull: false, defaultValue: 'Pending' },
        { transaction },
      );

      await queryInterface.changeColumn(
        'application',
        'publication_id',
        { type: Sequelize.INTEGER, allowNull: false },
        { transaction },
      );

      await queryInterface.changeColumn(
        'application',
        'worker_id',
        { type: Sequelize.INTEGER, allowNull: false },
        { transaction },
      );

      // Un travailleur = Une candidature.
      await queryInterface.addConstraint('application', {
        fields: ['publication_id', 'worker_id'],
        type: 'unique',
        name: 'application_publication_id_worker_id_unique',
        transaction,
      });

      // Lecture de candidature
      await queryInterface.addIndex('application', ['publication_id'], {
        name: 'application_publication_id_idx',
        transaction,
      });
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
