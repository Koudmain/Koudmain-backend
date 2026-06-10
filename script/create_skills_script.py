import requests

# Configuration
BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/auth/login"
CREATE_SKILL_URL = f"{BASE_URL}/skill/create"

# Identifiants
login_data = {
    "email": "employer1@koudmain.fr",
    "password": "password123"
}

skills_to_create = [
    # Restauration en salle (ID 0)
    {"name": "Service à l'assiette et au plateau", "category_id": 0},
    {"name": "Gestion de l'encaissement et POS", "category_id": 0},
    {"name": "Accueil et relation client", "category_id": 0},
    {"name": "Conseil en sommellerie", "category_id": 0},
    {"name": "Mise en place et dressage", "category_id": 0},

    # Restauration en cuisine (ID 1)
    {"name": "Normes HACCP", "category_id": 1},
    {"name": "Techniques de découpe", "category_id": 1},
    {"name": "Gestion des modes de cuisson", "category_id": 1},
    {"name": "Élaboration de fiches techniques", "category_id": 1},
    {"name": "Dressage culinaire", "category_id": 1},

    # Café (ID 2)
    {"name": "Extraction Espresso et réglage moulin", "category_id": 2},
    {"name": "Latte Art et moussage de lait", "category_id": 2},
    {"name": "Méthodes douces (Slow Coffee)", "category_id": 2},
    {"name": "Entretien du matériel de bar", "category_id": 2},
    {"name": "Connaissance des terroirs caféiers", "category_id": 2}
]

def main():
    print("--- Authentification en cours... ---")
    try:
        response = requests.post(LOGIN_URL, json=login_data)
        response.raise_for_status()

        auth_response = response.json()
        print(auth_response)
        token = auth_response.get('access_token') or auth_response.get('accessToken')

        if not token:
            print("Erreur : Aucun token reçu dans la réponse.")
            return

        print(f"Connexion réussie. Token récupéré.")

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        print("\n--- Création des compétences ---")
        for skill in skills_to_create:
            res = requests.post(CREATE_SKILL_URL, json=skill, headers=headers)
            if res.status_code == 201 or res.status_code == 200:
                print(f"[SUCCÈS] Compétence créée : {skill['name']} (Catégorie {skill['category_id']})")
            else:
                print(f"[ERREUR] Impossible de créer {skill['name']} : {res.text}")

    except requests.exceptions.RequestException as e:
        print(f"Erreur de connexion : {e}")

if __name__ == "__main__":
    main()
