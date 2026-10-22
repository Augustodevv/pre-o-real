import { useCallback, useState } from 'react';
import type { ProductView } from '../../messaging';
import { LABELS } from '../labels';
import { Panel } from './Panel';

interface Props {
  view: ProductView;
}

export function Badge({ view }: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const label = LABELS[view.verdict.classification];

  return (
    <>
      <button
        className="badge"
        style={{ color: label.color, background: label.background, borderColor: label.color }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={`${view.verdict.reason} Clique para ver o histórico.`}
      >
        <span aria-hidden="true">{label.emoji}</span>
        {label.text}
      </button>
      {open && <Panel view={view} onClose={close} />}
    </>
  );
}
