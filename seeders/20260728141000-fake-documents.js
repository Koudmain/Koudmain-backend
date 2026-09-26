'use strict';
const { faker } = require('@faker-js/faker');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const [users] = await queryInterface.sequelize.query(
      `SELECT id, role, first_name, last_name FROM "user";`,
    );
    const [workers] = await queryInterface.sequelize.query(
      `SELECT id, user_id FROM "worker_profile";`,
    );
    const [companies] = await queryInterface.sequelize.query(
      `SELECT id, name FROM "company";`,
    );
    const [missions] = await queryInterface.sequelize.query(
      `SELECT id FROM "mission";`,
    );

    const userList = users || [];
    const workerList = workers || [];
    const companyList = companies || [];
    const missionList = missions || [];

    const documentsToInsert = [];
    const assignmentsToInsert = [];
    const contextsToInsert = [];
    const contractsToInsert = [];
    const invoicesToInsert = [];

    let docIdCounter = 1;

    // --- DOCUMENTS UTILISATEURS (Pièces d'identité, Justificatifs) ---
    userList.forEach((u) => {
      // Document : Pièce d'identité
      const identityDocId = docIdCounter++;
      documentsToInsert.push({
        id: identityDocId,
        name: `Pièce d'identité - ${u.first_name || 'Utilisateur'} ${u.last_name || u.id}`,
        original_filename: `cni_${u.id}_${faker.string.alphanumeric(5)}.pdf`,
        file_path: `https://storage.koudmain.fr/docs/users/${u.id}/cni.pdf`,
        category: 'OTHER',
        size_bytes: faker.number.int({ min: 500000, max: 3000000 }),
        mime_type: 'application/pdf',
        created_at: now,
        updated_at: now,
      });

      assignmentsToInsert.push({
        document_id: identityDocId,
        user_id: u.id,
        worker_id: null,
        company_id: null,
        type: 'IDENTITY',
        verified: faker.datatype.boolean(0.8),
        created_at: now,
        updated_at: now,
      });

      // Document : Justificatif de domicile
      const domDocId = docIdCounter++;
      documentsToInsert.push({
        id: domDocId,
        name: `Justificatif de domicile`,
        original_filename: `justificatif_domicile_${u.id}.pdf`,
        file_path: `https://storage.koudmain.fr/docs/users/${u.id}/domicile.pdf`,
        category: 'OTHER',
        size_bytes: faker.number.int({ min: 200000, max: 1500000 }),
        mime_type: 'application/pdf',
        created_at: now,
        updated_at: now,
      });

      assignmentsToInsert.push({
        document_id: domDocId,
        user_id: u.id,
        worker_id: null,
        company_id: null,
        type: 'PROOF_OF_ADDRESS',
        verified: faker.datatype.boolean(0.7),
        created_at: now,
        updated_at: now,
      });
    });

    // --- DOCUMENTS WORKERS (RIB, Diplômes, Certifications) ---
    workerList.forEach((w) => {
      // Document : RIB Worker
      const ribDocId = docIdCounter++;
      documentsToInsert.push({
        id: ribDocId,
        name: `RIB - Profil Worker #${w.id}`,
        original_filename: `rib_worker_${w.id}.pdf`,
        file_path: `https://storage.koudmain.fr/docs/workers/${w.id}/rib.pdf`,
        category: 'OTHER',
        size_bytes: faker.number.int({ min: 100000, max: 800000 }),
        mime_type: 'application/pdf',
        created_at: now,
        updated_at: now,
      });

      assignmentsToInsert.push({
        document_id: ribDocId,
        worker_id: w.id,
        user_id: w.user_id || null,
        company_id: null,
        type: 'RIB',
        verified: true,
        created_at: now,
        updated_at: now,
      });

      // Document : Diplôme ou Certification HACCP / CACES
      const certDocId = docIdCounter++;
      const certName = faker.helpers.arrayElement([
        'Diplôme CAP Restauration',
        'Attestation Formation HACCP Hygiène',
        'Permis CACES 1/3/5',
        'Certificat de Formation Service en Salle',
      ]);
      documentsToInsert.push({
        id: certDocId,
        name: certName,
        original_filename: `certification_${w.id}.pdf`,
        file_path: `https://storage.koudmain.fr/docs/workers/${w.id}/diploma.pdf`,
        category: 'OTHER',
        size_bytes: faker.number.int({ min: 800000, max: 4000000 }),
        mime_type: 'application/pdf',
        created_at: now,
        updated_at: now,
      });

      assignmentsToInsert.push({
        document_id: certDocId,
        worker_id: w.id,
        user_id: w.user_id || null,
        company_id: null,
        type: 'DIPLOMA',
        verified: faker.datatype.boolean(0.9),
        created_at: now,
        updated_at: now,
      });
    });

    // --- DOCUMENTS ENTREPRISES (KBIS, RIB Société) ---
    companyList.forEach((c) => {
      // Document : Extrait KBIS
      const kbisDocId = docIdCounter++;
      documentsToInsert.push({
        id: kbisDocId,
        name: `Extrait KBIS - ${c.name || 'Entreprise #' + c.id}`,
        original_filename: `kbis_company_${c.id}.pdf`,
        file_path: `https://storage.koudmain.fr/docs/companies/${c.id}/kbis.pdf`,
        category: 'OTHER',
        size_bytes: faker.number.int({ min: 1200000, max: 5000000 }),
        mime_type: 'application/pdf',
        created_at: now,
        updated_at: now,
      });

      assignmentsToInsert.push({
        document_id: kbisDocId,
        company_id: c.id,
        worker_id: null,
        user_id: null,
        type: 'KBIS',
        verified: true,
        created_at: now,
        updated_at: now,
      });

      // Document : RIB Entreprise
      const compRibDocId = docIdCounter++;
      documentsToInsert.push({
        id: compRibDocId,
        name: `RIB Société - ${c.name || 'Entreprise #' + c.id}`,
        original_filename: `rib_company_${c.id}.pdf`,
        file_path: `https://storage.koudmain.fr/docs/companies/${c.id}/rib.pdf`,
        category: 'OTHER',
        size_bytes: faker.number.int({ min: 200000, max: 900000 }),
        mime_type: 'application/pdf',
        created_at: now,
        updated_at: now,
      });

      assignmentsToInsert.push({
        document_id: compRibDocId,
        company_id: c.id,
        worker_id: null,
        user_id: null,
        type: 'COMPANY_RIB',
        verified: true,
        created_at: now,
        updated_at: now,
      });
    });

    // --- CONTRATS ET FACTURES (Liés aux missions réelles) ---
    missionList.forEach((m, idx) => {
      // Contrat de mission
      const contractDocId = docIdCounter++;
      documentsToInsert.push({
        id: contractDocId,
        name: `Contrat de Prestation - Mission #${m.id}`,
        original_filename: `contrat_mission_${m.id}.pdf`,
        file_path: `https://storage.koudmain.fr/docs/contracts/contrat_m${m.id}.pdf`,
        category: 'CONTRACT',
        size_bytes: faker.number.int({ min: 1500000, max: 3500000 }),
        mime_type: 'application/pdf',
        created_at: now,
        updated_at: now,
      });

      contextsToInsert.push({
        document_id: contractDocId,
        mission_id: m.id,
        publication_id: null,
        conversation_id: null,
      });

      contractsToInsert.push({
        document_id: contractDocId,
        document_category: 'CONTRACT',
        mission_id: m.id,
        file_path: `https://storage.koudmain.fr/docs/contracts/contrat_m${m.id}.pdf`,
        signed_at: now,
        worker_signature_id: `SIG_WORKER_${faker.string.alphanumeric(8)}`,
        employer_signature_id: `SIG_EMP_${faker.string.alphanumeric(8)}`,
        status: 'SIGNED',
        created_at: now,
        updated_at: now,
      });

      // Facture de mission
      const invoiceDocId = docIdCounter++;
      const amountHt = faker.number.float({ min: 150, max: 1200, fractionDigits: 2 });
      const feeAmount = parseFloat((amountHt * 0.1).toFixed(2));
      const amountTtc = parseFloat((amountHt * 1.2).toFixed(2));
      const invNum = `INV-2026-${String(idx + 1).padStart(4, '0')}`;

      documentsToInsert.push({
        id: invoiceDocId,
        name: `Facture ${invNum} - Mission #${m.id}`,
        original_filename: `facture_${invNum}.pdf`,
        file_path: `https://storage.koudmain.fr/docs/invoices/${invNum}.pdf`,
        category: 'INVOICE',
        size_bytes: faker.number.int({ min: 500000, max: 2000000 }),
        mime_type: 'application/pdf',
        created_at: now,
        updated_at: now,
      });

      contextsToInsert.push({
        document_id: invoiceDocId,
        mission_id: m.id,
        publication_id: null,
        conversation_id: null,
      });

      invoicesToInsert.push({
        document_id: invoiceDocId,
        document_category: 'INVOICE',
        mission_id: m.id,
        invoice_number: invNum,
        amount_ht: amountHt,
        amount_ttc: amountTtc,
        fee_amount: feeAmount,
        file_path: `https://storage.koudmain.fr/docs/invoices/${invNum}.pdf`,
        status: 'PAID',
        created_at: now,
        updated_at: now,
      });
    });

    if (documentsToInsert.length > 0) {
      await queryInterface.bulkInsert('document', documentsToInsert, {});
    }
    if (assignmentsToInsert.length > 0) {
      await queryInterface.bulkInsert('document_assignment', assignmentsToInsert, {});
    }
    if (contextsToInsert.length > 0) {
      await queryInterface.bulkInsert('document_context', contextsToInsert, {});
    }
    if (contractsToInsert.length > 0) {
      await queryInterface.bulkInsert('contract', contractsToInsert, {});
    }
    if (invoicesToInsert.length > 0) {
      await queryInterface.bulkInsert('invoice', invoicesToInsert, {});
    }

    if (documentsToInsert.length > 0) {
      await queryInterface.sequelize.query(
        `SELECT setval(pg_get_serial_sequence('document', 'id'), coalesce(max(id), 1)) FROM "document";`,
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('invoice', null, {});
    await queryInterface.bulkDelete('contract', null, {});
    await queryInterface.bulkDelete('document_context', null, {});
    await queryInterface.bulkDelete('document_assignment', null, {});
    await queryInterface.bulkDelete('document', null, {});
  },
};
