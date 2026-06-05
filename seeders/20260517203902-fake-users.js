'use strict';
const { faker } = require('@faker-js/faker');

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dummyHashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();

    // 1. Seed Skill Categories
    const skillCategories = [
      { name: 'Serveur' },
      { name: 'Cuisinier' },
      { name: 'Barman' },
      { name: 'Réceptionniste' },
      { name: 'Plongeur' },
    ];
    await queryInterface.bulkInsert('skill_category', skillCategories, {});
    const skills = await queryInterface.sequelize.query(`SELECT id, name FROM skill_category;`);
    const skillRows = skills[0];

    // 2. Generate Addresses
    const addresses = [];
    const NUM_USERS = 15; // 10 workers, 5 employers
    for (let i = 0; i < NUM_USERS; i++) {
      const streetNum = faker.location.buildingNumber();
      const streetName = faker.location.street();
      const zipCode = faker.location.zipCode('#####');
      const city = faker.location.city();
      const lat = faker.location.latitude({ max: 48, min: 43 });
      const lng = faker.location.longitude({ max: 6, min: 1 });

      addresses.push({
        street_number: streetNum,
        street_name: streetName,
        zip_code: zipCode,
        city: city,
        country: 'France',
        full_address: `${streetNum} ${streetName}, ${zipCode} ${city}, France`,
        latitude: lat,
        longitude: lng,
        geom: Sequelize.fn('ST_SetSRID', Sequelize.fn('ST_MakePoint', lng, lat), 4326),
      });
    }
    await queryInterface.bulkInsert('address', addresses, {});
    const addrQuery = await queryInterface.sequelize.query(`SELECT id FROM address ORDER BY id DESC LIMIT ${NUM_USERS};`);
    const addressRows = addrQuery[0].reverse();

    // 3. Generate Users
    const users = [];
    const numWorkers = 10;
    const numEmployers = 5;

    for (let i = 0; i < numWorkers; i++) {
      users.push({
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: `worker${i + 1}@koudmain.fr`,
        password: dummyHashedPassword,
        role: 'WORKER',
        phone_number: faker.string.numeric(10),
        birth_date: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0],
        profile_picture_url: faker.image.avatar(),
        created_at: now,
      });
    }

    for (let i = 0; i < numEmployers; i++) {
      users.push({
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: `employer${i + 1}@koudmain.fr`,
        password: dummyHashedPassword,
        role: 'EMPLOYER',
        phone_number: faker.string.numeric(10),
        birth_date: faker.date.birthdate({ min: 25, max: 65, mode: 'age' }).toISOString().split('T')[0],
        profile_picture_url: faker.image.avatar(),
        created_at: now,
      });
    }

    await queryInterface.bulkInsert('user', users, {});

    const workersQuery = await queryInterface.sequelize.query(`SELECT id FROM "user" WHERE role = 'WORKER' ORDER BY id DESC LIMIT ${numWorkers};`);
    const employersQuery = await queryInterface.sequelize.query(`SELECT id FROM "user" WHERE role = 'EMPLOYER' ORDER BY id DESC LIMIT ${numEmployers};`);

    const workerRows = workersQuery[0].reverse();
    const employerRows = employersQuery[0].reverse();

    // 4. Generate Worker Profiles
    const workerProfiles = [];
    workerRows.forEach((w, i) => {
      workerProfiles.push({
        user_id: w.id,
        workplace_latitude: faker.location.latitude({ max: 48, min: 43 }),
        workplace_longitude: faker.location.longitude({ max: 6, min: 1 }),
        work_radius: faker.number.int({ min: 10, max: 50 }),
        skills_description: faker.person.jobDescriptor(),
        skill_category_id: faker.helpers.arrayElement(skillRows).id,
        address_id: addressRows[i].id,
      });
    });
    await queryInterface.bulkInsert('worker_profile', workerProfiles, {});

    // 5. Generate Companies
    const companies = [];
    employerRows.forEach((e, i) => {
      companies.push({
        name: faker.company.name(),
        owner_position: faker.helpers.arrayElement(['Manager', 'Owner', 'HR']),
        is_premium: faker.datatype.boolean(),
        address_id: addressRows[numWorkers + i].id,
      });
    });
    await queryInterface.bulkInsert('company', companies, {});

    const companiesQuery = await queryInterface.sequelize.query(`SELECT id FROM company ORDER BY id DESC LIMIT ${numEmployers};`);
    const companyRows = companiesQuery[0].reverse();

    // 6. Generate Company Members and Trades
    const companyMembers = [];
    const companyTrades = [];

    employerRows.forEach((e, i) => {
      companyMembers.push({
        user_id: e.id,
        company_id: companyRows[i].id,
        role: 'Owner',
      });
      
      const numSkills = faker.number.int({ min: 1, max: 3 });
      const pickedSkills = faker.helpers.arrayElements(skillRows, numSkills);
      pickedSkills.forEach(skill => {
        companyTrades.push({
          company_id: companyRows[i].id,
          skill_category_id: skill.id,
        });
      });
    });

    await queryInterface.bulkInsert('company_member', companyMembers, {});
    await queryInterface.bulkInsert('company_trade', companyTrades, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('company_trade', null, {});
    await queryInterface.bulkDelete('company_member', null, {});
    await queryInterface.bulkDelete('company', null, {});
    await queryInterface.bulkDelete('worker_profile', null, {});
    await queryInterface.bulkDelete('user', null, {});
    await queryInterface.bulkDelete('address', null, {});
    await queryInterface.bulkDelete('skill_category', null, {});
  }
};