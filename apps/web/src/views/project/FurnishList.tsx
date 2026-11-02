import type { GuideStep } from '../../../../../packages/domain/src/index.js';

const short = (id: string): string => id.replace(/^minecraft:/, '').replace(/_/g, ' ');
const at = (p: readonly number[]) => `X ${p[0]} · Y ${p[1]} · Z ${p[2]}`;

/** „Ausstattung“ step: entities to put up and contents to fill in (ENTITY-01). */
export function FurnishList({ step, print = false }: { step: GuideStep; print?: boolean }) {
  if (!step.furnish?.length) return null;
  return <table className={print ? 'ps-furnish' : 'build-materials build-furnish'} data-testid="furnish-list">
    <caption>Aufstellen, einräumen und beschriften</caption>
    <thead><tr>{print && <th />}<th>Was</th><th>Wo</th><th>Item / Inhalt</th></tr></thead>
    <tbody>{step.furnish.map((f, i) => <tr key={i}>
      {print && <td><span className="ps-box" /></td>}
      <td>{f.label}{f.text && f.text.length > 0 && <small><br />{f.text.join(' / ')}</small>}</td>
      <td>{at(f.position)}</td>
      <td>{f.placement && <code>{short(f.placement)}</code>}{f.placement && f.items.length > 0 && ' + '}
        {f.items.map(it => `${it.count > 1 ? `${it.count}× ` : ''}${short(it.id)}${it.name ? ` „${it.name}“` : ''}`).join(', ')}
        {!f.placement && !f.items.length && <span className="muted">–</span>}</td>
    </tr>)}</tbody>
  </table>;
}
