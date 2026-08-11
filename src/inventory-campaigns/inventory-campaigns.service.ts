import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryCampaignsRepository, InventoryCampaignWithRelations } from './inventory-campaigns.repository';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateInventoryCampaignDto } from './dto/create-inventory-campaign.dto';
import { UpdateInventoryCampaignDto } from './dto/update-inventory-campaign.dto';
import { QueryInventoryCampaignsDto } from './dto/query-inventory-campaigns.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class InventoryCampaignsService {
  constructor(
    private readonly repository: InventoryCampaignsRepository,
    private readonly warehousesService: WarehousesService,
  ) {}

  async findAll(companyId: string, query: QueryInventoryCampaignsDto): Promise<PaginatedResult<InventoryCampaignWithRelations>> {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<InventoryCampaignWithRelations> {
    const campaign = await this.repository.findById(id, companyId);
    if (!campaign) throw new NotFoundException('Campagne d\'inventaire introuvable');
    return campaign;
  }

  private async generateRef(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repository.countThisYear(companyId, year);
    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateInventoryCampaignDto): Promise<InventoryCampaignWithRelations> {
    await this.warehousesService.findById(dto.warehouseId, companyId);
    const ref = await this.generateRef(companyId);

    return this.repository.create({
      company: { connect: { id: companyId } },
      warehouse: { connect: { id: dto.warehouseId } },
      ref,
      type: dto.type,
      status: dto.status ?? 'Planifié',
      articlesCount: dto.articlesCount ?? 0,
      countedCount: dto.countedCount ?? 0,
      ecartsCount: dto.ecartsCount ?? 0,
      responsable: dto.responsable,
      scheduledDate: new Date(dto.scheduledDate),
      ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
    });
  }

  async update(id: string, companyId: string, dto: UpdateInventoryCampaignDto): Promise<InventoryCampaignWithRelations> {
    await this.findById(id, companyId);

    if (dto.warehouseId) {
      await this.warehousesService.findById(dto.warehouseId, companyId);
    }

    const { warehouseId, scheduledDate, ...rest } = dto;
    return this.repository.update(id, {
      ...rest,
      ...(warehouseId ? { warehouse: { connect: { id: warehouseId } } } : {}),
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) } : {}),
    });
  }

  async remove(id: string, companyId: string): Promise<{ id: string }> {
    await this.findById(id, companyId);
    await this.repository.delete(id);
    return { id };
  }
}
