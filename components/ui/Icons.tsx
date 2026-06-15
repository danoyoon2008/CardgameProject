// components/ui/Icons.tsx
export function IconGold({ className }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
        <path d="M14.5 9.5a3.5 3.5 0 0 0-5 0 3.5 3.5 0 0 0 0 5 3.5 3.5 0 0 0 5 0v-2h-2.5" />
      </svg>
    );
  }
  export function IconToken({ className }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" fill="currentColor" fillOpacity="0.2" />
        <path d="M12 22V12" />
        <path d="M22 8.5L12 12" />
        <path d="M2 8.5L12 12" />
      </svg>
    );
  }
  export function IconShard({ className }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2L2 12l10 10 10-10L12 2z" fill="currentColor" fillOpacity="0.2" />
        <path d="M12 2v20" />
        <path d="M2 12h20" />
      </svg>
    );
  }
  export function IconHome({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>);
  }
  export function IconUser({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>);
  }
  export function IconShop({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" /><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M16 9V5M8 9V5" /></svg>);
  }
  export function IconDeck({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="4" y="4" width="16" height="20" rx="2" /><path d="M8 8h8M8 12h8M8 16h4" /></svg>);
  }
  export function IconPencil({ className }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    );
  }
  export function IconBook({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>);
  }
  export function IconSettings({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>);
  }
  export function IconGlobe({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" /></svg>);
  }
  export function IconUsers({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
  }
  export function IconLock({ className }: { className?: string }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
  }