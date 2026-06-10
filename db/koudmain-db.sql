CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "address" (
  "id" serial PRIMARY KEY,
  "street_number" varchar(10),
  "street_name" varchar(255),
  "zip_code" varchar(10),
  "city" varchar(100),
  "country" varchar(100) DEFAULT 'France',
  "latitude" numeric(9,6),
  "longitude" numeric(9,6),
  "full_address" text,
  "geom" geography(Point, 4326)
);

CREATE TYPE "user_role" AS ENUM ('WORKER', 'EMPLOYER');

CREATE TABLE "user" (
  "id" serial PRIMARY KEY,
  "first_name" varchar(255),
  "last_name" varchar(255),
  "profile_picture_url" varchar(255),
  "email" varchar UNIQUE,
  "password" varchar,
  "phone_number" varchar(20),
  "email_verified_at" timestamp,
  "birth_date" date,
  "role" "user_role" NOT NULL,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "refresh_session" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE UNIQUE INDEX refresh_session_user_id_not_revoked ON "refresh_session" ("user_id")
WHERE "revoked_at" IS NULL;

CREATE INDEX ON "refresh_session" ("user_id");

CREATE INDEX ON "refresh_session" ("expires_at");

CREATE TABLE "worker_profile" (
  "id" serial PRIMARY KEY,
  "user_id" integer,
  "address_id" integer,
  "bio" text,
  "workplace_latitude" numeric(9,6),
  "workplace_longitude" numeric(9,6),
  "work_radius" integer DEFAULT 20,
  "skills_description" text,
  "identity_verified" boolean DEFAULT false,
  "iban" varchar,
  "average_rating" numeric
);

CREATE TABLE "wallet" (
  "id" serial PRIMARY KEY,
  "worker_id" integer,
  "balance" numeric(10,2) DEFAULT 0,
  "updated_at" timestamp
);

CREATE TABLE "wallet_transaction" (
  "id" serial PRIMARY KEY,
  "wallet_id" integer,
  "amount" numeric(10,2),
  "type" varchar,
  "status" varchar,
  "reference_id" integer,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "company" (
  "id" serial PRIMARY KEY,
  "name" varchar(255),
  "address_id" integer,
  "siret_number" varchar(20) UNIQUE,
  "kbis_document_url" varchar(255),
  "is_premium" boolean DEFAULT false,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "company_member" (
  "id" serial PRIMARY KEY,
  "company_id" integer,
  "user_id" integer,
  "role" varchar(50)
);

CREATE TABLE "skill" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) UNIQUE,
  "category_id" integer
);

CREATE INDEX idx_skill_category_id ON "skill" ("category_id");

CREATE TABLE "worker_skill" (
  "worker_id" integer,
  "skill_id" integer,
  PRIMARY KEY ("worker_id", "skill_id")
);

CREATE TABLE "publication" (
  "id" serial PRIMARY KEY,
  "company_id" integer,
  "created_by_user_id" integer,
  "address_id" integer,
  "title" varchar(255),
  "description" text,
  "hourly_rate" numeric(10,2),
  "starting_date" timestamp,
  "ending_date" timestamp,
  "status" varchar(50),
	"views" bigint NOT NULL DEFAULT '0',
	"clicks" bigint NOT NULL DEFAULT '0',
  "auto_accept" boolean DEFAULT false,
  "highlighted" boolean DEFAULT false,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "publication_skill" (
  "publication_id" integer,
  "skill_id" integer,
  PRIMARY KEY ("publication_id", "skill_id")
);

CREATE TABLE "application" (
  "id" serial PRIMARY KEY,
  "publication_id" integer,
  "worker_id" integer,
  "status" varchar(50),
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "mission" (
  "id" serial PRIMARY KEY,
  "publication_id" integer,
  "worker_id" integer,
  "company_id" integer,
  "final_price" numeric(10,2),
  "payment_status" varchar(50),
  "contract_signed_at" timestamp,
  "status" varchar(50)
);

CREATE TABLE "review" (
  "id" serial PRIMARY KEY,
  "mission_id" integer,
  "reviewer_id" integer,
  "rated_id" integer,
  "rating" integer,
  "comment" text,
  "type" varchar(20),
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "conversation" (
  "id" serial PRIMARY KEY,
  "publication_id" integer,
  "worker_id" integer,
  "company_id" integer,
  "updated_at" timestamp,
  "status" varchar DEFAULT 'active'
);

CREATE TABLE "conversation_settings" (
  "user_id" integer NOT NULL,
  "conversation_id" integer NOT NULL,
  "is_pinned" boolean DEFAULT false,
  "is_deleted" boolean DEFAULT false,
  PRIMARY KEY ("user_id", "conversation_id"),
  FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") ON DELETE CASCADE
);

CREATE INDEX idx_conv_settings_user_id ON "conversation_settings"("user_id");

CREATE TABLE "message" (
  "id" serial PRIMARY KEY,
  "conversation_id" integer,
  "sender_id" integer,
  "content_text" text,
  "file_url" varchar,
  "message_type" varchar,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "message_status" (
  "id" serial PRIMARY KEY,
  "message_id" integer,
  "user_id" integer,
  "read_at" timestamp,
  "is_hidden" boolean DEFAULT false
);

CREATE TABLE "document" (
  "id" serial PRIMARY KEY,
  "file_path" varchar,
  "mime_type" varchar,
  "size_bytes" integer,
  "created_at" timestamp
);

CREATE TABLE "worker_document" (
  "id" serial PRIMARY KEY,
  "worker_id" integer,
  "document_id" integer,
  "type" varchar,
  "verified" boolean DEFAULT false
);

CREATE TABLE "company_document" (
  "id" serial PRIMARY KEY,
  "company_id" integer,
  "document_id" integer,
  "type" varchar,
  "verified" boolean DEFAULT false
);

CREATE TABLE "contract" (
  "id" serial PRIMARY KEY,
  "mission_id" integer,
  "file_path" varchar,
  "signed_at" timestamp,
  "worker_signature_id" varchar,
  "employer_signature_id" varchar,
  "status" varchar
);

CREATE TABLE "invoice" (
  "id" serial PRIMARY KEY,
  "mission_id" integer,
  "invoice_number" varchar UNIQUE,
  "amount_ht" numeric(10,2),
  "amount_ttc" numeric(10,2),
  "fee_amount" numeric(10,2),
  "file_path" varchar,
  "status" varchar,
  "created_at" timestamp
);

CREATE TABLE "skill_category" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) UNIQUE
);

CREATE UNIQUE INDEX ON "company_member" ("company_id", "user_id");

CREATE UNIQUE INDEX ON "message_status" ("message_id", "user_id");

COMMENT ON COLUMN "address"."latitude" IS 'Essentiel pour le matching';

COMMENT ON COLUMN "address"."longitude" IS 'Essentiel pour le matching';

COMMENT ON COLUMN "user"."role" IS 'Rôle exclusif de l''utilisateur (WORKER ou EMPLOYER)';

COMMENT ON COLUMN "worker_profile"."work_radius" IS 'Rayon de recherche (km)';
COMMENT ON COLUMN "user"."birth_date" IS 'Date de naissance pour KYC et légalité';
COMMENT ON COLUMN "worker_profile"."bio" IS 'Description/Biographie du worker';
COMMENT ON COLUMN "worker_profile"."workplace_latitude" IS 'Latitude du lieu de travail souhaité';
COMMENT ON COLUMN "worker_profile"."workplace_longitude" IS 'Longitude du lieu de travail souhaité';

COMMENT ON COLUMN "wallet"."balance" IS 'Solde disponible pour virement';

COMMENT ON COLUMN "wallet_transaction"."amount" IS 'Positif pour un gain, négatif pour un virement sortant';

COMMENT ON COLUMN "wallet_transaction"."type" IS 'MISSION_PAYMENT, WITHDRAWAL, REFUND';

COMMENT ON COLUMN "wallet_transaction"."status" IS 'PENDING, COMPLETED, FAILED';

COMMENT ON COLUMN "wallet_transaction"."reference_id" IS 'ID de la mission ou de l''invoice liée';

COMMENT ON COLUMN "company"."is_premium" IS 'Abonnement visibilité';

COMMENT ON COLUMN "company_member"."role" IS 'Owner, Manager, Staff';

COMMENT ON COLUMN "publication"."address_id" IS 'Par défaut celle de la company, mais peut varier';

COMMENT ON COLUMN "publication"."hourly_rate" IS 'Base pour le calcul des frais';

COMMENT ON COLUMN "publication"."status" IS 'Open, Closed, Urgent';

COMMENT ON COLUMN "application"."status" IS 'Pending, Accepted, Rejected';

COMMENT ON COLUMN "mission"."final_price" IS 'Prix total après commission';

COMMENT ON COLUMN "mission"."payment_status" IS 'Pending, Paid, Disputed';

COMMENT ON COLUMN "mission"."contract_signed_at" IS 'Signature électronique';

COMMENT ON COLUMN "mission"."status" IS 'Planned, In_Progress, Completed, Cancelled';

COMMENT ON COLUMN "review"."rating" IS '1 à 5';

COMMENT ON COLUMN "review"."type" IS 'Worker_to_Company or Company_to_Worker';

COMMENT ON COLUMN "conversation"."updated_at" IS 'Date du dernier message pour le tri';

COMMENT ON COLUMN "message"."sender_id" IS 'L''humain réel qui envoie';

COMMENT ON COLUMN "message"."file_url" IS 'Lien S3 pour Audio ou Image';

COMMENT ON COLUMN "message"."message_type" IS 'TEXT, IMAGE, AUDIO';

COMMENT ON COLUMN "message_status"."read_at" IS 'Si null, message non lu';

COMMENT ON COLUMN "message_status"."is_hidden" IS 'Suppression individuelle';

COMMENT ON COLUMN "document"."file_path" IS 'Chemin sur le serveur S3';

COMMENT ON COLUMN "document"."mime_type" IS 'pdf, png...';

COMMENT ON COLUMN "worker_document"."type" IS 'IDENTITY, RIB, DIPLOMA';

COMMENT ON COLUMN "company_document"."type" IS 'KBIS, COMPANY_RIB';

COMMENT ON COLUMN "contract"."status" IS 'PENDING, SIGNED, EXPIRED';

COMMENT ON COLUMN "invoice"."fee_amount" IS 'Ta commission';

COMMENT ON COLUMN "invoice"."status" IS 'UNPAID, PAID, CANCELLED';

COMMENT ON TABLE "skill_category" IS 'Catégories pour organiser les compétences';

ALTER TABLE "worker_profile" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "worker_profile" ADD FOREIGN KEY ("address_id") REFERENCES "address" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet" ADD FOREIGN KEY ("worker_id") REFERENCES "worker_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_transaction" ADD FOREIGN KEY ("wallet_id") REFERENCES "wallet" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "company" ADD FOREIGN KEY ("address_id") REFERENCES "address" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "company_member" ADD FOREIGN KEY ("company_id") REFERENCES "company" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "company_member" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "worker_skill" ADD FOREIGN KEY ("worker_id") REFERENCES "worker_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "worker_skill" ADD FOREIGN KEY ("skill_id") REFERENCES "skill" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "publication" ADD FOREIGN KEY ("company_id") REFERENCES "company" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "publication" ADD FOREIGN KEY ("created_by_user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "publication" ADD FOREIGN KEY ("address_id") REFERENCES "address" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "publication_skill" ADD FOREIGN KEY ("publication_id") REFERENCES "publication" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "publication_skill" ADD FOREIGN KEY ("skill_id") REFERENCES "skill" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "application" ADD FOREIGN KEY ("publication_id") REFERENCES "publication" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "application" ADD FOREIGN KEY ("worker_id") REFERENCES "worker_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "mission" ADD FOREIGN KEY ("publication_id") REFERENCES "publication" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "mission" ADD FOREIGN KEY ("worker_id") REFERENCES "worker_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "mission" ADD FOREIGN KEY ("company_id") REFERENCES "company" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review" ADD FOREIGN KEY ("mission_id") REFERENCES "mission" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review" ADD FOREIGN KEY ("reviewer_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review" ADD FOREIGN KEY ("rated_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation" ADD FOREIGN KEY ("publication_id") REFERENCES "publication" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation" ADD FOREIGN KEY ("worker_id") REFERENCES "worker_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation" ADD FOREIGN KEY ("company_id") REFERENCES "company" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "message" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "message" ADD FOREIGN KEY ("sender_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "message_status" ADD FOREIGN KEY ("message_id") REFERENCES "message" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "message_status" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "worker_document" ADD FOREIGN KEY ("worker_id") REFERENCES "worker_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "worker_document" ADD FOREIGN KEY ("document_id") REFERENCES "document" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "company_document" ADD FOREIGN KEY ("company_id") REFERENCES "company" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "company_document" ADD FOREIGN KEY ("document_id") REFERENCES "document" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "contract" ADD FOREIGN KEY ("mission_id") REFERENCES "mission" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice" ADD FOREIGN KEY ("mission_id") REFERENCES "mission" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "skill" ADD FOREIGN KEY ("category_id") REFERENCES "skill_category" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "address" ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326);

CREATE INDEX IF NOT EXISTS "idx_address_geom" ON "address" USING GIST ("geom");

-- Seed data for skill_category table
INSERT INTO "skill_category" ("name") VALUES
  ('Restaurant FOH'),
  ('Restaurant BOH'),
  ('Café') ON CONFLICT DO NOTHING;