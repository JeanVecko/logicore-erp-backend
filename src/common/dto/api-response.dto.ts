import { ApiProperty } from '@nestjs/swagger';

/** Enveloppe standard des réponses succès — posée par le TransformInterceptor. */
export class ApiResponseDto<T> {
  @ApiProperty({ default: true })
  success: boolean;

  data: T;

  @ApiProperty()
  timestamp: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ default: false })
  success: boolean;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string | string[];

  @ApiProperty()
  path: string;

  @ApiProperty()
  timestamp: string;
}
