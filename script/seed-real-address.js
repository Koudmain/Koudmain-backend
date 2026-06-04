const axios = require('axios');

const API_URL = 'http://localhost:3000/address';
const BEARER_TOKEN = 'your_bearer_token_here'; // Remplacez par votre token réel

const TOTAL_A_PRENDRE = 20;
const BELLECOUR_LAT = 45.7578;
const BELLECOUR_LNG = 4.8321;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function fetchAddresses() {
  console.log("Récupération de 100 adresses sur la BAN...");
  try {
    const response = await axios.get('https://api-adresse.data.gouv.fr/search/', {
      params: {
        q: 'Lyon, France',
        lat: BELLECOUR_LAT,
        lon: BELLECOUR_LNG,
        limit: 50
      }
    });
    return response.data?.features || [];
  } catch (error) {
    console.error("Échec de la récupération BAN :", error.message);
    return [];
  }
}

async function seedData() {
  const features = await fetchAddresses();

  if (features.length === 0) {
    console.log("Aucune adresse récupérée. Fin du script.");
    return;
  }

  for (let i = 0; i < features.length; i++) {
    const props = features[i].properties;
    const coords = features[i].geometry?.coordinates;
    console.log(`[${i + 1}/${features.length}] ${props.housenumber || ""} ${props.street || props.name}, ${props.postcode} ${props.city} - Coords: ${coords ? coords.join(', ') : 'N/A'}`);
  }
  const validFeatures = features.filter(feature => {
    const props = feature.properties;
    const coords = feature.geometry?.coordinates;

    if (!coords || coords.length < 2 || isNaN(coords[0]) || isNaN(coords[1])) {
      return false;
    }

    if (!props.postcode || !props.postcode.startsWith('69')) {
      return false;
    }

    return true;
  });

  const shuffledFeatures = shuffleArray(validFeatures);

  const finalFeatures = shuffledFeatures.slice(0, TOTAL_A_PRENDRE);

  console.log(`Après filtrage et mélange : ${finalFeatures.length} adresses prêtes à l'envoi.`);

  for (let i = 0; i < finalFeatures.length; i++) {
    const properties = finalFeatures[i].properties;
    const [longitude, latitude] = finalFeatures[i].geometry.coordinates;

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
      console.log(`[${i + 1}/${finalFeatures.length}] Envoyé : ${payload.street_number} ${payload.street_name}, ${payload.zip_code} ${payload.city}`);
    } catch (error) {
      console.error(`[${i + 1}/${finalFeatures.length}] Échec pour [${payload.street_name}] :`, error.response?.data || error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('Peuplement terminé !');
}

seedData();
