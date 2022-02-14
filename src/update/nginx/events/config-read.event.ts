import { Meta } from '../../../meta/interfaces/meta.interface';

export class ConfigReadEvent {
  constructor(public readonly meta: Meta, public readonly rootPath: string) {}
}
