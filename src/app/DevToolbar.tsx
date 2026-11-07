import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getConfig } from '../config/env';
import { getScenario, isScenario, MOCK_SCENARIOS, setScenario, type MockScenario } from '../mocks/scenario';

/** Developer-only strip shown in mock mode: switches the mock layer's scenario. */
export function DevToolbar() {
  const mock = getConfig().mode === 'mock';
  const client = useQueryClient();
  const [scenario, setLocal] = useState<MockScenario>(getScenario());
  if (!mock) return null;
  return (
    <div className="border-t border-slate-200/60 bg-slate-50/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1 text-xs text-slate-600 sm:px-6 lg:px-8">
        <span className="rounded bg-slate-200/70 px-1.5 py-px font-mono text-[10px] font-semibold tracking-wider text-slate-600 uppercase">dev</span>
        {(
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
        )}
      </div>
    </div>
  );
}
