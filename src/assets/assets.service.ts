import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetsRepository, AssetWithWarehouse } from './assets.repository';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class AssetsService {
  constructor(private readonly repository: AssetsRepository) {}

  async findAll(companyId: string, query: QueryAssetsDto): Promise<PaginatedResult<AssetWithWarehouse>> {
    const where = {
      companyId,
      isActive: true,
      ...(query.status ? { status: query.status } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search } }, { serialNumber: { contains: query.search } }] }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<AssetWithWarehouse> {
    const asset = await this.repository.findById(id, companyId);
    if (!asset) {
      throw new NotFoundException('Équipement introuvable');
    }
    return asset;
  }

  async create(companyId: string, dto: CreateAssetDto): Promise<AssetWithWarehouse> {
    if (dto.serialNumber) {
      const existing = await this.repository.findBySerialNumber(dto.serialNumber, companyId);
      if (existing) {
        throw new ConflictException(`Un équipement avec le numéro de série "${dto.serialNumber}" existe déjà dans votre entreprise`);
      }
    }
    const { warehouseId, acquisitionDate, ...rest } = dto;
    return this.repository.create({
      ...rest,
      ...(acquisitionDate ? { acquisitionDate: new Date(acquisitionDate) } : {}),
      company: { connect: { id: companyId } },
      ...(warehouseId ? { warehouse: { connect: { id: warehouseId } } } : {}),
    });
  }

  async update(id: string, companyId: string, dto: UpdateAssetDto): Promise<AssetWithWarehouse> {
    await this.findById(id, companyId);

    if (dto.serialNumber) {
      const existing = await this.repository.findBySerialNumber(dto.serialNumber, companyId);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Un équipement avec le numéro de série "${dto.serialNumber}" existe déjà dans votre entreprise`);
      }
    }

    const { warehouseId, acquisitionDate, ...rest } = dto;
    return this.repository.update(id, {
      ...rest,
      ...(acquisitionDate !== undefined ? { acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null } : {}),
      ...(warehouseId !== undefined
        ? { warehouse: warehouseId ? { connect: { id: warehouseId } } : { disconnect: true } }
        : {}),
    });
  }

  async deactivate(id: string, companyId: string): Promise<AssetWithWarehouse> {
    await this.findById(id, companyId);
    return this.repository.deactivate(id);
  }
}
