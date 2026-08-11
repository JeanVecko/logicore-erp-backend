import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const maintenanceRecordWithRelations = Prisma.validator<Prisma.MaintenanceRecordInclude>()({
  vehicle: true,
  asset: true,
});
export type MaintenanceRecordWithRelations = Prisma.MaintenanceRecordGetPayload<{
  include: typeof maintenanceRecordWithRelations;
}>;

@Injectable()
export class MaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.MaintenanceRecordWhereInput, skip = 0, take = 20): Promise<MaintenanceRecordWithRelations[]> {
    return this.prisma.maintenanceRecord.findMany({
      where,
      skip,
      take,
      include: maintenanceRecordWithRelations,
      orderBy: { scheduledDate: 'desc' },
    });
  }

  count(where: Prisma.MaintenanceRecordWhereInput): Promise<number> {
    return this.prisma.maintenanceRecord.count({ where });
  }

  findById(id: string, companyId: string): Promise<MaintenanceRecordWithRelations | null> {
    return this.prisma.maintenanceRecord.findFirst({ where: { id, companyId }, include: maintenanceRecordWithRelations });
  }

  create(data: Prisma.MaintenanceRecordCreateInput): Promise<MaintenanceRecordWithRelations> {
    return this.prisma.maintenanceRecord.create({ data, include: maintenanceRecordWithRelations });
  }

  update(id: string, data: Prisma.MaintenanceRecordUpdateInput): Promise<MaintenanceRecordWithRelations> {
    return this.prisma.maintenanceRecord.update({ where: { id }, data, include: maintenanceRecordWithRelations });
  }

  deactivate(id: string): Promise<MaintenanceRecordWithRelations> {
    return this.prisma.maintenanceRecord.update({
      where: { id },
      data: { isActive: false },
      include: maintenanceRecordWithRelations,
    });
  }
}
