import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import puppeteer, { Browser } from 'puppeteer';
import { CdduContractData } from '@/modules/pdf/dtos/cddu-data.dto';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
    return this.browserPromise;
  }

  async onModuleDestroy() {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
    }
  }

  compileTemplate(templateName: string, data: Record<string, unknown> | object): string {
    const templatePath = path.resolve(__dirname, '../templates', `${templateName}.hbs`);

    const altTemplatePath = path.resolve(
      process.cwd(),
      'src/modules/pdf/templates',
      `${templateName}.hbs`,
    );

    const filePath = fs.existsSync(templatePath) ? templatePath : altTemplatePath;

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Template Handlebars introuvable : ${templateName} (cherché dans ${filePath})`,
      );
    }

    const templateSource = fs.readFileSync(filePath, 'utf8');
    const compiledTemplate = handlebars.compile(templateSource);
    return compiledTemplate(data);
  }

  async generatePdfFromHtml(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfUint8Array = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm',
        },
      });

      return Buffer.from(pdfUint8Array);
    } catch (error) {
      this.logger.error('Erreur lors de la génération du PDF avec Puppeteer', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  getAvailableTemplates(): string[] {
    const templatesDir = path.resolve(__dirname, '../templates');
    const altTemplatesDir = path.resolve(process.cwd(), 'src/modules/pdf/templates');
    const targetDir = fs.existsSync(templatesDir) ? templatesDir : altTemplatesDir;

    if (!fs.existsSync(targetDir)) return [];
    return fs
      .readdirSync(targetDir)
      .filter((file) => file.endsWith('.hbs'))
      .map((file) => file.replace('.hbs', ''));
  }

  templateExists(templateName: string): boolean {
    return this.getAvailableTemplates().includes(templateName.toLowerCase());
  }

  async generatePdfFromTemplate(
    templateName: string,
    data: Record<string, unknown> | object,
  ): Promise<Buffer> {
    const html = this.compileTemplate(templateName, data);
    return this.generatePdfFromHtml(html);
  }

  async generateCddu(data: CdduContractData): Promise<Buffer> {
    return this.generatePdfFromTemplate('cddu', data);
  }
}
