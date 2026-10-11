'use strict';

// 4 required KYC document types according to the user story specification
const REQUIRED_KYC_TYPES = ['IDENTITY', 'NIR', 'PROOF_OF_ADDRESS', 'RIB'];

// Workers with complete and verified KYC (authorized to apply)
const VALID_FULL_KYC_EMAILS = [
  'worker1@koudmain.fr',
  'worker2@koudmain.fr',
  'worker3@koudmain.fr',
  'worker4@koudmain.fr',
  'worker5@koudmain.fr',
  'worker6@koudmain.fr',
];

// Worker with partial KYC: IDENTITY verified, but missing NIR, PROOF_OF_ADDRESS and RIB
const PARTIAL_KYC_EMAIL = 'worker7@koudmain.fr';

// Worker with uploaded documents, but all pending verification (verified: false)
const UNVERIFIED_KYC_EMAIL = 'worker8@koudmain.fr';

// Note: worker9@koudmain.fr and worker10@koudmain.fr have no documents uploaded.
// This configuration allows testing all scenarios:
// 1. Complete verified KYC (worker1-6) -> apply allowed
// 2. Partial KYC with missing documents (worker7) -> 403 with missingDocuments list
// 3. Uploaded documents pending verification (worker8) -> 403 with unverified documents list
// 4. No documents uploaded (worker9-10) -> 403 with all documents missing

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const allEmails = [
      ...VALID_FULL_KYC_EMAILS,
      PARTIAL_KYC_EMAIL,
      UNVERIFIED_KYC_EMAIL,
    ];
    const emailsList = allEmails.map((e) => `'${e.replace(/'/g, "''")}'`).join(', ');

    // 1. Fetch worker profiles for the target emails
    const [workers] = await queryInterface.sequelize.query(`
      SELECT wp.id AS worker_id, u.email
      FROM worker_profile wp
      JOIN "user" u ON u.id = wp.user_id
      WHERE u.email IN (${emailsList});
    `);

    if (!workers || workers.length === 0) {
      console.log('No worker profile found. Please run the fake-users seeder first.');
      return;
    }

    const workerByEmail = new Map(workers.map((w) => [w.email, w.worker_id]));
    const now = new Date();
    const documentsToInsert = [];

    // Helper to register a KYC document
    const addDocument = (workerId, email, type, isVerified) => {
      const slug = email.split('@')[0];
      const typeSlug = type.toLowerCase();
      documentsToInsert.push({
        file_path: `documents/kyc/${typeSlug}_${slug}.pdf`,
        mime_type: 'application/pdf',
        size_bytes: 1024 * 512,
        created_at: now,
        _worker_id: workerId,
        _type: type,
        _verified: isVerified,
      });
    };

    // 2. Configure full verified KYC for worker1 to worker6
    for (const email of VALID_FULL_KYC_EMAILS) {
      const workerId = workerByEmail.get(email);
      if (!workerId) continue;
      for (const type of REQUIRED_KYC_TYPES) {
        addDocument(workerId, email, type, true);
      }
    }

    // 3. Configure partial KYC for worker7 (IDENTITY verified, others missing)
    if (workerByEmail.has(PARTIAL_KYC_EMAIL)) {
      const workerId = workerByEmail.get(PARTIAL_KYC_EMAIL);
      addDocument(workerId, PARTIAL_KYC_EMAIL, 'IDENTITY', true);
    }

    // 4. Configure unverified KYC for worker8 (all documents present, but verified: false)
    if (workerByEmail.has(UNVERIFIED_KYC_EMAIL)) {
      const workerId = workerByEmail.get(UNVERIFIED_KYC_EMAIL);
      for (const type of REQUIRED_KYC_TYPES) {
        addDocument(workerId, UNVERIFIED_KYC_EMAIL, type, false);
      }
    }

    if (documentsToInsert.length === 0) return;

    const pathsList = documentsToInsert.map((d) => `'${d.file_path}'`).join(', ');
    const workerIdsList = workers.map((w) => w.worker_id).join(', ');

    // 5. Clean up existing test documents to ensure idempotency
    await queryInterface.sequelize.query(`
      DELETE FROM worker_document
      WHERE document_id IN (SELECT id FROM document WHERE file_path IN (${pathsList}))
         OR worker_id IN (${workerIdsList});
    `);

    await queryInterface.sequelize.query(`
      DELETE FROM document WHERE file_path IN (${pathsList});
    `);

    // 6. Insert files into the "document" table
    const docs = documentsToInsert.map(({ file_path, mime_type, size_bytes, created_at }) => ({
      file_path,
      mime_type,
      size_bytes,
      created_at,
    }));
    await queryInterface.bulkInsert('document', docs, {});

    // 7. Retrieve generated document IDs
    const [insertedDocRows] = await queryInterface.sequelize.query(`
      SELECT id, file_path FROM document WHERE file_path IN (${pathsList});
    `);
    const docIdByPath = new Map(insertedDocRows.map((d) => [d.file_path, d.id]));

    // 8. Insert corresponding rows into "worker_document"
    const workerDocsToInsert = documentsToInsert.map((item) => ({
      worker_id: item._worker_id,
      document_id: docIdByPath.get(item.file_path) || null,
      type: item._type,
      verified: item._verified,
    }));

    await queryInterface.bulkInsert('worker_document', workerDocsToInsert, {});

    console.log(
      `[KYC Seeder] Seed completed: 6 workers with full verified KYC (IDENTITY, NIR, PROOF_OF_ADDRESS, RIB), 1 partial, 1 unverified, and 2 without documents.`,
    );
  },

  async down(queryInterface, Sequelize) {
    const allEmails = [
      ...VALID_FULL_KYC_EMAILS,
      PARTIAL_KYC_EMAIL,
      UNVERIFIED_KYC_EMAIL,
    ];

    const filePaths = [];
    for (const email of allEmails) {
      const slug = email.split('@')[0];
      for (const type of REQUIRED_KYC_TYPES) {
        filePaths.push(`'documents/kyc/${type.toLowerCase()}_${slug}.pdf'`);
      }
    }

    if (filePaths.length > 0) {
      await queryInterface.sequelize.query(`
        DELETE FROM worker_document
        WHERE document_id IN (SELECT id FROM document WHERE file_path IN (${filePaths.join(', ')}));
      `);

      await queryInterface.sequelize.query(`
        DELETE FROM document WHERE file_path IN (${filePaths.join(', ')});
      `);
    }

    console.log('[KYC Seeder] KYC documents removed successfully.');
  },
};
