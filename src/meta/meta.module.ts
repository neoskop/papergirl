import { Module } from '@nestjs/common';
import { MetaService } from './meta.service';

@Module({
  providers: [MetaService],
  exports: [MetaService],
})
export class MetaModule {}
