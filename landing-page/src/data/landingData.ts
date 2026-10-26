export interface NavLink {
  label: string;
  href: string;
}

export interface StatItem {
  id: string;
  value: string;
  label: string;
  dividerAngle: 'rotate-[20deg]' | 'rotate-[-20deg]';
  dividerPosition: 'before' | 'after';
  align: 'left' | 'right';
  className: string;
}

export const LOGO_SVG_PATH =
  'M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z';

export const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4';

export const NAV_LINKS: NavLink[] = [
  { label: 'platform', href: '#platform' },
  { label: 'solutions', href: '#solutions' },
  { label: 'company', href: '#company' },
  { label: 'support', href: '#support' },
];

export const DESCRIPTION_TEXT =
  'we can guarding your data with utmost care, empowering you with privacy everywhere';

export const HEADLINE_WORDS = [
  { text: 'protect', className: 'left-4 md:left-10 top-[18%]' },
  { text: 'your', className: 'right-4 md:right-10 top-[38%]' },
  { text: 'data', className: 'left-[18%] md:left-[28%] top-[58%]' },
] as const;

export const STATS = {
  topRight: {
    value: '+65k',
    label: 'startups use',
    wrapperClass: 'absolute right-6 md:right-24 top-[14%]',
  },
  bottomLeft: {
    value: '+1.5b',
    label: 'gb data was protected',
    wrapperClass: 'absolute left-6 md:left-20 bottom-20 md:bottom-24',
  },
  bottomRight: {
    value: '+300k',
    label: 'downloads',
    wrapperClass: 'absolute right-6 md:right-20 bottom-16 md:bottom-20',
  },
} as const;
