import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Façade de la couche persistance : les modules métier importent DatabaseModule
 * plutôt que PrismaModule directement, pour ne pas coupler tout le code à Prisma.
 */
@Global()
@Module({
  imports: [PrismaModule],
  exports: [PrismaModule],
})
export class DatabaseModule {}
