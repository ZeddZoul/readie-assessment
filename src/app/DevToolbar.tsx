import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { getConfig } from '../config/env';
import { getScenario, MOCK_SCENARIOS, setScenario, type MockScenario } from '../mocks/scenario';

const isScenario = (v: string): v is MockScenario => (MOCK_SCENARIOS as readonly string[]).includes(v);

/** Developer-only strip: mock scenario switcher (mock mode) and the temporary /help link (dev builds). */
export function DevToolbar() {
  const mock = getConfig().mode === 'mock';
  const dev = import.meta.env.DEV;
  const client = useQueryClient();
  const [scenario, setLocal] = useState<MockScenario>(getScenario());
  if (!mock && !dev) return null;
  return (
    <div className="border-t border-slate-200/60 bg-slate-50/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1 text-xs text-slate-600 sm:px-6 lg:px-8">
        <span className="rounded bg-slate-200/70 px-1.5 py-px font-mono text-[10px] font-semibold tracking-wider text-slate-600 uppercase">dev</span>
        {mock ? (
          <label className="flex items-center gap-1.5">
            Mock scenario
            <select
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs"
              value={scenario}
              onChange={(e) => {
                if (!isScenario(e.target.value)) return;
                setScenario(e.target.value);
                setLocal(e.target.value);
                void client.resetQueries();
              }}
            >
              {MOCK_SCENARIOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {/* TEMPORARY: remove together with src/features/help/ and the /help route. */}
        {dev ? (
          <Link to="/help" className="font-medium text-brand-700 hover:underline">
            Help: derivation rules
          </Link>
        ) : null}
      </div>
    </div>
  );
}
