'use strict';

const SKILLS_BY_CATEGORY = {
  'Restaurant FOH': [
    'Service en salle',
    'Dressage de table',
    'Prise de commande numérique',
    'Gestion du rang',
    'Encaissement salle',
  ],
  'Restaurant BOH': [
    'Cuisine',
    'Dressage des assiettes',
    'Gestion des stocks cuisine',
    'Respect des normes HACCP',
    'Découpe et préparation',
  ],
  Café: [
    'Préparation espresso',
    'Latte art',
    'Service au comptoir',
    'Nettoyage machine à café',
    'Encaissement café',
  ],
  Serveur: [
    "Service à l'assiette",
    'Relation client',
    'Vente additionnelle',
    'Port de plateau',
    'Gestion des réclamations',
  ],
  Cuisinier: [
    'Cuisine française',
    'Cuisine du monde',
    'Pâtisserie',
    'Gestion des allergènes',
    'Élaboration de menus',
  ],
  Barman: [
    'Bar',
    'Mixologie classique',
    'Flair bartending',
    'Gestion de cave à vin',
    'Préparation de cocktails',
  ],
  Réceptionniste: [
    'Accueil clientèle',
    'Gestion des réservations',
    'Check-in et check-out',
    'Standard téléphonique',
    'Facturation client',
  ],
  Plongeur: [
    'Plonge',
    'Plonge batterie',
    'Nettoyage cuisine',
    'Gestion des déchets',
    "Respect des normes d'hygiène",
  ],
};

const ALL_SKILL_NAMES = Object.values(SKILLS_BY_CATEGORY).flat();

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const categoryRows = (
      await queryInterface.sequelize.query(`SELECT id, name FROM skill_category;`)
    )[0];
    const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));

    const existingSkillByName = new Map(
      (await queryInterface.sequelize.query(`SELECT id, name, category_id FROM skill;`))[0].map(
        (s) => [s.name, s],
      ),
    );

    const maxSkillIdQuery = await queryInterface.sequelize.query(
      `SELECT MAX(id) as max_id FROM skill;`,
    );
    let nextSkillId = Number(maxSkillIdQuery[0][0]?.max_id || 0) + 1;

    const skillsToInsert = [];
    const skillsToRelink = [];

    for (const [categoryName, skillNames] of Object.entries(SKILLS_BY_CATEGORY)) {
      const categoryId = categoryIdByName.get(categoryName);
      if (!categoryId) {
        console.log(
          `Catégorie "${categoryName}" introuvable en base, compétences associées ignorées.`,
        );
        continue;
      }

      for (const name of skillNames) {
        const existing = existingSkillByName.get(name);
        if (existing) {
          if (existing.category_id == null) {
            skillsToRelink.push({ id: existing.id, categoryId });
          }
          continue;
        }

        skillsToInsert.push({ id: nextSkillId++, name, category_id: categoryId });
      }
    }

    if (skillsToInsert.length > 0) {
      await queryInterface.bulkInsert('skill', skillsToInsert, {});
    }

    for (const { id, categoryId } of skillsToRelink) {
      await queryInterface.bulkUpdate('skill', { category_id: categoryId }, { id });
    }

    console.log(
      `${skillsToInsert.length} compétences créées et ${skillsToRelink.length} compétences existantes rattachées à une catégorie.`,
    );
  },

  async down(queryInterface, Sequelize) {
    const namesList = ALL_SKILL_NAMES.map((name) => `'${name.replace(/'/g, "''")}'`).join(', ');

    const referencedQuery = await queryInterface.sequelize.query(
      `SELECT DISTINCT s.name
       FROM skill s
       JOIN publication_skill ps ON ps.skill_id = s.id
       WHERE s.name IN (${namesList});`,
    );
    const referencedNames = new Set(referencedQuery[0].map((r) => r.name));
    const removableNames = ALL_SKILL_NAMES.filter((name) => !referencedNames.has(name));

    if (removableNames.length > 0) {
      await queryInterface.bulkDelete('skill', { name: removableNames }, {});
    }

    console.log(
      `${removableNames.length} compétences de démonstration supprimées (celles utilisées par une publication ont été conservées).`,
    );
  },
};
