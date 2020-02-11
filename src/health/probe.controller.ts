import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express-serve-static-core';
import { ReadinessService } from './readiness.service';

@Controller('probe')
export class ProbeController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get('readiness')
  public async readiness(@Res() res: Response) {
    const isReady = this.readinessService.isReady();
    res
      .status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({ status: `${isReady ? '' : 'un'}ready` });
  }

  @Get('liveness')
  public liveness() {
    return { status: 'ok' };
  }
}
