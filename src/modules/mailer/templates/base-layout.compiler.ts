import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let layoutPath = join(__dirname, 'base-layout.html');

if (!existsSync(layoutPath)) {
  const fallbackPath = join(__dirname.replace(join('dist', 'src'), 'dist'), 'base-layout.html');
  if (existsSync(fallbackPath)) {
    layoutPath = fallbackPath;
  }
}

export interface EmailCompileOptions {
  /** Texte court visible dans l'aperçu de la boîte de réception */
  preheader?: string;
  /** Titre principal (ex: "Confirmez votre adresse email") */
  title: string;
  /** Texte d'introduction ou paragraphe d'accueil */
  leadText: string;
  /** Corps principal au format HTML (boutons, blocs spéciaux, textes) */
  contentHtml: string;
  /** Optionnel : texte d'avertissement dans une boîte rouge */
  warningText?: string;
  /** Signature de fin. Par défaut : "Cordialement,<br />L'équipe Koudmain" */
  signature?: string;
}

export function compileEmail(options: EmailCompileOptions): string {
  const layout = readFileSync(layoutPath, 'utf-8');

  const preheader = options.preheader || options.title;
  const signature = options.signature || 'Cordialement,<br />L’équipe Koudmain';
  const warningHtml = options.warningText
    ? `<div class="warning">${options.warningText}</div>`
    : '';

  return layout
    .replace(/\{\{preheader\}\}/g, preheader)
    .replace(/\{\{title\}\}/g, options.title)
    .replace(/\{\{leadText\}\}/g, options.leadText)
    .replace(/\{\{contentHtml\}\}/g, options.contentHtml)
    .replace(/\{\{warningHtml\}\}/g, warningHtml)
    .replace(/\{\{signature\}\}/g, signature)
    .replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
}
