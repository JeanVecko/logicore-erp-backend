import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Permissions('ai:create')
  @ApiOperation({ summary: "Envoie un message à l'assistant IA (contexte stock/dépôts de l'entreprise)" })
  chat(@Body() dto: ChatMessageDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.chat(user.companyId, dto);
  }
}
