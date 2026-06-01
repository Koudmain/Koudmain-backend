/* trunk-ignore-all(eslint) */
const axios = require('axios');

const API_URL = 'http://localhost:3000/address';
const BEARER_TOKEN = 'BearerTokenExample1234567890'; // Remplacez par votre token réel

const BELLECOUR_LAT = 45.7578;
const BELLECOUR_LNG = 4.8321;

async function fetchRealAddressesFromBAN() {
  console.log("Récupération d'adresses réelles autour de Bellecour via l'API Nationale...");

  try {
    const response = await axios.get('https://api-adresse.data.gouv.fr/search/', {
      params: {
        q: 'Lyon',
        lat: BELLECOUR_LAT,
        lon: BELLECOUR_LNG,
        limit: 20
      }
    });

    return response.data.features;
  } catch (error) {
    console.error("Impossible de joindre l'API Nationale Adresse :", error.message);
    return [];
  }
}

async function seedData() {
  const features = await fetchRealAddressesFromBAN();

  if (features.length === 0) {
    console.log("Aucune adresse récupérée. Abandon du script.");
    return;
  }

  for (let i = 0; i < features.length; i++) {
    console.log(features[i]);
    const properties = features[i].properties;
    const [longitude, latitude] = features[i].geometry.coordinates;

    const payload = {
      street_number: properties.housenumber || "",
      street_name: properties.street || properties.name,
      zip_code: properties.postcode,
      city: properties.city,
      country: "France",
      latitude: latitude,
      longitude: longitude
    };

    try {
      await axios.post(API_URL, payload, {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Succès: [${i + 1}/${features.length}] Envoyé : ${payload.street_number} ${payload.street_name}, ${payload.zip_code} ${payload.city}`);
    } catch (error) {
      console.error(`Erreur: [${i + 1}/${features.length}] Échec de l'envoi pour [${payload.street_name}] :`, error.response?.data || error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('Peuplement terminé avec de vraies adresses géolocalisées !');
}

seedData();