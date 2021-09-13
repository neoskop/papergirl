import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '../../config/config.module';
import { UpdateModule } from '../update.module';
import { S3Service } from './s3.service';

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
