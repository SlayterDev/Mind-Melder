type SwitchSize = 'sm' | 'md' | 'lg';

const sizeStyles: Record<
  SwitchSize,
  { track: string; thumb: string; thumbOffset: string; checkedTranslate: string; uncheckedTranslate: string }
> = {
  sm: {
    track: 'w-9 h-5',
    thumb: 'w-4 h-4',
    thumbOffset: 'top-0.5',
    checkedTranslate: 'translate-x-4',
    uncheckedTranslate: 'translate-x-0.5',
  },
  md: {
    track: 'w-12 h-6',
    thumb: 'w-4 h-4',
    thumbOffset: 'top-1',
    checkedTranslate: 'translate-x-7',
    uncheckedTranslate: 'translate-x-1',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-5 h-5',
    thumbOffset: 'top-1',
    checkedTranslate: 'translate-x-8',
    uncheckedTranslate: 'translate-x-1',
  },
};

interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
}

export function Switch({ checked, onChange, disabled, size = 'md' }: SwitchProps) {
  const { track, thumb, thumbOffset, checkedTranslate, uncheckedTranslate } = sizeStyles[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative ${track} rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
        checked ? 'bg-accent' : 'bg-gray-600'
      }`}
    >
      <div
        className={`absolute ${thumbOffset} ${thumb} bg-white rounded-full transition-transform ${
          checked ? checkedTranslate : uncheckedTranslate
        }`}
      />
    </button>
  );
}
