'use strict';

const DEMO_EMPLOYER_EMAIL = 'employer1@koudmain.fr';

// Publication titles come from 20260915113946-demo-company-publication.js.
// Worker emails come from 20260517203902-fake-users.js (worker1..worker10@koudmain.fr).
const APPLICATIONS_DATA = [
  { publicationTitle: 'Serveur H/F', workerEmail: 'worker1@koudmain.fr', status: 'Accepted' },
  { publicationTitle: 'Serveur H/F', workerEmail: 'worker2@koudmain.fr', status: 'Rejected' },
  { publicationTitle: 'Commis de cuisine', workerEmail: 'worker3@koudmain.fr', status: 'Accepted' },
  { publicationTitle: 'Barman H/F', workerEmail: 'worker4@koudmain.fr', status: 'Pending' },
  { publicationTitle: 'Réceptionniste de nuit', workerEmail: 'worker5@koudmain.fr', status: 'Pending' },
  {
    publicationTitle: "Hôte/Hôtesse d'accueil événementiel",
    workerEmail: 'worker6@koudmain.fr',
    status: 'Accepted',
  },
  { publicationTitle: 'Livreur à vélo H/F', workerEmail: 'worker7@koudmain.fr', status: 'Rejected' },
  { publicationTitle: 'Aide pâtissier H/F', workerEmail: 'worker8@koudmain.fr', status: 'Pending' },
  { publicationTitle: 'Plongeur en cuisine', workerEmail: 'worker9@koudmain.fr', status: 'Rejected' },
  {
    publicationTitle: "Agent d'entretien H/F",
    workerEmail: 'worker10@koudmain.fr',
    status: 'Accepted',
  },
];

async function getTargetCompanyId(queryInterface) {
  const employerQuery = await queryInterface.sequelize.query(
    `SELECT cm.company_id
     FROM company_member cm
     JOIN "user" u ON u.id = cm.user_id
     WHERE u.email = '${DEMO_EMPLOYER_EMAIL}'
     LIMIT 1;`,
  );

  let target = employerQuery[0][0];

  if (!target) {
    const fallbackQuery = await queryInterface.sequelize.query(
      `SELECT company_id FROM company_member ORDER BY company_id ASC LIMIT 1;`,
    );
    target = fallbackQuery[0][0];
  }

  return target ? target.company_id : null;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const companyId = await getTargetCompanyId(queryInterface);

    if (!companyId) {
      console.log(
        'Aucune entreprise trouvée en base (lancez le seeder fake-users avant celui-ci). Fin du seed.',
      );
      return;
    }

    const publicationTitles = [...new Set(APPLICATIONS_DATA.map((a) => a.publicationTitle))];
    const titlesList = publicationTitles.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');
    const publicationRows = (
      await queryInterface.sequelize.query(
        `SELECT id, title FROM publication WHERE company_id = ${companyId} AND title IN (${titlesList});`,
      )
    )[0];

    if (publicationRows.length === 0) {
      console.log(
        'Aucune publication de démonstration trouvée (lancez le seeder demo-company-publication avant celui-ci). Fin du seed.',
      );
      return;
    }
    const publicationIdByTitle = new Map(publicationRows.map((p) => [p.title, p.id]));

    const workerEmails = [...new Set(APPLICATIONS_DATA.map((a) => a.workerEmail))];
    const emailsList = workerEmails.map((e) => `'${e.replace(/'/g, "''")}'`).join(', ');
    const workerRows = (
      await queryInterface.sequelize.query(
        `SELECT wp.id, u.email
         FROM worker_profile wp
         JOIN "user" u ON u.id = wp.user_id
         WHERE u.email IN (${emailsList});`,
      )
    )[0];

    if (workerRows.length === 0) {
      console.log(
        'Aucun profil worker trouvé (lancez le seeder fake-users avant celui-ci). Fin du seed.',
      );
      return;
    }
    const workerIdByEmail = new Map(workerRows.map((w) => [w.email, w.id]));

    const now = new Date();
    const applicationsToInsert = APPLICATIONS_DATA.filter(
      (a) => publicationIdByTitle.has(a.publicationTitle) && workerIdByEmail.has(a.workerEmail),
    ).map((a) => ({
      publication_id: publicationIdByTitle.get(a.publicationTitle),
      worker_id: workerIdByEmail.get(a.workerEmail),
      status: a.status,
      created_at: now,
    }));

    if (applicationsToInsert.length === 0) {
      console.log('Aucune candidature à créer (publications ou workers manquants). Fin du seed.');
      return;
    }

    await queryInterface.bulkInsert('application', applicationsToInsert, {});

    console.log(
      `${applicationsToInsert.length} candidatures de démonstration créées pour l'entreprise #${companyId}.`,
    );
  },

  async down(queryInterface, Sequelize) {
    const companyId = await getTargetCompanyId(queryInterface);
    if (!companyId) {
      return;
    }

    const publicationTitles = [...new Set(APPLICATIONS_DATA.map((a) => a.publicationTitle))];
    const titlesList = publicationTitles.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');

    const publicationRows = (
      await queryInterface.sequelize.query(
        `SELECT id FROM publication WHERE company_id = ${companyId} AND title IN (${titlesList});`,
      )
    )[0];
    const publicationIds = publicationRows.map((p) => p.id);

    if (publicationIds.length > 0) {
      await queryInterface.bulkDelete(
        'application',
        { publication_id: publicationIds },
        {},
      );
    }

    console.log('Candidatures de démonstration supprimées.');
  },
};
