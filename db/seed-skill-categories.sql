-- Seed data for skill_category table

INSERT INTO "skill_category" ("name") VALUES
  ('Restaurant FOH'),
  ('Restaurant BOH'),
  ('Coffee'),
ON CONFLICT ("name") DO NOTHING;
