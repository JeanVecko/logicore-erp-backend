import { Injectable } from '@nestjs/common';
import { Prisma, Vehicle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const vehicleWithWarehouse = Prisma.validator<Prisma.VehicleInclude>()({ warehouse: true });
export type VehicleWithWarehouse = Prisma.VehicleGetPayload<{ include: typeof vehicleWithWarehouse }>;

@Injectable()
export class FleetRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.VehicleWhereInput, skip = 0, take = 20): Promise<VehicleWithWarehouse[]> {
    return this.prisma.vehicle.findMany({ where, skip, take, include: vehicleWithWarehouse, orderBy: { plate: 'asc' } });
  }

  count(where: Prisma.VehicleWhereInput): Promise<number> {
    return this.prisma.vehicle.count({ where });
  }

  findById(id: string, companyId: string): Promise<VehicleWithWarehouse | null> {
    return this.prisma.vehicle.findFirst({ where: { id, companyId }, include: vehicleWithWarehouse });
  }

  findByPlate(plate: string, companyId: string): Promise<Vehicle | null> {
    return this.prisma.vehicle.findUnique({ where: { companyId_plate: { companyId, plate } } });
  }

  create(data: Prisma.VehicleCreateInput): Promise<VehicleWithWarehouse> {
    return this.prisma.vehicle.create({ data, include: vehicleWithWarehouse });
  }

  update(id: string, data: Prisma.VehicleUpdateInput): Promise<VehicleWithWarehouse> {
    return this.prisma.vehicle.update({ where: { id }, data, include: vehicleWithWarehouse });
  }

  deactivate(id: string): Promise<VehicleWithWarehouse> {
    return this.prisma.vehicle.update({ where: { id }, data: { isActive: false }, include: vehicleWithWarehouse });
  }
}
