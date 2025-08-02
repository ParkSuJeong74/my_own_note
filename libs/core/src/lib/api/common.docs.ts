import { applyDecorators, Type } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiResponseOptions, ApiTags } from '@nestjs/swagger';

interface ApiDocOptions<T = any> {
  summary: string;
  description?: string;
  successResponseType?: Type<T>;
  successDescription?: string;
  errorResponses?: ApiResponseOptions[];
  tags?: string[];
}

export const ApiDoc = <T = any>(options: ApiDocOptions<T>) => {
  const decorators = [];

  if (options.tags) {
    decorators.push(ApiTags(...options.tags));
  }

  decorators.push(
    ApiOperation({
      summary: options.summary,
      description: options.description,
    })
  );

  if (options.successResponseType) {
    decorators.push(
      ApiResponse({
        status: 200,
        description: options.successDescription || '성공',
        type: options.successResponseType,
      })
    );
  }

  if (options.errorResponses) {
    options.errorResponses.forEach(response => {
      decorators.push(ApiResponse(response));
    });
  }

  return applyDecorators(...decorators);
};

export const CommonErrorResponses = {
  ServerError: {
    status: 500,
    description: '서버 오류가 발생했습니다.',
  },
  NotFound: {
    status: 404,
    description: '요청한 리소스를 찾을 수 없습니다.',
  },
  BadRequest: {
    status: 400,
    description: '잘못된 요청입니다.',
  },
} as const;
