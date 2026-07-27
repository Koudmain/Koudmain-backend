# Documentation du Module PDF (`src/modules/pdf`)

Ce module permet la génération dynamique de documents PDF à partir de templates HTML / Handlebars (`.hbs`) rendus par **Puppeteer**.

---

## Structure du Module

```text
src/modules/pdf/
├── controllers/
│   └── pdf.controller.ts    # Points d'entrée API (POST /pdf/generate/:template)
├── dtos/
│   ├── cddu-data.dto.ts     # DTO de validation pour le contrat CDDU
│   └── invoice-data.dto.ts  # DTO de validation pour la facture
├── services/
│   └── pdf.service.ts       # Service de compilation Handlebars & rendu Puppeteer
├── templates/
│   ├── cddu.hbs             # Template Handlebars CDDU
│   └── invoice.hbs          # Template Handlebars Facture
└── README.md
```

---

## 1. Anatomie et Création d'un Template (`.hbs`)

Les templates sont placés dans le dossier [src/modules/pdf/templates].
Ils combinent du HTML5 standard, du CSS d'impression et la syntaxe **Handlebars**.

### A. Structure HTML et Styles CSS
Un template doit être un document HTML complet. Pour un rendu optimal lors de la conversion en PDF via Puppeteer :

- **Encodage UTF-8** : Obligatoire pour garantir le bon affichage des caractères accentués (`<meta charset="UTF-8" />`).
- **Directive `@page`** : Permet de définir le format (A4) et les marges d'impression du document.
- **CSS Standard** : Puppeteer prend en charge le CSS moderne (`flexbox`, `grid`, `tables`, etc.).

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Titre du Document - {{nomVariable}}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 30px;
      color: #1e293b;
      font-size: 10pt;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 15px;
    }
  </style>
</head>
<body>
  <!-- Contenu du document -->
</body>
</html>
```

### B. Balises et Syntaxe Handlebars

| Syntaxe / Balise | Description | Exemple |
| :--- | :--- | :--- |
| `{{variable}}` | Affiche une variable simple | `<div>Ref : {{contractRef}}</div>` |
| `{{objet.propriete}}` | Accède à une propriété d'objet imbriqué | `<div>Client : {{client.name}}</div>` |
| `{{#if condition}}...{{/if}}` | Affiche le bloc si la valeur est vraie / définie | `{{#if client.siret}}<div>SIRET : {{client.siret}}</div>{{/if}}` |
| `{{#unless condition}}...{{/unless}}` | Affiche le bloc si la valeur est fausse / indéfinie | `{{#unless estPaye}}<span>En attente</span>{{/unless}}` |
| `{{#each tableau}}...{{/each}}` | Boucle sur un tableau | `{{#each items}}<tr><td>{{this.description}}</td></tr>{{/each}}` |
| `{{this.propriete}}` | Accède à la propriété de l'élément courant dans une boucle | `<td>{{this.unitPriceHt}} €</td>` |

---

## 2. Comment Ajouter un Nouveau Type de Document

Pour ajouter un nouveau type de document (par exemple une attestation `certificate`), suivez ces **3 étapes** :

### Étape 1 : Créer le DTO de Validation
Créez une classe DTO dans [src/modules/pdf/dtos] (ex: `certificate-data.dto.ts`) avec des décorateurs `class-validator` :

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class CertificateDataDto {
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @IsString()
  @IsNotEmpty()
  issueDate: string;
}
```

### Étape 2 : Créer le Template Handlebars (`.hbs`)
Créez le template dans [src/modules/pdf/templates](file:///home/yayamgt/Documents/delivery/Koudmain/Koudmain-backend/src/modules/pdf/templates) (ex: `certificate.hbs`).

**Important** : Le nom du fichier en minuscules sans extension (ici `certificate`) correspond au nom de template utilisé dans l'API.

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Attestation</title>
</head>
<body>
  <h1>Attestation pour {{recipientName}}</h1>
  <p>Délivrée le {{issueDate}}</p>
</body>
</html>
```

### Étape 3 : Enregistrer le DTO dans le Controller
Déclarez le nouveau mapping dans la constante `TEMPLATE_DTO_MAP` du fichier [pdf.controller.ts](file:///home/yayamgt/Documents/delivery/Koudmain/Koudmain-backend/src/modules/pdf/controllers/pdf.controller.ts) :

```typescript
import { CertificateDataDto } from '@/modules/pdf/dtos/certificate-data.dto';

const TEMPLATE_DTO_MAP: Record<string, ClassConstructor<object>> = {
  cddu: CdduContractDataDto,
  invoice: InvoiceDataDto,
  certificate: CertificateDataDto, // <-- Ajouter le nouveau mapping ici
};
```

---

## 3. Utilisation de l'API

Une fois enregistré, le nouveau template est immédiatement utilisable via l'endpoint générique du controller :

### `POST /pdf/generate/:template`

Exemple de requête POST pour le template `certificate` :

```http
POST /pdf/generate/certificate
Content-Type: application/json

{
  "recipientName": "Alice Dupont",
  "issueDate": "27/07/2026"
}
```

Le serveur validera les données reçues selon le DTO associé (`CertificateDataDto`), compilera le template `certificate.hbs`, et renverra le flux PDF en retour (`Content-Type: application/pdf`).
