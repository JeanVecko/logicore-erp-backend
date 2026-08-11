import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export const CHAT_ROLES = ['user', 'assistant'] as const;

export class ChatHistoryMessageDto {
  @ApiProperty({ enum: CHAT_ROLES })
  @IsIn(CHAT_ROLES)
  role: (typeof CHAT_ROLES)[number];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatMessageDto {
  @ApiProperty({ example: 'Quels articles sont en rupture de stock ?' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ type: [ChatHistoryMessageDto], description: 'Tours précédents de la conversation, les plus anciens en premier' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  history?: ChatHistoryMessageDto[];
}
