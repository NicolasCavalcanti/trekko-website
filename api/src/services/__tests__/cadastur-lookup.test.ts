import { cadasturLookupService } from '../cadastur-lookup';

describe('cadasturLookupService.validate', () => {
  beforeAll(async () => {
    await cadasturLookupService.refresh();
  });

  it('validates exact matches for existing records', async () => {
    const result = await cadasturLookupService.validate('Julieli Ferrari dos Santos', '21467985879');

    expect(result.valid).toBe(true);
    expect(result.numberExists).toBe(true);
    expect(result.exactMatch).toBe(true);
    expect(result.matchedName).toBe('JULIELI FERRARI DOS SANTOS');
  });

  it('normalizes casing when searching', async () => {
    const result = await cadasturLookupService.validate('JULIELI FERRARI DOS SANTOS', '21467985879');

    expect(result.valid).toBe(true);
    expect(result.exactMatch).toBe(true);
  });

  it('accepts partial matches when particles are missing', async () => {
    const result = await cadasturLookupService.validate('Julieli Ferrari Santos', '21467985879');

    expect(result.valid).toBe(true);
    expect(result.exactMatch).toBe(false);
    expect(result.matchedName).toBe('JULIELI FERRARI DOS SANTOS');
  });

  it('flags when number does not exist', async () => {
    const result = await cadasturLookupService.validate('Nome Qualquer', '00000000000');

    expect(result.valid).toBe(false);
    expect(result.numberExists).toBe(false);
  });

  it('flags when number format is invalid', async () => {
    const result = await cadasturLookupService.validate('Nome Qualquer', '123');

    expect(result.valid).toBe(false);
    expect(result.numberExists).toBe(false);
  });
});
