import { Meta } from '../../../meta/interfaces/meta.interface.js';

export class ConfigReadEvent {
  constructor(public readonly meta: Meta, public readonly rootPath: string) {}
}
