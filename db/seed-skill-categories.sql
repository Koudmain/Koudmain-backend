-- Seed data for skill_category table

INSERT INTO "skill_category" ("name") VALUES
  ('IT & Development'),
  ('Design & Creative'),
  ('Sales & Marketing'),
  ('Writing & Translation'),
  ('Admin & Customer Support'),
  ('Finance & Accounting'),
  ('Engineering & Architecture'),
  ('Legal'),
  ('HR & Recruiting'),
  ('Manual Labor & Trades'),
  ('Transportation & Logistics'),
  ('Healthcare & Wellness')
ON CONFLICT ("name") DO NOTHING;
