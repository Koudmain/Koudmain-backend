'use strict';

const DEMO_EMPLOYER_EMAIL = 'employer1@koudmain.fr';
const DEMO_DOCUMENT_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

const COMPANY_REVIEWS = [
  {
    rating: 5,
    comment: "Équipe accueillante, mission conforme à l'annonce. Je recommande !",
    paymentOnTime: true,
    missionMatchesListing: true,
  },
  {
    rating: 4,
    comment: 'Bonne ambiance de travail, petite confusion sur les horaires mais réglée rapidement.',
    paymentOnTime: false,
    missionMatchesListing: true,
  },
  { rating: 5, comment: null, paymentOnTime: true, missionMatchesListing: true },
  {
    rating: 3,
    comment: 'Service très intense, il manquait une personne en salle ce soir-là.',
    paymentOnTime: true,
    missionMatchesListing: false,
  },
];

const WORKER_PROFILES = {
  'worker1@koudmain.fr': {
    bio: "Passionné de restauration depuis toujours, je suis polyvalent en salle comme en cuisine et j'aime particulièrement les services de forte affluence.",
    responseRate: 96,
    avgResponseTimeMin: 8,
    missionsCompleted: 67,
    experiences: [
      ['Serveur en brasserie', 36],
      ['Commis de cuisine', 14],
    ],
    formations: [
      ['Formation HACCP', 'Centre de formation Lyon', 'FORMATION', '2023-03-15'],
      [
        'CAP Commercialisation et services en HCR',
        'Lycée hôtelier de Lyon',
        'DIPLOMA',
        '2019-07-01',
      ],
      ['Permis B', null, 'PERMIT', '2022-06-01'],
    ],
    verified: ['IDENTITY', 'SOCIAL_SECURITY'],
    review: {
      rating: 5,
      comment:
        "Nous avons fait appel à cet extra pour une soirée de forte affluence, en salle et en plonge. Il s'est montré ponctuel, efficace et très réactif face au rythme soutenu.",
    },
  },
  'worker2@koudmain.fr': {
    bio: 'Barista de formation, je travaille en extra le week-end. Latte art, service au comptoir et encaissement.',
    responseRate: 88,
    avgResponseTimeMin: 25,
    missionsCompleted: 14,
    experiences: [['Barista en coffee shop', 20]],
    formations: [['Formation barista SCA', 'Coffee School Lyon', 'FORMATION', '2024-02-10']],
    verified: ['IDENTITY', 'SOCIAL_SECURITY', 'ADDRESS_PROOF'],
  },
  'worker3@koudmain.fr': {
    bio: "Commis de cuisine rigoureux, à l'aise sur la mise en place et le poste froid. Disponible en semaine et en soirée.",
    responseRate: 100,
    avgResponseTimeMin: 5,
    missionsCompleted: 42,
    experiences: [
      ['Commis de cuisine en restaurant traditionnel', 30],
      ['Plongeur', 8],
    ],
    formations: [
      ['CAP Cuisine', 'CFA de Villefontaine', 'DIPLOMA', '2021-06-30'],
      ['Formation HACCP', 'Centre de formation Lyon', 'FORMATION', '2021-09-01'],
    ],
    verified: ['IDENTITY', 'SOCIAL_SECURITY', 'ADDRESS_PROOF'],
    review: {
      rating: 4,
      comment: 'Bon commis, efficace sur la mise en place. Un peu de retard à la prise de poste.',
    },
  },
  'worker4@koudmain.fr': {
    bio: 'Barman cocktails, 5 ans en bar de nuit. Je connais les classiques et sais gérer une file au comptoir.',
    responseRate: 79,
    avgResponseTimeMin: 95,
    missionsCompleted: 23,
    experiences: [['Barman en bar à cocktails', 60]],
    formations: [['Mention complémentaire Barman', 'Lycée Jean Moulin', 'DIPLOMA', '2018-06-30']],
    verified: ['IDENTITY'],
  },
  'worker5@koudmain.fr': {
    bio: "Réceptionniste bilingue anglais, habitué(e) aux gardes de nuit en hôtel. Calme et à l'écoute des clients.",
    responseRate: 92,
    avgResponseTimeMin: 40,
    missionsCompleted: 31,
    experiences: [['Réceptionniste de nuit en hôtel 3*', 24]],
    formations: [['BTS Tourisme', 'Lycée Lumière', 'DIPLOMA', '2020-07-01']],
    verified: ['IDENTITY', 'SOCIAL_SECURITY'],
  },
  'worker6@koudmain.fr': {
    bio: "Hôte d'accueil événementiel, salons et soirées d'entreprise. Présentation soignée et sens du contact.",
    responseRate: 97,
    avgResponseTimeMin: 12,
    missionsCompleted: 55,
    experiences: [["Hôte d'accueil en événementiel", 40]],
    formations: [['Permis B', null, 'PERMIT', '2019-03-12']],
    verified: ['IDENTITY', 'SOCIAL_SECURITY', 'ADDRESS_PROOF'],
    review: {
      rating: 5,
      comment: 'Accueil impeccable de nos invités, très professionnel. À rappeler sans hésiter.',
    },
  },
  'worker7@koudmain.fr': {
    bio: 'Livreur à vélo en complément de mes études, je connais bien la presqu’île et le 7e.',
    responseRate: 70,
    avgResponseTimeMin: 180,
    missionsCompleted: 6,
    experiences: [['Livreur à vélo', 10]],
    formations: [],
    verified: ['IDENTITY'],
  },
  'worker8@koudmain.fr': {
    bio: 'Apprentie pâtissière en reconversion, je cherche des missions pour gagner en expérience en laboratoire.',
    responseRate: 85,
    avgResponseTimeMin: 30,
    missionsCompleted: 3,
    experiences: [['Aide pâtissière', 6]],
    formations: [['CAP Pâtissier (en cours)', 'CFA Bocuse', 'DIPLOMA', null]],
    verified: [],
  },
  'worker9@koudmain.fr': {
    bio: null,
    responseRate: null,
    avgResponseTimeMin: null,
    missionsCompleted: 0,
    experiences: [],
    formations: [],
    verified: [],
  },
  'worker10@koudmain.fr': {
    bio: "Agent d'entretien expérimenté en hôtellerie et restauration, je travaille vite et proprement.",
    responseRate: 94,
    avgResponseTimeMin: 20,
    missionsCompleted: 38,
    experiences: [["Agent d'entretien en hôtel", 48]],
    formations: [
      ['Habilitation produits d’entretien professionnels', 'AFPA', 'FORMATION', '2022-01-20'],
    ],
    verified: ['IDENTITY', 'SOCIAL_SECURITY'],
    review: { rating: 4, comment: null },
  },
};

