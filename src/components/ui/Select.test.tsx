import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Select } from './Select';

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
] as const;

function Harness({ onChange }: { readonly onChange?: (v: string) => void }) {
  const [v, setV] = useState('a');
  return (
    <>
      <Select
        label="Letter"
        value={v}
        options={OPTIONS}
        onChange={(x) => {
          setV(x);
          onChange?.(x);
        }}
      />
      <button type="button">outside</button>
    </>
  );
}

describe('Select', () => {
  it('opens with the keyboard, moves with arrows, selects with Enter and restores focus', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: /letter/i });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    const list = screen.getByRole('listbox', { name: 'Letter' });
    expect(list).toHaveFocus();
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(trigger).toHaveTextContent('Charlie');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports type-ahead, Escape and click-outside', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /letter/i });
    await userEvent.click(trigger);
    await userEvent.keyboard('b{Enter}');
    expect(onChange).toHaveBeenCalledWith('b');
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'outside' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
