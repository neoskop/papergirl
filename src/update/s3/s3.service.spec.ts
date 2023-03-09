import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '../../config/config.module.js';
import { UpdateModule } from '../update.module.js';
import { S3Service } from './s3.service.js';

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
      imports: [ConfigModule, UpdateModule],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
