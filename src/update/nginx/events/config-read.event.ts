import { Meta } from '../../../meta/meta.interface';

export class ConfigReadEvent {
  constructor(public readonly meta: Meta, public readonly rootPath: string) {}
}
