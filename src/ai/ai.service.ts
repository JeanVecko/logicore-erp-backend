import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ChatMessageDto } from './dto/chat-message.dto';

interface StockContext {
  companyName: string;
  warehouseCount: number;
  productCount: number;
  alerts: Array<{ product: string; sku: string; warehouse: string; quantity: number; reorderPoint: number; status: string }>;
}

const STOCK_KEYWORDS = ['stock', 'rupture', 'dépôt', 'depot', 'entrepôt', 'entrepot', 'article', 'réappro', 'reappro', 'quantité', 'quantite', 'inventaire'];
const DOCUMENT_KEYWORDS = ['rédige', 'redige', 'rédiger', 'rediger', 'document', 'lettre', 'courrier', 'rapport', 'compte-rendu', 'modèle', 'modele', 'écrire', 'ecrire'];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {
    const apiKey = this.config.get<string>('ai.anthropicApiKey');
    this.model = this.config.get<string>('ai.model') as string;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async chat(companyId: string, dto: ChatMessageDto): Promise<{ reply: string; grounded: boolean }> {
    const context = await this.buildStockContext(companyId);
    const reply = await this.generateReply(dto, context);
    return { reply, grounded: Boolean(this.client) };
  }

  private async buildStockContext(companyId: string): Promise<StockContext> {
    const [company, warehouseCount, productCount, alerts] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
      this.prisma.warehouse.count({ where: { companyId, isActive: true } }),
      this.prisma.product.count({ where: { companyId, isActive: true } }),
      this.inventoryService.getAlerts(companyId),
    ]);

    return {
      companyName: company?.name ?? 'votre entreprise',
      warehouseCount,
      productCount,
      alerts: alerts.slice(0, 8).map((a) => ({
        product: a.product.name,
        sku: a.product.sku,
        warehouse: a.warehouse.name,
        quantity: a.quantity,
        reorderPoint: a.product.reorderPoint,
        status: a.status,
      })),
    };
  }

  private buildSystemPrompt(context: StockContext): string {
    const alertLines = context.alerts.length
      ? context.alerts
          .map((a) => `- ${a.product} (${a.sku}) — ${a.warehouse} : ${a.quantity} en stock, seuil ${a.reorderPoint}, statut ${a.status}`)
          .join('\n')
      : "Aucun article sous le seuil de réapprovisionnement actuellement.";

    return [
      `Tu es l'assistant intégré à SNADARPE ERP pour l'entreprise "${context.companyName}".`,
      `Tu réponds en français, de façon concise et professionnelle.`,
      `Tu peux répondre à des questions sur l'état des stocks/dépôts en t'appuyant sur les données ci-dessous, et aider à rédiger des documents (courriers, rapports, comptes-rendus).`,
      `Ne fabrique pas de données chiffrées qui ne figurent pas dans le contexte fourni.`,
      ``,
      `Contexte actuel :`,
      `- ${context.productCount} article(s) actif(s) répartis sur ${context.warehouseCount} dépôt(s)`,
      `- Alertes de stock (sous le seuil de réapprovisionnement) :`,
      alertLines,
    ].join('\n');
  }

  private async generateReply(dto: ChatMessageDto, context: StockContext): Promise<string> {
    if (this.client) {
      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 1024,
          system: this.buildSystemPrompt(context),
          messages: [...(dto.history ?? []), { role: 'user' as const, content: dto.message }],
        });
        const textBlock = response.content.find((block) => block.type === 'text');
        return textBlock && 'text' in textBlock ? textBlock.text : "Je n'ai pas pu générer de réponse.";
      } catch (error) {
        this.logger.error(`Échec de l'appel à l'API Anthropic : ${(error as Error).message}`);
        return "Le moteur IA est momentanément indisponible. Merci de réessayer dans un instant.";
      }
    }

    // Pas de clé API configurée : réponse simulée, mais construite à partir des vraies données
    // de l'entreprise pour la question stock/dépôts — démontre le circuit complet en attendant
    // ANTHROPIC_API_KEY (voir src/config/configuration.ts).
    return this.buildMockReply(dto.message, context);
  }

  private buildMockReply(message: string, context: StockContext): string {
    const lower = message.toLowerCase();
    const isStockQuestion = STOCK_KEYWORDS.some((k) => lower.includes(k));
    const isDocumentRequest = DOCUMENT_KEYWORDS.some((k) => lower.includes(k));

    if (isStockQuestion) {
      if (context.alerts.length === 0) {
        return (
          `D'après les données actuelles, aucun article n'est sous son seuil de réapprovisionnement ` +
          `(${context.productCount} article(s) actif(s) sur ${context.warehouseCount} dépôt(s)).`
        );
      }
      const lines = context.alerts
        .map((a) => `• ${a.product} — ${a.warehouse} : ${a.quantity} en stock (seuil ${a.reorderPoint}) — ${a.status === 'rupture' ? 'rupture' : 'stock bas'}`)
        .join('\n');
      return `Voici les articles à surveiller sur ${context.warehouseCount} dépôt(s) :\n\n${lines}`;
    }

    if (isDocumentRequest) {
      return (
        `Je peux vous aider à structurer ce document. En attendant la connexion du moteur IA ` +
        `(clé ANTHROPIC_API_KEY à ajouter côté serveur), voici un plan de base à adapter :\n\n` +
        `1. Objet\n2. Contexte\n3. Détails / demande\n4. Conclusion et signature`
      );
    }

    return (
      `Je suis l'assistant de ${context.companyName}, en cours de configuration. ` +
      `Une fois la clé API Anthropic renseignée côté serveur, je pourrai répondre plus précisément ` +
      `à vos questions sur l'activité de l'entreprise et vous aider à rédiger vos documents.`
    );
  }
}
