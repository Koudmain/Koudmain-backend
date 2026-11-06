'use strict';

const DEMO_EMPLOYER_EMAIL = 'employer1@koudmain.fr';

const CONVERSATIONS_DATA = [
  {
    publicationTitle: 'Serveur H/F',
    workerEmail: 'worker1@koudmain.fr',
    status: 'active',
    isPinnedForEmployer: true,
    isPinnedForWorker: false,
    messages: [
      {
        from: 'worker',
        content:
          "Bonjour, merci d'avoir accepté ma candidature pour la mission de Serveur ce samedi ! Y a-t-il un dress code particulier à respecter ?",
        offsetMinutes: -240,
        messageType: 'TEXT',
      },
      {
        from: 'employer',
        content:
          "Bonjour ! Oui, chemise blanche classique, pantalon noir et chaussures de ville confortables s'il vous plaît.",
        offsetMinutes: -210,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content: "C'est bien noté. À quelle heure me conseillez-vous d'arriver pour le briefing ?",
        offsetMinutes: -180,
        messageType: 'TEXT',
      },
      {
        from: 'employer',
        content:
          "Idéalement 20 minutes avant le début du service pour faire le tour de la salle et vous présenter à l'équipe. À samedi !",
        offsetMinutes: -150,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content: 'Parfait, je serai là à 17h40. Bonne fin de journée !',
        offsetMinutes: -120,
        messageType: 'TEXT',
      },
    ],
  },
  {
    publicationTitle: 'Commis de cuisine',
    workerEmail: 'worker3@koudmain.fr',
    status: 'active',
    isPinnedForEmployer: false,
    isPinnedForWorker: true,
    messages: [
      {
        from: 'employer',
        content:
          'Bonjour, nous avons bien validé votre profil pour le service en cuisine. Avez-vous votre propre matériel de découpe ou préférez-vous utiliser celui de la brigade ?',
        offsetMinutes: -360,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content:
          "Bonjour ! J'ai ma mallette complète ainsi que mes chaussures de sécurité. J'ai également mon certificat HACCP à jour.",
        offsetMinutes: -330,
        messageType: 'TEXT',
      },
      {
        from: 'employer',
        content:
          "Excellent, cela nous fait gagner un temps précieux. Le chef de partie vous accueillera dès 9h45 à l'entrée du personnel.",
        offsetMinutes: -300,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content: 'C’est noté, à demain 9h45 !',
        offsetMinutes: -280,
        messageType: 'TEXT',
      },
    ],
  },
  {
    publicationTitle: 'Barman H/F',
    workerEmail: 'worker4@koudmain.fr',
    status: 'active',
    isPinnedForEmployer: false,
    isPinnedForWorker: false,
    messages: [
      {
        from: 'employer',
        content:
          'Bonjour, votre profil nous intéresse pour le service du soir. Avez-vous déjà travaillé dans un bar à fort débit (+200 cocktails/soirée) ?',
        offsetMinutes: -180,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content:
          "Bonjour ! Oui tout à fait, j'ai 2 ans d'expérience en bar lounge avec des cadences soutenues. Je maîtrise les classiques ainsi que les préparations en batch.",
        offsetMinutes: -140,
        messageType: 'TEXT',
      },
      {
        from: 'employer',
        content:
          "Très bien, c'est exactement ce qu'il nous faut. Nous finalisons les sélections aujourd'hui et nous vous tenons au courant dans l'après-midi.",
        offsetMinutes: -90,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content: 'Merci beaucoup pour ce retour rapide, je reste à votre disposition si besoin !',
        offsetMinutes: -60,
        messageType: 'TEXT',
      },
    ],
  },
  {
    publicationTitle: 'Réceptionniste de nuit',
    workerEmail: 'worker5@koudmain.fr',
    status: 'active',
    isPinnedForEmployer: false,
    isPinnedForWorker: false,
    messages: [
      {
        from: 'worker',
        content:
          'Bonjour, suite à ma candidature pour le poste de nuit, quel logiciel hôtelier (PMS) utilisez-vous pour les arrivées tardives ?',
        offsetMinutes: -500,
        messageType: 'TEXT',
      },
      {
        from: 'employer',
        content:
          "Bonjour, nous utilisons le logiciel Mews. Avez-vous déjà eu l'occasion de l'utiliser ou un outil similaire comme Opera ?",
        offsetMinutes: -430,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content:
          "Oui, j'ai travaillé sous Opera pendant 2 ans et j'ai suivi une formation récente sur Mews, la prise en main sera immédiate.",
        offsetMinutes: -400,
        messageType: 'TEXT',
      },
      {
        from: 'employer',
        content:
          "Parfait, c'est un vrai atout. Nous finalisons le planning avec la direction et revenons vers vous rapidement.",
        offsetMinutes: -360,
        messageType: 'TEXT',
      },
    ],
  },
  {
    publicationTitle: "Hôte/Hôtesse d'accueil événementiel",
    workerEmail: 'worker6@koudmain.fr',
    status: 'active',
    isPinnedForEmployer: false,
    isPinnedForWorker: false,
    messages: [
      {
        from: 'employer',
        content:
          "Bonjour, bienvenue sur la mission d'accueil pour la soirée d'entreprise. Les badges et le listing vous attendront à l'accueil VIP à 16h45.",
        offsetMinutes: -1440,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content:
          'Bonjour, bien reçu ! Y a-t-il un vestiaire sécurisé où nous pourrons déposer nos affaires personnelles ?',
        offsetMinutes: -1380,
        messageType: 'TEXT',
      },
      {
        from: 'employer',
        content:
          "Oui tout à fait, une loge dédiée est mise à disposition pour toute l'équipe d'accueil.",
        offsetMinutes: -1320,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content: "Super, merci pour l'information et à jeudi !",
        offsetMinutes: -1260,
        messageType: 'TEXT',
      },
    ],
  },
  {
    publicationTitle: 'Aide pâtissier H/F',
    workerEmail: 'worker8@koudmain.fr',
    status: 'active',
    isPinnedForEmployer: false,
    isPinnedForWorker: false,
    messages: [
      {
        from: 'employer',
        content:
          "Bonjour, pour la mission de samedi matin à 6h, êtes-vous bien véhiculé pour arriver à l'heure au laboratoire ?",
        offsetMinutes: -180,
        messageType: 'TEXT',
      },
      {
        from: 'worker',
        content:
          "Bonjour, oui absolument, j'ai mon véhicule et je suis à 10 minutes du lieu de travail.",
        offsetMinutes: -140,
        messageType: 'TEXT',
      },
      {
        from: 'employer',
        content: 'Super, merci pour votre réactivité !',
        offsetMinutes: -80,
        messageType: 'TEXT',
      },
    ],
  },
];

