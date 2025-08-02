import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiDoc, CommonErrorResponses } from '../common.docs';
import { ResGetConfigDto, ResGetDataDto } from './app.dto';

export const AppControllerDocs = () => applyDecorators(ApiTags('App'));

export const GetDataDocs = () =>
  ApiDoc<ResGetDataDto>({
    summary: '기본 데이터 조회',
    description: '애플리케이션의 기본 데이터를 반환합니다.',
    successResponseType: ResGetDataDto,
    successDescription: '성공적으로 데이터를 조회했습니다.',
    errorResponses: [CommonErrorResponses.ServerError],
  });

export const GetConfigDocs = () =>
  ApiDoc<ResGetConfigDto>({
    summary: '공개 설정 조회',
    description: '애플리케이션의 공개 설정 정보를 반환합니다.',
    successResponseType: ResGetConfigDto,
    successDescription: '성공적으로 설정을 조회했습니다.',
    errorResponses: [CommonErrorResponses.ServerError],
  });
