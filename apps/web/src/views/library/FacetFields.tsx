import { FACETS } from '../../../../../packages/domain/src/index.js';
import type { BuildingFacets, FacetKey } from '../../../../../packages/domain/src/index.js';

/**
 * Form fields for the declared catalogue facets (B9). Used by the import form
 * and by "Angaben bearbeiten". Values are statements of the author, so the
 * fieldset says so; nothing here is measured.
 */
export function FacetFields({ initial }: { initial?: BuildingFacets }) {
  return <fieldset className="facet-fields"><legend>Angaben zum Gebäude (freiwillig)</legend>
    {FACETS.map(f => f.single
      ? <label key={f.key}>{f.label}<select name={`facet-${f.key}`} defaultValue={initial?.[f.key]?.[0] ?? ''}>
          <option value="">– keine Angabe –</option>
          {Object.entries(f.values).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      : <div key={f.key} className="facet-choice" role="group" aria-label={f.label}><span>{f.label}</span>
          {Object.entries(f.values).map(([v, label]) => <label key={v} className="chip-check">
            <input type="checkbox" name={`facet-${f.key}`} value={v} defaultChecked={initial?.[f.key]?.includes(v) ?? false} />{label}</label>)}</div>)}
  </fieldset>;
}

export function facetsFromForm(form: FormData): BuildingFacets {
  const out: Partial<Record<FacetKey, string[]>> = {};
  for (const f of FACETS) {
    const values = form.getAll(`facet-${f.key}`).map(String).filter(Boolean);
    if (values.length) out[f.key] = values;
  }
  return out;
}
