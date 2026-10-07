import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { findStandard, SKILLS_BY_GRADE, STANDARDS_BY_GRADE } from '../../curriculum/registry';
import { DOMAIN_NAMES, GRADE_DOMAINS, GRADE_LABELS, GRADES, type DomainCode, type GradeLevel } from '../../curriculum/types';
import type { PracticePlan } from '../../engines/plan/practicePlan';
import { Segmented, Toggle } from '../common/Controls';

/**
 * Grade Level Math — practice aligned to the California Common Core State Standards for Mathematics (K–8).
 */
export function GradeLevelSection() {
  const { settings, updateSettings } = useApp();
  const plan = settings.plan;
  const gl = plan.gradeLevel.settings;
  const [domainFilter, setDomainFilter] = useState<DomainCode | 'ALL'>('ALL');
  const setPlan = (fn: (p: PracticePlan) => PracticePlan) => updateSettings((s) => ({ ...s, plan: fn(s.plan) }));
  const gradeSkills = SKILLS_BY_GRADE[gl.grade];
  const selected = new Set(gl.skillIds.length ? gl.skillIds : gradeSkills.map((s) => s.id));
  const visibleSkills = domainFilter === 'ALL' ? gradeSkills : gradeSkills.filter((s) => s.domain === domainFilter);
  const setSkills = (ids: string[]) => setPlan((p) => ({ ...p, gradeLevel: { ...p.gradeLevel, settings: { ...p.gradeLevel.settings, skillIds: ids.length === gradeSkills.length ? [] : ids } } }));
  const onlyGradeLevel = () =>
    setPlan((p) => ({
      arithmetic: { ...p.arithmetic, enabled: false },
      fractions: { ...p.fractions, enabled: false },
      decimals: { ...p.decimals, enabled: false },
      order: { ...p.order, enabled: false },
      wordProblems: { ...p.wordProblems, enabled: false },
      gradeLevel: { ...p.gradeLevel, enabled: true },
    }));
  const othersOn = plan.arithmetic.enabled || plan.fractions.enabled || plan.decimals.enabled || plan.order.enabled || plan.wordProblems.enabled;

  return (
    <div className="grade-hero">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>🎓 Grade Level Math</h2>
        {!plan.gradeLevel.enabled || othersOn ? (
          <button type="button" className="brick green" onClick={onlyGradeLevel}>
            ▶ Practice only {GRADE_LABELS[gl.grade]}
          </button>
        ) : (
          <span className="pill">✅ Your child is practising {GRADE_LABELS[gl.grade]}</span>
        )}
      </div>
      <p className="help" style={{ margin: 0 }}>
        Aligned to the <strong>California Common Core State Standards for Mathematics</strong> (adopted 2010, updated 2013), organized by the 2023 Mathematics Framework for California Public Schools.{' '}
        <span className="ca-badge">CA</span> marks standards California added.
      </p>
      <div className="row grade-picker" role="group" aria-label="Grade">
        {GRADES.map((g, i) => (
          <button
            key={g}
            type="button"
            className={`brick ${['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'azure', 'lime', 'red'][i]}`}
            aria-pressed={gl.grade === g}
            style={gl.grade === g ? { outline: '4px solid var(--edge)', outlineOffset: 2 } : undefined}
            onClick={() => {
              setDomainFilter('ALL');
              setPlan((p) => ({ ...p, gradeLevel: { ...p.gradeLevel, settings: { ...p.gradeLevel.settings, grade: g as GradeLevel, skillIds: [] } } }));
            }}
            aria-label={GRADE_LABELS[g]}
          >
            {g}
          </button>
        ))}
      </div>
      <div className={`topic-card${plan.gradeLevel.enabled ? ' on' : ''}`}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>
              {GRADE_LABELS[gl.grade]} · {selected.size} of {gradeSkills.length} skills · {STANDARDS_BY_GRADE[gl.grade].length} standards
            </h3>
            <Toggle checked={plan.gradeLevel.enabled} onChange={(v) => setPlan((p) => ({ ...p, gradeLevel: { ...p.gradeLevel, enabled: v } }))} label={plan.gradeLevel.enabled ? 'On' : 'Off'} />
          </div>
          <Segmented
            label="Domain"
            value={domainFilter}
            options={[{ value: 'ALL' as const, label: 'All' }, ...GRADE_DOMAINS[gl.grade].map((dc) => ({ value: dc, label: dc }))]}
            onChange={setDomainFilter}
          />
          {domainFilter !== 'ALL' ? <span className="help">{DOMAIN_NAMES[domainFilter]}</span> : null}
          <div className="row">
            <button type="button" className="brick small ghost" onClick={() => setSkills([...new Set([...selected, ...visibleSkills.map((s) => s.id)])])}>
              ✓ All
            </button>
            <button
              type="button"
              className="brick small ghost"
              onClick={() => {
                const remaining = [...selected].filter((id) => !visibleSkills.some((s) => s.id === id));
                setSkills(remaining.length ? remaining : [gradeSkills[0]?.id ?? '']);
              }}
            >
              ✗ None
            </button>
          </div>
          <div className="skill-list" role="group" aria-label="Skills">
            {visibleSkills.map((skill) => {
              const std = skill.standards.map((c) => findStandard(c)).filter(Boolean);
              const ca = std.some((s) => s?.caAddition);
              return (
                <label key={skill.id} className="skill-item">
                  <input
                    type="checkbox"
                    checked={selected.has(skill.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(skill.id);
                      else next.delete(skill.id);
                      if (next.size > 0) setSkills([...next]);
                    }}
                  />
                  <span>
                    <strong>{skill.title}</strong> <span className="std-chip">{skill.standards.join(', ')}</span> {ca ? <span className="ca-badge">CA</span> : null}
                    <br />
                    <span className="help">{std[0]?.text}</span>
                  </span>
                </label>
              );
            })}
          </div>
      </div>
    </div>
  );
}
