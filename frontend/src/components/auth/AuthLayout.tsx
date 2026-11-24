import type { ReactNode } from 'react';
import { Eye, EyeOff, Layers } from 'lucide-react';
import './auth.css';

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return <button className="auth-password-toggle" type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>
    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>;
}

export default function AuthLayout({ children, footer, mode }: { children: ReactNode; footer: ReactNode; mode: 'login' | 'register' }) {
  return <main className={`auth-screen auth-screen--${mode}`}>
    <div className="auth-shell">
      <section className="auth-panel" aria-label={mode === 'login' ? 'Sign in to MAD Invoice' : 'Create a MAD Invoice account'}>
        <a className="auth-brand" href="/" aria-label="MAD Invoice home"><span className="auth-brand-mark"><Layers size={19} strokeWidth={1.8}/></span><span>MAD<span className="auth-brand-light"> Invoice</span></span></a>
        <div className="auth-content">{children}</div>
        <footer className="auth-footer">{footer}</footer>
      </section>
      <div className="auth-art-panel" aria-hidden="true">
        <img className="auth-reference-image" src="/images/auth-industrial-original.png" alt=""/>
      </div>
    </div>
  </main>;
}

