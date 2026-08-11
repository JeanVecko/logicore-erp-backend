import { PartialType } from '@nestjs/swagger';
import { CreateInventoryCampaignDto } from './create-inventory-campaign.dto';

export class UpdateInventoryCampaignDto extends PartialType(CreateInventoryCampaignDto) {}
