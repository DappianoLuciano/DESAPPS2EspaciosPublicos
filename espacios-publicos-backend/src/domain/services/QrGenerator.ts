export interface QrGenerator {
  generate(data: string): Promise<string>;
}