async function getTargetCompany(queryInterface) {
  const employerQuery = await queryInterface.sequelize.query(
    `SELECT cm.user_id, cm.company_id
     FROM company_member cm
     JOIN "user" u ON u.id = cm.user_id
     JOIN company c ON c.id = cm.company_id
     WHERE u.email = '${DEMO_EMPLOYER_EMAIL}'
     LIMIT 1;`,
  );

  let target = employerQuery[0][0];

  if (!target) {
    const fallbackQuery = await queryInterface.sequelize.query(
      `SELECT cm.user_id, cm.company_id
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

    const companyId = target.company_id;
    const employerUserId = target.user_id;

    // Récupération de tous les membres de l'entreprise pour initialiser leurs conversation_settings
    const companyMembersQuery = await queryInterface.sequelize.query(
      `SELECT user_id FROM company_member WHERE company_id = ${companyId};`,
    );
    const companyMemberUserIds = [
      ...new Set(companyMembersQuery[0].map((m) => m.user_id).concat(employerUserId)),
    ];

    // Récupération des publications correspondantes
    const publicationTitles = [...new Set(CONVERSATIONS_DATA.map((c) => c.publicationTitle))];
    const titlesList = publicationTitles.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');
    const publicationRows = (
      await queryInterface.sequelize.query(
        `SELECT id, title FROM publication WHERE company_id = ${companyId} AND title IN (${titlesList});`,
      )
    )[0];

    if (publicationRows.length === 0) {
      console.log(
        'Aucune publication trouvée (lancez le seeder demo-company-publication avant celui-ci). Fin du seed.',
      );
      return;
    }
    const publicationIdByTitle = new Map(publicationRows.map((p) => [p.title, p.id]));

    // Récupération des profils worker
    const workerEmails = [...new Set(CONVERSATIONS_DATA.map((c) => c.workerEmail))];
    const emailsList = workerEmails.map((e) => `'${e.replace(/'/g, "''")}'`).join(', ');
    const workerRows = (
      await queryInterface.sequelize.query(
        `SELECT wp.id AS worker_profile_id, wp.user_id, u.email
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
    const workerDataByEmail = new Map(
      workerRows.map((w) => [w.email, { workerProfileId: w.worker_profile_id, userId: w.user_id }]),
    );

    // Détermination des IDs de départ
    const maxConvQuery = await queryInterface.sequelize.query(
      `SELECT MAX(id) as max_id FROM "conversation";`,
    );
    let nextConvId = Number(maxConvQuery[0][0]?.max_id || 0) + 1;

    const maxMsgQuery = await queryInterface.sequelize.query(
      `SELECT MAX(id) as max_id FROM "message";`,
    );
    let nextMsgId = Number(maxMsgQuery[0][0]?.max_id || 0) + 1;

    const now = new Date();
    const conversationsToInsert = [];
    const settingsToInsert = [];
    const messagesToInsert = [];

    for (const convData of CONVERSATIONS_DATA) {
      const pubId = publicationIdByTitle.get(convData.publicationTitle);
      const worker = workerDataByEmail.get(convData.workerEmail);

      if (!pubId || !worker) {
        continue;
      }

      const convId = nextConvId++;

      // Calcul des timestamps des messages
      const sortedMessages = [...convData.messages].sort(
        (a, b) => a.offsetMinutes - b.offsetMinutes,
      );
      const lastOffset = sortedMessages[sortedMessages.length - 1]?.offsetMinutes || 0;
      const lastMessageDate = new Date(now.getTime() + lastOffset * 60 * 1000);

      conversationsToInsert.push({
        id: convId,
        publication_id: pubId,
        worker_id: worker.workerProfileId,
        company_id: companyId,
        status: convData.status || 'active',
        updated_at: lastMessageDate,
      });
      settingsToInsert.push({
        user_id: worker.userId,
        conversation_id: convId,
        is_pinned: Boolean(convData.isPinnedForWorker),
        is_deleted: false,
      });

      for (const memberUserId of companyMemberUserIds) {
        settingsToInsert.push({
          user_id: memberUserId,
          conversation_id: convId,
          is_pinned: Boolean(convData.isPinnedForEmployer),
          is_deleted: false,
        });
      }
      for (const msg of sortedMessages) {
        const msgDate = new Date(now.getTime() + msg.offsetMinutes * 60 * 1000);
        const senderId = msg.from === 'worker' ? worker.userId : employerUserId;

        messagesToInsert.push({
          id: nextMsgId++,
          conversation_id: convId,
          sender_id: senderId,
          content_text: msg.content,
          file_url: msg.fileUrl || null,
          message_type: msg.messageType || 'TEXT',
          created_at: msgDate,
        });
      }
    }

    if (conversationsToInsert.length === 0) {
      console.log('Aucune conversation à créer. Fin du seed.');
      return;
    }

    await queryInterface.bulkInsert('conversation', conversationsToInsert, {});

    await queryInterface.bulkInsert('conversation_settings', settingsToInsert, {});
    await queryInterface.bulkInsert('message', messagesToInsert, {});

    try {
      await queryInterface.sequelize.query(
        `SELECT setval(pg_get_serial_sequence('conversation', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "conversation";`,
      );
      await queryInterface.sequelize.query(
        `SELECT setval(pg_get_serial_sequence('message', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "message";`,
      );
    } catch (err) {
      console.warn('Avertissement lors de la réinitialisation des séquences:', err.message);
    }

    console.log(
      `${conversationsToInsert.length} conversations et ${messagesToInsert.length} messages créés pour l'entreprise #${companyId}.`,
    );
  },

  async down(queryInterface, Sequelize) {
    const target = await getTargetCompany(queryInterface);
    if (!target) {
      return;
    }

    const companyId = target.company_id;
    const publicationTitles = [...new Set(CONVERSATIONS_DATA.map((c) => c.publicationTitle))];
    const titlesList = publicationTitles.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');

    const publicationRows = (
      await queryInterface.sequelize.query(
        `SELECT id FROM publication WHERE company_id = ${companyId} AND title IN (${titlesList});`,
      )
    )[0];
    const publicationIds = publicationRows.map((p) => p.id);

    if (publicationIds.length === 0) {
      return;
    }

    const convRows = (
      await queryInterface.sequelize.query(
        `SELECT id FROM "conversation" WHERE company_id = ${companyId} AND publication_id IN (${publicationIds.join(', ')});`,
      )
    )[0];
    const convIds = convRows.map((c) => c.id);

    if (convIds.length > 0) {
      const convIdsList = convIds.join(', ');
      await queryInterface.sequelize.query(
        `DELETE FROM "message" WHERE conversation_id IN (${convIdsList});`,
      );
      await queryInterface.sequelize.query(
        `DELETE FROM "conversation_settings" WHERE conversation_id IN (${convIdsList});`,
      );
      await queryInterface.sequelize.query(
        `DELETE FROM "conversation" WHERE id IN (${convIdsList});`,
      );
    }

    console.log('Conversations et messages de démonstration supprimés.');
  },
};
