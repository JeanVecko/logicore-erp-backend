import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const CUID_REGEX = /^c[a-z0-9]{20,}$/i;

/** Valide qu'un paramètre de route est un identifiant Prisma (cuid) plausible. */
@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || !CUID_REGEX.test(value)) {
      throw new BadRequestException(`Paramètre "${metadata.data}" invalide : identifiant attendu.`);
    }
    return value;
  }
}
