import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '../../config/config.module';
import { UpdateModule } from '../update.module';
import { NginxService } from './nginx.service';

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
