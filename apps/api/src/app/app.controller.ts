import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('기본')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: '기본 상태 확인', 
    description: '애플리케이션의 기본 상태와 메시지를 반환합니다.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '성공적으로 메시지를 반환했습니다.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Hello API'
        }
      }
    }
  })
  getData() {
    return this.appService.getData();
  }
}
