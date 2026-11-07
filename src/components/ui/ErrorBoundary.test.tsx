import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ErrorBoundary, toError } from './ErrorBoundary';

function Bomb({ explode }: { readonly explode: boolean }) {
  if (explode) throw new Error('kaboom');
  return <p>Content is fine</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs caught render errors; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the fallback instead of crashing, and recovers on reset once the cause is fixed', async () => {
    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setExplode(false)}>
            Fix
          </button>
          <ErrorBoundary
            fallback={(error, reset) => (
              <div>
                <p>Caught: {error.message}</p>
                <button type="button" onClick={reset}>
                  Try again
                </button>
              </div>
            )}
          >
            <Bomb explode={explode} />
          </ErrorBoundary>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByText('Caught: kaboom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fix' }));
    expect(screen.getByText('Caught: kaboom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Content is fine')).toBeInTheDocument();
  });

  it('clears the error when resetKey changes (e.g. switching tab or recording)', () => {
    const fallback = (error: Error) => <p>Caught: {error.message}</p>;
    const { rerender } = render(
      <ErrorBoundary resetKey="a" fallback={fallback}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Caught: kaboom')).toBeInTheDocument();
    rerender(
      <ErrorBoundary resetKey="b" fallback={fallback}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Content is fine')).toBeInTheDocument();
  });

  it('normalises non-Error throws', () => {
    expect(toError('plain string').message).toBe('plain string');
    expect(toError(42).message).toBe('Unknown error');
    const e = new TypeError('x');
    expect(toError(e)).toBe(e);
  });
});
