export class NginxConfigFile {
  private readonly lines: string[] = [];

  constructor(public readonly configFilePath: string) {}

  addLines(...lines: string[]) {
    this.lines.push(...lines);
  }

  public getData(): string {
    return this.lines.join('\n');
  }
}
