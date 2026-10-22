import { describe, expect, it } from 'vitest';
import { computeGaps } from './computeGaps';

describe('computeGaps', () => {
  it('keeps undeclared ids in the incoming order', () => {
    const topSkills = [{ skill_id: 'surface_codes' }, { skill_id: 'qiskit' }];
    expect(computeGaps(topSkills, ['pennylane'])).toEqual(['surface_codes', 'qiskit']);
  });

  it('removes declared ids', () => {
    const topSkills = [{ skill_id: 'surface_codes' }, { skill_id: 'qiskit' }];
    expect(computeGaps(topSkills, ['qiskit'])).toEqual(['surface_codes']);
  });

  it('drops duplicate top-skill ids defensively', () => {
    const topSkills = [{ skill_id: 'qiskit' }, { skill_id: 'qiskit' }, { skill_id: 'cirq' }];
    expect(computeGaps(topSkills, [])).toEqual(['qiskit', 'cirq']);
  });

  it('respects the limit (default 20)', () => {
    const topSkills = Array.from({ length: 25 }, (_, i) => ({ skill_id: `s_${i}` }));
    expect(computeGaps(topSkills, [])).toHaveLength(20);
    expect(computeGaps(topSkills, [], 3)).toEqual(['s_0', 's_1', 's_2']);
  });

  it('handles empty inputs', () => {
    expect(computeGaps([], ['qiskit'])).toEqual([]);
    expect(computeGaps([{ skill_id: 'qiskit' }], [])).toEqual(['qiskit']);
    expect(computeGaps([], [])).toEqual([]);
  });
});
