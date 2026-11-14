'use strict';
const { faker } = require('@faker-js/faker');

const DEMO_EMPLOYER_EMAIL = 'employer1@koudmain.fr';

// Publications with far-future dates (2 to 12 months ahead) and no pre-existing applications,
// ensuring workers can always apply to them during development and E2E testing.
const FUTURE_PUBLICATIONS_DATA = [
  {
    title: 'Serveur banquet événementiel H/F',
    description:
      "Recherchons un serveur ou une serveuse expérimenté(e) pour un grand dîner de gala. Service à l'assiette, dressage soigné et accueil des convives.",
    hourly_rate: 15.5,
    status: 'Ouverte',
    startOffsetDays: 60,
    startHour: 18,
    durationHours: 6,
  },
  {
    title: 'Chef de rang brasserie H/F',
    description:
      "Renfort d'équipe pour un week-end de forte affluence. Prise de commande, conseil sur la carte des vins et gestion d'un carré de 30 couverts.",
    hourly_rate: 14.8,
    status: 'Ouverte',
    startOffsetDays: 90,
    startHour: 11,
    durationHours: 5,
  },
  {
    title: 'Barman mixologue soirée privée H/F',
    description:
      "Animation du bar à cocktails lors d'une soirée d'entreprise. Maîtrise des classiques et créations sans alcool appréciées.",
    hourly_rate: 16.5,
    status: 'Urgente',
    startOffsetDays: 120,
    startHour: 19,
    durationHours: 5,
  },
  {
    title: 'Second de cuisine extra H/F',
    description:
      'Mission en cuisine pour épauler le chef sur les envois chauds et la mise en place. Respect strict des normes HACCP requis.',
    hourly_rate: 16.0,
    status: 'Ouverte',
    startOffsetDays: 180,
    startHour: 9,
    durationHours: 7,
  },
  {
    title: 'Barista spécialisé coffee shop H/F',
    description:
      'Service continu du matin au début d’après-midi : extraction espresso, latte art et conseil clientèle au comptoir.',
    hourly_rate: 13.9,
    status: 'Ouverte',
    startOffsetDays: 240,
    startHour: 8,
    durationHours: 6,
  },
  {
    title: 'Réceptionniste polyvalent H/F',
    description:
      'Accueil des clients, check-in / check-out et gestion du standard lors d’un salon professionnel à Lyon. Anglais courant souhaité.',
    hourly_rate: 14.2,
    status: 'Ouverte',
    startOffsetDays: 365,
    startHour: 14,
    durationHours: 8,
  },
];

async function getTargetCompany(queryInterface) {
  const employerQuery = await queryInterface.sequelize.query(
    `SELECT cm.user_id, cm.company_id, c.address_id
     FROM company_member cm
     JOIN "user" u ON u.id = cm.user_id
     JOIN company c ON c.id = cm.company_id
     WHERE u.email = '${DEMO_EMPLOYER_EMAIL}'
     LIMIT 1;`,
  );

  let target = employerQuery[0][0];

  if (!target) {
    const fallbackQuery = await queryInterface.sequelize.query(
      `SELECT cm.user_id, cm.company_id, c.address_id
       FROM company_member cm
       JOIN company c ON c.id = cm.company_id
       ORDER BY cm.company_id ASC
       LIMIT 1;`,
    );
    target = fallbackQuery[0][0];
  }

  return target || null;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const target = await getTargetCompany(queryInterface);

    if (!target) {
      console.log(
        'Aucune entreprise trouvée en base (lancez le seeder fake-users avant celui-ci). Fin du seed.',
      );
      return;
    }

    const existingPublicationsQuery = await queryInterface.sequelize.query(
      `SELECT title FROM publication WHERE company_id = ${target.company_id};`,
    );
    const existingTitles = new Set(existingPublicationsQuery[0].map((p) => p.title));
    const missingPublications = FUTURE_PUBLICATIONS_DATA.filter(
      (pub) => !existingTitles.has(pub.title),
    );

    if (missingPublications.length === 0) {
      console.log(
        `Les publications futures existent déjà pour l'entreprise #${target.company_id}, seed ignoré.`,
      );
      return;
    }

    const skillRows = (await queryInterface.sequelize.query(`SELECT id, name FROM skill;`))[0];

    const maxPublicationIdQuery = await queryInterface.sequelize.query(
      `SELECT MAX(id) as max_id FROM publication;`,
    );
    let nextPublicationId = Number(maxPublicationIdQuery[0][0]?.max_id || 0) + 1;

    const now = new Date();
    const publicationsToInsert = missingPublications.map((pub) => {
      const starting_date = new Date(now);
      starting_date.setDate(starting_date.getDate() + pub.startOffsetDays);
      starting_date.setHours(pub.startHour, 0, 0, 0);
      const ending_date = new Date(starting_date.getTime() + pub.durationHours * 60 * 60 * 1000);

      return {
        id: nextPublicationId++,
        company_id: target.company_id,
        created_by_user_id: target.user_id,
        address_id: target.address_id,
        title: pub.title,
        description: pub.description,
        hourly_rate: pub.hourly_rate,
        starting_date,
        ending_date,
        status: pub.status,
        views: faker.number.int({ min: 0, max: 120 }),
        clicks: faker.number.int({ min: 0, max: 30 }),
        created_at: now,
        updated_at: now,
      };
    });

    await queryInterface.bulkInsert('publication', publicationsToInsert, {});

    const publicationSkills = [];
    if (skillRows.length > 0) {
      publicationsToInsert.forEach((pub) => {
        const numSkills = faker.number.int({ min: 1, max: Math.min(3, skillRows.length) });
        const pickedSkills = faker.helpers.arrayElements(skillRows, numSkills);
        pickedSkills.forEach((skill) => {
          publicationSkills.push({ publication_id: pub.id, skill_id: skill.id });
        });
      });
    }

    if (publicationSkills.length > 0) {
      await queryInterface.bulkInsert('publication_skill', publicationSkills, {});
    }

    console.log(
      `${publicationsToInsert.length} nouvelles publications à dates lointaines créées pour l'entreprise #${target.company_id}.`,
    );
  },

  async down(queryInterface) {
    const target = await getTargetCompany(queryInterface);
    if (!target) {
      return;
    }

    const titles = FUTURE_PUBLICATIONS_DATA.map((pub) => `'${pub.title.replace(/'/g, "''")}'`).join(
      ', ',
    );

    const pubIdsQuery = await queryInterface.sequelize.query(
      `SELECT id FROM publication WHERE company_id = ${target.company_id} AND title IN (${titles});`,
    );
    const pubIds = pubIdsQuery[0].map((p) => p.id);

    if (pubIds.length > 0) {
      await queryInterface.bulkDelete('application', { publication_id: pubIds }, {});
      await queryInterface.bulkDelete('publication_skill', { publication_id: pubIds }, {});
      await queryInterface.bulkDelete('publication', { id: pubIds }, {});
    }

    console.log('Publications à dates lointaines supprimées.');
  },
};
