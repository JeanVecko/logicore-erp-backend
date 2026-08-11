import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FleetRepository, VehicleWithWarehouse } from './fleet.repository';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class FleetService {
  constructor(private readonly repository: FleetRepository) {}

  async findAll(companyId: string, query: QueryVehiclesDto): Promise<PaginatedResult<VehicleWithWarehouse>> {
    const where = {
      companyId,
      isActive: true,
      ...(query.status ? { status: query.status } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search
        ? { OR: [{ plate: { contains: query.search } }, { driverName: { contains: query.search } }] }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<VehicleWithWarehouse> {
    const vehicle = await this.repository.findById(id, companyId);
    if (!vehicle) {
      throw new NotFoundException('Véhicule introuvable');
    }
    return vehicle;
  }

  async create(companyId: string, dto: CreateVehicleDto): Promise<VehicleWithWarehouse> {
    const existing = await this.repository.findByPlate(dto.plate, companyId);
    if (existing) {
      throw new ConflictException(`Un véhicule immatriculé "${dto.plate}" existe déjà dans votre entreprise`);
    }
    const { warehouseId, insuranceExpiry, ...rest } = dto;
    return this.repository.create({
      ...rest,
      ...(insuranceExpiry ? { insuranceExpiry: new Date(insuranceExpiry) } : {}),
      company: { connect: { id: companyId } },
      ...(warehouseId ? { warehouse: { connect: { id: warehouseId } } } : {}),
    });
  }

  async update(id: string, companyId: string, dto: UpdateVehicleDto): Promise<VehicleWithWarehouse> {
    await this.findById(id, companyId);

    if (dto.plate) {
      const existing = await this.repository.findByPlate(dto.plate, companyId);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Un véhicule immatriculé "${dto.plate}" existe déjà dans votre entreprise`);
      }
    }

    const { warehouseId, insuranceExpiry, ...rest } = dto;
    return this.repository.update(id, {
      ...rest,
      ...(insuranceExpiry !== undefined ? { insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null } : {}),
      ...(warehouseId !== undefined
        ? { warehouse: warehouseId ? { connect: { id: warehouseId } } : { disconnect: true } }
        : {}),
    });
  }

  async deactivate(id: string, companyId: string): Promise<VehicleWithWarehouse> {
    await this.findById(id, companyId);
    return this.repository.deactivate(id);
  }
}
