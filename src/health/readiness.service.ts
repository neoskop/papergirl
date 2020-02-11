import { Injectable } from '@nestjs/common';

@Injectable()
export class ReadinessService {
  public ready = false;

  public setReady() {
    this.ready = true;
  }

  public async isReady(): Promise<boolean> {
    return this.ready;
  }
}
