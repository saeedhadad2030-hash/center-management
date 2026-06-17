import { AtSign } from 'lucide-react';

interface DeveloperCreditProps {
  variant?: 'light' | 'dark';
  compact?: boolean;
}

export default function DeveloperCredit({ variant = 'light', compact = false }: DeveloperCreditProps) {
  const isDark = variant === 'dark';

  return (
    <a
      href="https://www.instagram.com/saeed_hadad1/"
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-wrap items-center justify-center gap-2 rounded-xl text-center transition ${
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
      } ${
        isDark
          ? 'bg-white/10 text-primary-100 hover:bg-white/15 hover:text-white'
          : 'bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-pink-700'
      }`}
    >
      <AtSign size={compact ? 15 : 17} />
      <span>تصميم وتطوير Saeed Hadad</span>
      <span dir="ltr" className={isDark ? 'text-primary-200' : 'text-pink-600'}>
        @saeed_hadad1
      </span>
    </a>
  );
}
