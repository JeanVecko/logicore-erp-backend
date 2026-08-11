import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceRepository, MaintenanceRecordWithRelations } from './maintenance.repository';
import { FleetRepository } from '../fleet/fleet.repository';
import { AssetsRepository } from '../assets/assets.repository';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { QueryMaintenanceRecordsDto } from './dto/query-maintenance-records.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly repository: MaintenanceRepository,
    private readonly fleetRepository: FleetRepository,
    private readonly assetsRepository: AssetsRepository,
  ) {}

  async findAll(companyId: string, query: QueryMaintenanceRecordsDto): Promise<PaginatedResult<MaintenanceRecordWithRelations>> {
    const where = {
      companyId,
      isActive: true,
      ...(query.status ? { status: query.status } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.search ? { description: { contains: query.search } } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<MaintenanceRecordWithRelations> {
    const record = await this.repository.findById(id, companyId);
    if (!record) {
      throw new NotFoundException('Intervention introuvable');
    }
    return record;
  }

  async create(companyId: string, dto: CreateMaintenanceRecordDto): Promise<MaintenanceRecordWithRelations> {
    await this.assertExactlyOneTarget(companyId, dto.vehicleId, dto.assetId);

    const { vehicleId, assetId, scheduledDate, completedDate, ...rest } = dto;
    return this.repository.create({
      ...rest,
      scheduledDate: new Date(scheduledDate),
      ...(completedDate ? { completedDate: new Date(completedDate) } : {}),
      company: { connect: { id: companyId } },
      ...(vehicleId ? { vehicle: { connect: { id: vehicleId } } } : {}),
      ...(assetId ? { asset: { connect: { id: assetId } } } : {}),
    });
  }

  async update(id: string, companyId: string, dto: UpdateMaintenanceRecordDto): Promise<MaintenanceRecordWithRelations> {
    await this.findById(id, companyId);

    // Le véhicule/équipement ciblé est fixé à la création et ne se réaffecte pas via une mise à jour.
    const { vehicleId, assetId, scheduledDate, completedDate, ...rest } = dto;
    return this.repository.update(id, {
      ...rest,
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) } : {}),
      ...(completedDate !== undefined ? { completedDate: completedDate ? new Date(completedDate) : null } : {}),
    });
  }

  async deactivate(id: string, companyId: string): Promise<MaintenanceRecordWithRelations> {
    await this.findById(id, companyId);
    return this.repository.deactivate(id);
  }

  private async assertExactlyOneTarget(companyId: string, vehicleId?: string, assetId?: string): Promise<void> {
    if (Boolean(vehicleId) === Boolean(assetId)) {
      throw new BadRequestException('Une intervention doit cibler exactement un véhicule OU un équipement');
    }
    if (vehicleId) {
      const vehicle = await this.fleetRepository.findById(vehicleId, companyId);
      if (!vehicle) throw new NotFoundException('Véhicule introuvable dans votre entreprise');
    }
    if (assetId) {
      const asset = await this.assetsRepository.findById(assetId, companyId);
      if (!asset) throw new NotFoundException('Équipement introuvable dans votre entreprise');
    }
  }
}
