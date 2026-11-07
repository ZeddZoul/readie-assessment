import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('appears after a hover delay, describes the control, and hides on pointer-out', async () => {
    vi.useFakeTimers();
    try {
      render(
        <Tooltip content="Copy a link to this view" shortcut="C">
          <button type="button">Copy</button>
        </Tooltip>,
      );
      const button = screen.getByRole('button', { name: 'Copy' });
      expect(screen.queryByRole('tooltip')).toBeNull();
      expect(button).not.toHaveAttribute('aria-describedby');

      fireEvent.pointerEnter(button.parentElement ?? button, { pointerType: 'mouse' });
      expect(screen.queryByRole('tooltip')).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
      const tip = screen.getByRole('tooltip');
      expect(tip).toBeVisible();
      expect(button).toHaveAttribute('aria-describedby', tip.id);
      expect(button).toHaveAccessibleDescription('Copy a link to this view (shortcut C)');

      fireEvent.pointerLeave(button.parentElement ?? button);
      expect(screen.queryByRole('tooltip')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows immediately on keyboard focus and hides on Escape and on click', async () => {
    render(
      <Tooltip content="Next candidate" shortcut="J" describe={false}>
        <button type="button" aria-label="Next candidate">
          ›
        </button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Next candidate' });
    expect(button).not.toHaveAttribute('aria-describedby');
    await userEvent.tab();
    expect(button).toHaveFocus();
    expect(screen.getByRole('tooltip')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    expect(screen.getByRole('tooltip')).toBeVisible();
    fireEvent.pointerDown(button);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('ignores touch input (the control keeps its accessible name)', async () => {
    vi.useFakeTimers();
    try {
      render(
        <Tooltip content="Switch campaign">
          <button type="button">119</button>
        </Tooltip>,
      );
      const button = screen.getByRole('button', { name: '119' });
      fireEvent.pointerEnter(button.parentElement ?? button, { pointerType: 'touch' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(screen.queryByRole('tooltip')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
