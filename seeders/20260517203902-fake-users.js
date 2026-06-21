'use strict';
const { faker } = require('@faker-js/faker');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const NUMBER_OF_USERS = 100;
    const fakeUsers = [];
    const dummyHashedPassword = '$2b$10$EPf9jVdH7Z86L9/O6bO7LeV0gTAp8YVbK39d.e34Y04.b148aM6G.';

    for (let i = 0; i < NUMBER_OF_USERS; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      fakeUsers.push({
        first_name: firstName,
        last_name: lastName,
        profile_picture_url: faker.image.avatar(),
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: dummyHashedPassword,
        is_worker_active: faker.datatype.boolean(),
        is_employer_active: faker.datatype.boolean(),
        created_at: new Date(),
      });
    }

    await queryInterface.bulkInsert({ tableName: 'user', schema: 'public' }, fakeUsers, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete({ tableName: 'user', schema: 'public' }, null, {});
  },
};