async function getDemoWorkers(queryInterface) {
  const emails = Object.keys(WORKER_PROFILES)
    .map((email) => `'${email}'`)
    .join(', ');
  const [workers] = await queryInterface.sequelize.query(
    `SELECT wp.id, wp.user_id, u.email
     FROM worker_profile wp
     JOIN "user" u ON u.id = wp.user_id
     WHERE u.email IN (${emails});`,
  );

  return workers;
}

async function getDemoIds(queryInterface) {
  const [[company]] = await queryInterface.sequelize.query(
    `SELECT cm.company_id, u.id AS user_id
     FROM company_member cm
     JOIN "user" u ON u.id = cm.user_id
     WHERE u.email = '${DEMO_EMPLOYER_EMAIL}'
     LIMIT 1;`,
  );
  return {
    companyId: company?.company_id ?? null,
    employerUserId: company?.user_id ?? null,
  };
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { companyId, employerUserId } = await getDemoIds(queryInterface);
    const workers = await getDemoWorkers(queryInterface);

    if (!companyId || workers.length === 0) {
      console.log(
        'Employeur ou travailleur de démonstration introuvable (lancez le seeder fake-users avant celui-ci). Fin du seed.',
      );
      return;
    }

    const now = new Date();

    await queryInterface.bulkUpdate(
      'company',
      {
        description:
          "Brasserie de quartier ouverte depuis 2011. Une brigade de 8 personnes, un service qui s'emballe le jeudi soir et le week-end. On accueille les extras comme des collègues.",
        specialties: 'Brasserie, cuisine française',
        capacity: 60,
        team_size: '8 personnes en brigade',
        meal_provided: true,
        dress_code: 'Tablier prêté, chemise blanche à prévoir',
        siret_verified: true,
        koudmain_validated: true,
      },
      { id: companyId },
    );

    for (const worker of workers) {
      const profile = WORKER_PROFILES[worker.email];
      await queryInterface.bulkUpdate(
        'worker_profile',
        {
          bio: profile.bio,
          response_rate: profile.responseRate,
          avg_response_time_min: profile.avgResponseTimeMin,
          missions_completed: profile.missionsCompleted,
          review_count: profile.review ? 1 : 0,
        },
        { id: worker.id },
      );
    }

    const experiences = workers.flatMap((worker) =>
      WORKER_PROFILES[worker.email].experiences.map(([title, durationMonths]) => ({
        worker_id: worker.id,
        title,
        duration_months: durationMonths,
      })),
    );
    if (experiences.length > 0) await queryInterface.bulkInsert('worker_experience', experiences);

    const formations = workers.flatMap((worker) =>
      WORKER_PROFILES[worker.email].formations.map(([title, institution, type, obtainedDate]) => ({
        worker_id: worker.id,
        title,
        institution,
        type,
        obtained_date: obtainedDate,
      })),
    );
    if (formations.length > 0) await queryInterface.bulkInsert('worker_formation', formations);

    await queryInterface.bulkInsert(
      'worker_verification',
      workers.flatMap((worker) =>
        ['IDENTITY', 'SOCIAL_SECURITY', 'ADDRESS_PROOF'].map((type) => {
          const isVerified = WORKER_PROFILES[worker.email].verified.includes(type);
          return {
            worker_id: worker.id,
            type,
            status: isVerified ? 'VERIFIED' : 'PENDING',
            verified_at: isVerified ? now : null,
          };
        }),
      ),
    );

    await queryInterface.sequelize.query(
      `UPDATE application a
       SET responded_at = a.created_at + (10 + (a.id % 12) * 10) * INTERVAL '1 minute'
       FROM publication p
       WHERE p.id = a.publication_id
         AND p.company_id = ${companyId}
         AND a.status IN ('Accepted', 'Rejected');`,
    );

    const [acceptedApplications] = await queryInterface.sequelize.query(
      `SELECT a.id, a.publication_id, a.worker_id, wp.user_id, p.ending_date, p.hourly_rate
       FROM application a
       JOIN publication p ON p.id = a.publication_id
       JOIN worker_profile wp ON wp.id = a.worker_id
       WHERE p.company_id = ${companyId} AND a.status = 'Accepted'
       ORDER BY a.id ASC;`,
    );

    if (acceptedApplications.length === 0) {
      console.log(
        'Aucune candidature acceptée (lancez le seeder demo-publication-applications avant celui-ci). Fin du seed.',
      );
      return;
    }

    // Une mission terminée par candidature acceptée ; la deuxième est payée en retard
    const missions = await queryInterface.bulkInsert(
      'mission',
      acceptedApplications.map((application, index) => {
        const paymentDueDate = new Date(application.ending_date);
        paymentDueDate.setDate(paymentDueDate.getDate() + 2);
        const paidAt = new Date(paymentDueDate);
        paidAt.setDate(paidAt.getDate() + (index === 1 ? 10 : -1));

        return {
          publication_id: application.publication_id,
          worker_id: application.worker_id,
          company_id: companyId,
          final_price: Number(application.hourly_rate) * 5,
          payment_status: 'Paid',
          status: 'Completed',
          payment_due_date: paymentDueDate,
          paid_at: paidAt,
        };
      }),
      { returning: ['id', 'worker_id'] },
    );

    await queryInterface.bulkInsert(
      'review',
      missions.map((mission, index) => {
        const application = acceptedApplications.find((a) => a.worker_id === mission.worker_id);
        const review = COMPANY_REVIEWS[index % COMPANY_REVIEWS.length];

        return {
          mission_id: mission.id,
          reviewer_id: application.user_id,
          rated_company_id: companyId,
          rating: review.rating,
          comment: review.comment,
          type: 'Worker_to_Company',
          payment_on_time: review.paymentOnTime,
          mission_matches_listing: review.missionMatchesListing,
          created_at: now,
        };
      }),
    );

    const [ratingRow] = (
      await queryInterface.sequelize.query(
        `SELECT ROUND(AVG(rating), 1) AS average, COUNT(*) AS count
         FROM review WHERE rated_company_id = ${companyId};`,
      )
    )[0];
    await queryInterface.bulkUpdate(
      'company',
      { average_rating: ratingRow.average, review_count: ratingRow.count },
      { id: companyId },
    );

    const workerReviews = missions
      .map((mission) => {
        const worker = workers.find((w) => w.id === mission.worker_id);
        const review = worker && WORKER_PROFILES[worker.email].review;
        return (
          review && {
            mission_id: mission.id,
            reviewer_id: employerUserId,
            reviewer_company_id: companyId,
            rated_id: worker.user_id,
            rating: review.rating,
            comment: review.comment,
            type: 'Company_to_Worker',
            created_at: now,
          }
        );
      })
      .filter(Boolean);
    if (workerReviews.length > 0) await queryInterface.bulkInsert('review', workerReviews);

    const lateMission = missions[1];
    if (lateMission) {
      const application = acceptedApplications.find((a) => a.worker_id === lateMission.worker_id);
      await queryInterface.bulkInsert('payment_report', [
        {
          mission_id: lateMission.id,
          reporter_id: application.user_id,
          company_id: companyId,
          report_type: 'LATE_PAYMENT',
          description: 'Le paiement a été effectué avec 10 jours de retard.',
          status: 'OPEN',
          created_at: now,
        },
      ]);
    }

    const conversations = await queryInterface.bulkInsert(
      'conversation',
      acceptedApplications.map((application) => ({
        publication_id: application.publication_id,
        worker_id: application.worker_id,
        company_id: companyId,
        updated_at: now,
        status: 'active',
      })),
      { returning: ['id', 'worker_id'] },
    );
    await queryInterface.bulkInsert(
      'conversation_settings',
      conversations.flatMap((conversation) => {
        const application = acceptedApplications.find(
          (a) => a.worker_id === conversation.worker_id,
        );
        return [
          { user_id: employerUserId, conversation_id: conversation.id },
          { user_id: application.user_id, conversation_id: conversation.id },
        ];
      }),
    );
    await queryInterface.bulkInsert(
      'message',
      conversations.map((conversation) => {
        const application = acceptedApplications.find(
          (a) => a.worker_id === conversation.worker_id,
        );
        return {
          conversation_id: conversation.id,
          sender_id: application.user_id,
          content_text: 'Bonjour, merci pour votre retour sur ma candidature !',
          message_type: 'TEXT',
          created_at: now,
        };
      }),
    );

    // CV et lettre de motivation sur chaque candidature reçue par l'établissement
    const [applications] = await queryInterface.sequelize.query(
      `SELECT a.id FROM application a
       JOIN publication p ON p.id = a.publication_id
       WHERE p.company_id = ${companyId};`,
    );
    for (const application of applications) {
      const [cvDocument, coverLetterDocument] = await queryInterface.bulkInsert(
        'document',
        [
          {
            file_path: DEMO_DOCUMENT_URL,
            mime_type: 'application/pdf',
            size_bytes: 273408,
            created_at: now,
          },
          {
            file_path: DEMO_DOCUMENT_URL,
            mime_type: 'application/pdf',
            size_bytes: 681984,
            created_at: now,
          },
        ],
        { returning: ['id'] },
      );
      await queryInterface.bulkUpdate(
        'application',
        { cv_document_id: cvDocument.id, cover_letter_document_id: coverLetterDocument.id },
        { id: application.id },
      );
    }

    console.log(
      `${missions.length} missions terminées et leurs avis créés pour l'entreprise #${companyId}.`,
    );
  },

  async down(queryInterface) {
    const { companyId } = await getDemoIds(queryInterface);
    const workerIds = (await getDemoWorkers(queryInterface)).map((worker) => worker.id);

    if (workerIds.length > 0) {
      const [applications] = await queryInterface.sequelize.query(
        `SELECT cv_document_id, cover_letter_document_id FROM application WHERE worker_id IN (${workerIds.join(', ')});`,
      );
      const documentIds = applications
        .flatMap((a) => [a.cv_document_id, a.cover_letter_document_id])
        .filter(Boolean);

      await queryInterface.bulkUpdate(
        'application',
        { cv_document_id: null, cover_letter_document_id: null },
        { worker_id: workerIds },
      );
      if (documentIds.length > 0) {
        await queryInterface.bulkDelete('document', { id: documentIds });
      }
      await queryInterface.bulkDelete('worker_verification', { worker_id: workerIds });
      await queryInterface.bulkDelete('worker_formation', { worker_id: workerIds });
      await queryInterface.bulkDelete('worker_experience', { worker_id: workerIds });
      await queryInterface.bulkUpdate(
        'worker_profile',
        {
          bio: null,
          review_count: 0,
          response_rate: null,
          avg_response_time_min: null,
          missions_completed: 0,
        },
        { id: workerIds },
      );
    }

    if (companyId) {
      const [missions] = await queryInterface.sequelize.query(
        `SELECT id FROM mission WHERE company_id = ${companyId};`,
      );
      const missionIds = missions.map((m) => m.id);

      const [conversations] = await queryInterface.sequelize.query(
        `SELECT id FROM conversation WHERE company_id = ${companyId};`,
      );
      const conversationIds = conversations.map((c) => c.id);
      if (conversationIds.length > 0) {
        await queryInterface.bulkDelete('message', { conversation_id: conversationIds });
        await queryInterface.bulkDelete('conversation_settings', {
          conversation_id: conversationIds,
        });
        await queryInterface.bulkDelete('conversation', { id: conversationIds });
      }
      await queryInterface.bulkDelete('payment_report', { company_id: companyId });
      if (missionIds.length > 0) {
        await queryInterface.bulkDelete('review', { mission_id: missionIds });
        await queryInterface.bulkDelete('mission', { id: missionIds });
      }
      await queryInterface.sequelize.query(
        `UPDATE application a SET responded_at = NULL
         FROM publication p
         WHERE p.id = a.publication_id AND p.company_id = ${companyId};`,
      );
      await queryInterface.bulkUpdate(
        'company',
        {
          description: null,
          specialties: null,
          capacity: null,
          team_size: null,
          meal_provided: false,
          dress_code: null,
          siret_verified: false,
          koudmain_validated: false,
          average_rating: 0,
          review_count: 0,
        },
        { id: companyId },
      );
    }
  },
};
