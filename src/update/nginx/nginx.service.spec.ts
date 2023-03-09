import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '../../config/config.module.js';
import { UpdateModule } from '../update.module.js';
import { NginxService } from './nginx.service.js';

describe('NginxService', () => {
  let service: NginxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NginxService],
      imports: [ConfigModule, UpdateModule],
    }).compile();

    service = module.get<NginxService>(NginxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
