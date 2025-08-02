import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { PublicConfigInterface } from '../../config';

@Exclude()
export class ConfigAppServiceDto {
  @Expose()
  @ApiProperty({ description: '서비스 포트', example: 3000 })
  @IsNumber()
  port: number;

  @Expose()
  @ApiProperty({ description: '서비스 URL', example: 'localhost' })
  @IsString()
  url: string;
}

@Exclude()
export class ConfigServiceDto {
  @Expose()
  @ApiProperty({
    description: '웹 서비스 설정',
    type: ConfigAppServiceDto,
  })
  web: ConfigAppServiceDto;

  @Expose()
  @ApiProperty({
    description: '모바일 서비스 설정',
    type: ConfigAppServiceDto,
  })
  mobile: ConfigAppServiceDto;

  @Expose()
  @ApiProperty({
    description: '데스크톱 서비스 설정',
    type: ConfigAppServiceDto,
  })
  desktop: ConfigAppServiceDto;

  @Expose()
  @ApiProperty({
    description: 'API 서비스 설정',
    type: ConfigAppServiceDto,
  })
  api: ConfigAppServiceDto;
}

@Exclude()
export class ResGetConfigDto implements PublicConfigInterface {
  @ApiProperty({
    description: '서비스 설정 정보',
    type: ConfigServiceDto,
  })
  service: ConfigServiceDto;

  constructor(dto: ResGetConfigDto) {
    Object.assign(this, dto);
  }
}

@Exclude()
export class ResGetDataDto {
  @Expose()
  @ApiProperty({
    description: '응답 메시지',
    example: 'Hello API',
  })
  @IsString()
  message: string;

  constructor(dto: ResGetDataDto) {
    Object.assign(this, dto);
  }
}
