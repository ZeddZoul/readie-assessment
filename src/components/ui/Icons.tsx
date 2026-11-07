/** Thin wrappers over react-icons (Lucide set) so call sites stay decoupled from the icon library. */
import type { IconType } from 'react-icons';
import { LuArrowDown, LuArrowLeft, LuArrowUp, LuCheck, LuChevronRight, LuClock, LuSearch, LuShieldCheck, LuTriangleAlert, LuX } from 'react-icons/lu';

export interface IconProps {
  readonly className?: string;
  /** Icon size in px (height follows). */
  readonly width?: number;
  readonly height?: number;
}

function wrap(Icon: IconType) {
  return function WrappedIcon({ className, width = 16 }: IconProps) {
    return <Icon size={width} aria-hidden="true" focusable="false" {...(className ? { className } : {})} />;
  };
}

export const SearchIcon = wrap(LuSearch);
export const ChevronRightIcon = wrap(LuChevronRight);
export const ArrowLeftIcon = wrap(LuArrowLeft);
export const CheckIcon = wrap(LuCheck);
export const AlertIcon = wrap(LuTriangleAlert);
export const ClockIcon = wrap(LuClock);
export const XIcon = wrap(LuX);
export const LogoIcon = wrap(LuShieldCheck);

const SortAsc = wrap(LuArrowUp);
const SortDesc = wrap(LuArrowDown);
export function SortIcon({ direction, ...p }: IconProps & { readonly direction: 'asc' | 'desc' }) {
  return direction === 'asc' ? <SortAsc {...p} /> : <SortDesc {...p} />;
}
