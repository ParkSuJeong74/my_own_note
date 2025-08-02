import { ResGetDataDto } from '@my_own_note/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData(): { message: string } {
    return new ResGetDataDto({ message: 'Hello API' });
  }
}
