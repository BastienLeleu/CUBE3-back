import { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(data: number | null): string | null {
    return data === null || data === undefined ? null : data.toString();
  }

  from(data: string | null): number | null {
    return data === null || data === undefined ? null : Number(data);
  }
}
