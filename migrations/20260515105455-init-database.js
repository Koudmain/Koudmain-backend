'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    await queryInterface.createTable('address', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      street_number: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      street_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      zip_code: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING(100),
        defaultValue: 'France',
        allowNull: true,
      },
      latitude: {
        type: Sequelize.DECIMAL(9, 6),
        allowNull: true,
        comment: 'Essentiel pour le matching',
      },
      longitude: {
        type: Sequelize.DECIMAL(9, 6),
        allowNull: true,
        comment: 'Essentiel pour le matching',
      },
      full_address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      geom: {
        type: Sequelize.GEOGRAPHY('POINT', 4326),
        allowNull: true,
      },
    });

    await queryInterface.addIndex('address', ['geom'], {
      name: 'idx_address_geom',
      using: 'GIST',
    });

    await queryInterface.createTable('user', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      first_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      profile_picture_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_worker_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "Accès à l'App Worker",
      },
      is_employer_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "Accès à l'App Enterprise",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('refresh_session', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      token_hash: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('refresh_session', ['user_id'], {
      name: 'refresh_session_user_id_not_revoked',
      unique: true,
      where: { revoked_at: null },
    });

    await queryInterface.addIndex('refresh_session', ['user_id']);
    await queryInterface.addIndex('refresh_session', ['expires_at']);

    await queryInterface.createTable('worker_profile', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      address_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'address',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      max_distance_km: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        comment: 'Rayon de recherche',
      },
      skills_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      identity_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      iban: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      average_rating: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
    });

    await queryInterface.createTable('wallet', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'worker_profile',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      balance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Solde disponible pour virement',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.createTable('wallet_transaction', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      wallet_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'wallet',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Positif pour un gain, négatif pour un virement sortant',
      },
      type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'MISSION_PAYMENT, WITHDRAWAL, REFUND',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'PENDING, COMPLETED, FAILED',
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "ID de la mission ou de l'invoice liée",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('company', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      address_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'address',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      siret_number: {
        type: Sequelize.STRING(20),
        unique: true,
        allowNull: true,
      },
      kbis_document_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      is_premium: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Abonnement visibilité',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('company_member', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'company',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Owner, Manager, Staff',
      },
    });

    await queryInterface.addIndex('company_member', ['company_id', 'user_id'], {
      unique: true,
    });

    await queryInterface.createTable(
      'skill_category',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(255),
          unique: true,
          allowNull: true,
        },
      },
      {
        comment: 'Catégories pour organiser les compétences',
      },
    );

    await queryInterface.createTable('skill', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: true,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'skill_category',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
    });

    await queryInterface.addIndex('skill', ['category_id'], {
      name: 'idx_skill_category_id',
    });

    await queryInterface.createTable('worker_skill', {
      worker_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'worker_profile',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      skill_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'skill',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
    });

    await queryInterface.createTable('publication', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'company',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      created_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      address_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'address',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
        comment: 'Par défaut celle de la company, mais peut varier',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      hourly_rate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Base pour le calcul des frais',
      },
      starting_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ending_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Open, Closed, Urgent',
      },
      views: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      clicks: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      auto_accept: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      highlighted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('publication_skill', {
      publication_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'publication',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      skill_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'skill',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
    });

    await queryInterface.createTable('application', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      publication_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'publication',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'worker_profile',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Pending, Accepted, Rejected',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('mission', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      publication_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'publication',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'worker_profile',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'company',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      final_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Prix total après commission',
      },
      payment_status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Pending, Paid, Disputed',
      },
      contract_signed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Signature électronique',
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Planned, In_Progress, Completed, Cancelled',
      },
    });

    await queryInterface.createTable('review', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'mission',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      reviewer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      rated_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '1 à 5',
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Worker_to_Company or Company_to_Worker',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('conversation', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      publication_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'publication',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'worker_profile',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'company',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date du dernier message pour le tri',
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'active',
      },
    });

    await queryInterface.createTable('conversation_settings', {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      conversation_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'conversation',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      is_pinned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    });

    await queryInterface.addIndex('conversation_settings', ['user_id'], {
      name: 'idx_conv_settings_user_id',
    });

    await queryInterface.createTable('message', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'conversation',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
        comment: "L'humain réel qui envoie",
      },
      content_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Lien S3 pour Audio ou Image',
      },
      message_type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'TEXT, IMAGE, AUDIO',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('message_status', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      message_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'message',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Si null, message non lu',
      },
      is_hidden: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Suppression individuelle',
      },
    });

    await queryInterface.addIndex('message_status', ['message_id', 'user_id'], {
      unique: true,
    });

    await queryInterface.createTable('document', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Chemin sur le serveur S3',
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'pdf, png...',
      },
      size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.createTable('worker_document', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      worker_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'worker_profile',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'document',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'IDENTITY, RIB, DIPLOMA',
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    });

    await queryInterface.createTable('company_document', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'company',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'document',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'KBIS, COMPANY_RIB',
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    });

    await queryInterface.createTable('contract', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'mission',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      signed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      worker_signature_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      employer_signature_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'PENDING, SIGNED, EXPIRED',
      },
    });

    await queryInterface.createTable('invoice', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'mission',
          key: 'id',
        },
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
      },
      invoice_number: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true,
      },
      amount_ht: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      amount_ttc: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      fee_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Ta commission',
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'UNPAID, PAID, CANCELLED',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('invoice');
    await queryInterface.dropTable('contract');
    await queryInterface.dropTable('company_document');
    await queryInterface.dropTable('worker_document');
    await queryInterface.dropTable('document');
    await queryInterface.dropTable('message_status');
    await queryInterface.dropTable('message');
    await queryInterface.dropTable('conversation_settings');
    await queryInterface.dropTable('conversation');
    await queryInterface.dropTable('review');
    await queryInterface.dropTable('mission');
    await queryInterface.dropTable('application');
    await queryInterface.dropTable('publication_skill');
    await queryInterface.dropTable('publication');
    await queryInterface.dropTable('worker_skill');
    await queryInterface.dropTable('skill');
    await queryInterface.dropTable('skill_category');
    await queryInterface.dropTable('company_member');
    await queryInterface.dropTable('company');
    await queryInterface.dropTable('wallet_transaction');
    await queryInterface.dropTable('wallet');
    await queryInterface.dropTable('worker_profile');
    await queryInterface.dropTable('refresh_session');
    await queryInterface.dropTable('user');
    await queryInterface.dropTable('address');
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS postgis CASCADE;');
  },
};

