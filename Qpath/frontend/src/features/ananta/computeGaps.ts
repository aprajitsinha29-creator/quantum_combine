/**
 * Pure gap computation for the Ananta reverse flow (no React, no I/O).
 *
 * "Gaps" are the skills the learner's tracked career path asks for (the
 * path's evidence.top_skills, already ordered most in-demand first by the
 * backend) that the learner has not declared in their QPath profile. They
 * become the `skills` list of the 'qpath:gaps' message that useGapBroadcast
 * posts to the Ananta parent page; Ananta shows them as studio
 * recommendations — a recommendation only, never proof of a skill.
 */

import type { PathSkillShare } from '../../types/api';

/**
 * Return the `skill_id`s of `topSkills` that are missing from
 * `declaredSkillIds`, preserving the in-demand-first input order and
 * dropping duplicates defensively. At most `limit` ids (default 20, the
 * same cap the Ananta side enforces) are returned.
 *
 * Empty inputs return an empty list; calling with no tracked-path evidence
 * is treated the same way (no gaps can be computed from nothing).
 */
export function computeGaps(
  topSkills: Pick<PathSkillShare, 'skill_id'>[],
  declaredSkillIds: string[],
  limit = 20,
): string[] {
  const declared = new Set(declaredSkillIds);
  const gaps: string[] = [];
  for (const skill of topSkills) {
    if (gaps.length >= limit) break;
    if (skill && !declared.has(skill.skill_id) && !gaps.includes(skill.skill_id)) {
      gaps.push(skill.skill_id);
    }
  }
  return gaps;
}
