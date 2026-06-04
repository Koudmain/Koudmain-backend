'use strict';
const axios = require('axios');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const BELLECOUR_LAT = 45.7578;
    const BELLECOUR_LNG = 4.8321;
    const TOTAL_A_PRENDRE = 20;

    try {
      const response = await axios.get('https://api-adresse.data.gouv.fr/search/', {
        params: {
          q: 'Lyon, France',
          lat: BELLECOUR_LAT,
          lon: BELLECOUR_LNG,
          limit: 50
        }
      });

      const features = response.data?.features || [];
      if (features.length === 0) {
        console.log("Aucune adresse récupérée de la BAN. Fin du seed.");
        return;
      }

      const validFeatures = features.filter(feature => {
        const props = feature.properties;
        const coords = feature.geometry?.coordinates;
        return coords && coords.length >= 2 && props.postcode?.startsWith('69');
      });

      for (let i = validFeatures.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validFeatures[i], validFeatures[j]] = [validFeatures[j], validFeatures[i]];
      }

      const finalFeatures = validFeatures.slice(0, TOTAL_A_PRENDRE);
      const addressesToInsert = finalFeatures.map(feature => {
        const props = feature.properties;
        const [longitude, latitude] = feature.geometry.coordinates;

        return {
          street_number: props.housenumber || "",
          street_name: props.street || props.name,
          zip_code: props.postcode,
          city: props.city,
          country: "France",
          latitude: latitude,
          longitude: longitude,
          full_address: props.label,
          geom: Sequelize.fn('ST_SetSRID', Sequelize.fn('ST_MakePoint', longitude, latitude), 4326),
        };
      });

      if (addressesToInsert.length > 0) {
        await queryInterface.bulkInsert('address', addressesToInsert, {});
        console.log(`${addressesToInsert.length} vraies adresses insérées en BDD avec succès !`);
      }

    } catch (error) {
      console.error("Échec lors du seeding des adresses :", error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('address', { city: 'Lyon' }, {});
    console.log("Adresses de Lyon nettoyées.");
  }
};
