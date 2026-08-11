import { PartialType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';

/** Un devis n'est modifiable que tant qu'il est DRAFT ou SENT (contrôlé côté service). */
export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}
