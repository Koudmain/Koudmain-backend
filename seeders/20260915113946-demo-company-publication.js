'use strict';
const { faker } = require('@faker-js/faker');

const DEMO_EMPLOYER_EMAIL = 'employer1@koudmain.fr';

const PUBLICATIONS_DATA = [
  {
    title: 'Serveur H/F',
    description:
      "Cherchons une personne expérimentée pour un service lors d'une soirée de forte affluence. Maîtrise de la prise de commande numérique requise. Une personne gérant la pression et la période de rush recommandée.",
    hourly_rate: 13.5,
    status: 'Ouverte',
    startOffsetDays: 3,
    startHour: 18,
    durationHours: 5,
  },
  {
    title: 'Commis de cuisine',
    description:
      "Cherchons une personne expérimentée pour un service lors d'un midi de forte affluence. Maîtrise de la cuisine française requise. Votre tâche sera d'aider le chef, et de suivre les missions qu'il pourra vous donner.",
    hourly_rate: 14,
    status: 'Ouverte',
    startOffsetDays: 4,
    startHour: 10,
    durationHours: 6,
  },
  {
    title: 'Barman H/F',
    description:
      'Recherchons un barman ou une barwoman pour renforcer notre équipe lors du service du soir. Bonne connaissance de la mixologie classique appréciée.',
    hourly_rate: 15,
    status: 'Urgente',
    startOffsetDays: 1,
    startHour: 19,
    durationHours: 4,
  },
  {
    title: 'Réceptionniste de nuit',
    description:
      "Poste de réceptionniste de nuit pour assurer l'accueil des clients et la gestion des arrivées tardives. Une première expérience en hôtellerie est un plus.",
    hourly_rate: 12.8,
    status: 'Ouverte',
    startOffsetDays: 6,
    startHour: 22,
    durationHours: 8,
  },
  {
    title: 'Plongeur en cuisine',
    description:
      "Recherchons un plongeur pour assurer l'entretien de la vaisselle et du matériel de cuisine pendant le service du midi.",
    hourly_rate: 11.9,
    status: 'Fermée',
    startOffsetDays: -2,
    startHour: 11,
    durationHours: 4,
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
  async up(queryInterface, Sequelize) {
    const target = await getTargetCompany(queryInterface);

    if (!target) {
      console.log(
        'Aucune entreprise trouvée en base (lancez le seeder fake-users avant celui-ci). Fin du seed.',
      );
      return;
    }

    const skillRows = (await queryInterface.sequelize.query(`SELECT id, name FROM skill;`))[0];
    if (skillRows.length === 0) {
      console.log(
        'Aucune compétence trouvée en base (lancez le seeder demo-skills avant celui-ci). Les publications seront créées sans compétence associée.',
      );
    }

    const maxPublicationIdQuery = await queryInterface.sequelize.query(
      `SELECT MAX(id) as max_id FROM publication;`,
    );
    let nextPublicationId = Number(maxPublicationIdQuery[0][0]?.max_id || 0) + 1;

    const now = new Date();
    const publicationsToInsert = PUBLICATIONS_DATA.map((pub) => {
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
        views: faker.number.int({ min: 0, max: 500 }),
        clicks: faker.number.int({ min: 0, max: 80 }),
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
      `${publicationsToInsert.length} publications de démonstration créées pour l'entreprise #${target.company_id}.`,
    );
  },

  async down(queryInterface, Sequelize) {
    const target = await getTargetCompany(queryInterface);
    if (!target) {
      return;
    }

    const titles = PUBLICATIONS_DATA.map((pub) => `'${pub.title.replace(/'/g, "''")}'`).join(', ');

    const pubIdsQuery = await queryInterface.sequelize.query(
      `SELECT id FROM publication WHERE company_id = ${target.company_id} AND title IN (${titles});`,
    );
    const pubIds = pubIdsQuery[0].map((p) => p.id);

    if (pubIds.length > 0) {
      await queryInterface.bulkDelete('publication_skill', { publication_id: pubIds }, {});
      await queryInterface.bulkDelete('publication', { id: pubIds }, {});
    }

    console.log('Publications de démonstration supprimées.');
  },
};
