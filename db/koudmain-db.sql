CREATE TABLE IF NOT EXISTS "user" (
	"id" integer NOT NULL,
	"username" varchar(255) NOT NULL UNIQUE,
	"email" varchar(255) NOT NULL UNIQUE,
	"password" varchar(255) NOT NULL,
	"user_type" varchar(50) NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "skill" (
	"id" integer NOT NULL,
	"name" varchar(255) NOT NULL UNIQUE,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "worker_profile" (
	"id" integer NOT NULL,
	"user_id" bigint NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"bio" varchar(255) NOT NULL,
	"profile_picture_url" varchar(255) NOT NULL,
	"identity_document_url" varchar(255) NOT NULL,
	"bank_details_id" varchar(255) NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "company" (
	"id" integer NOT NULL,
	"owner_id" bigint NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"bio" varchar(255) NOT NULL,
	"adress" varchar(255) NOT NULL,
	"profile_picture_url" varchar(255) NOT NULL,
	"kbis_document_url" varchar(255) NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT 'now',
	"updated_at" timestamp with time zone NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "worker_skill" (
	"worker_profile_id" integer NOT NULL,
	"skill_id" bigint NOT NULL,
	PRIMARY KEY ("worker_profile_id", "skill_id")
);

CREATE TABLE IF NOT EXISTS "publication" (
	"id" integer NOT NULL,
	"company_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"earning_money" numeric(102) NOT NULL,
	"starting_date" timestamp with time zone NOT NULL,
	"ending_date" timestamp with time zone NOT NULL,
	"views" bigint NOT NULL DEFAULT '0',
	"clicks" bigint NOT NULL DEFAULT '0',
	"created_at" timestamp with time zone NOT NULL DEFAULT 'now',
	"updated_at" timestamp with time zone NOT NULL,
	"list_skill" bigint NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "application" (
	"id" integer NOT NULL,
	"publication_id" bigint NOT NULL,
	"worker_user_id" bigint NOT NULL,
	"status" varchar(50) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "mission" (
	"id" integer NOT NULL,
	"publication_id" bigint UNIQUE,
	"worker_user_id" bigint NOT NULL,
	"employer_user_id" bigint NOT NULL,
	"status" varchar(50) NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT 'now',
	"updated_at" timestamp with time zone NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rating" (
	"id" integer NOT NULL,
	"mission_id" bigint NOT NULL,
	"rater_user_id" bigint NOT NULL,
	"rated_user_id" bigint NOT NULL,
	"rate" bigint NOT NULL,
	"comment" varchar(255) NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT 'now',
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rating_field" (
	"id" serial NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"rate" bigint NOT NULL,
	PRIMARY KEY ("id")
);



ALTER TABLE "worker_profile" ADD CONSTRAINT "worker_profile_fk1" FOREIGN KEY ("user_id") REFERENCES "user"("id");
ALTER TABLE "company" ADD CONSTRAINT "company_fk1" FOREIGN KEY ("owner_id") REFERENCES "user"("id");
ALTER TABLE "worker_skill" ADD CONSTRAINT "worker_skill_fk0" FOREIGN KEY ("worker_profile_id") REFERENCES "worker_profile"("id");

ALTER TABLE "worker_skill" ADD CONSTRAINT "worker_skill_fk1" FOREIGN KEY ("skill_id") REFERENCES "skill"("id");
ALTER TABLE "publication" ADD CONSTRAINT "publication_fk1" FOREIGN KEY ("company_id") REFERENCES "company"("id");

ALTER TABLE "publication" ADD CONSTRAINT "publication_fk11" FOREIGN KEY ("list_skill") REFERENCES "skill"("id");
ALTER TABLE "application" ADD CONSTRAINT "application_fk1" FOREIGN KEY ("publication_id") REFERENCES "publication"("id");

ALTER TABLE "application" ADD CONSTRAINT "application_fk2" FOREIGN KEY ("worker_user_id") REFERENCES "user"("id");
ALTER TABLE "mission" ADD CONSTRAINT "mission_fk1" FOREIGN KEY ("publication_id") REFERENCES "publication"("id");
ALTER TABLE "rating" ADD CONSTRAINT "rating_fk1" FOREIGN KEY ("mission_id") REFERENCES "mission"("id");

ALTER TABLE "rating" ADD CONSTRAINT "rating_fk2" FOREIGN KEY ("rater_user_id") REFERENCES "user"("id");

ALTER TABLE "rating" ADD CONSTRAINT "rating_fk3" FOREIGN KEY ("rated_user_id") REFERENCES "user"("id");

ALTER TABLE "rating" ADD CONSTRAINT "rating_fk4" FOREIGN KEY ("rate") REFERENCES "rating_field"("id");
