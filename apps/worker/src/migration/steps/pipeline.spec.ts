import { MIGRATION_STEPS } from '@crossvisor/contracts';
import { PIPELINE } from './index.js';

describe('PIPELINE', () => {
  it('sigue el mismo orden que MIGRATION_STEPS (la reanudación depende de ello)', () => {
    expect(PIPELINE.map((s) => s.name)).toEqual([...MIGRATION_STEPS]);
  });
});
