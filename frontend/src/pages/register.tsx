import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Building2 } from 'lucide-react';
import AuthLayout, { PasswordToggle } from '../components/auth/AuthLayout';

interface RegisterProps {
  onRegisterSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function Register({ onRegisterSuccess, onSwitchToLogin }: RegisterProps) {
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || successMessage) return;
    setErrorMessage('');
    setLoading(true);
    try {
      await axios.post('/api/auth/register', { companyName: companyName.trim(), firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
      setSuccessMessage('Your workspace is ready. Taking you to sign in…');
      redirectTimer.current = setTimeout(() => (onRegisterSuccess || onSwitchToLogin)?.(), 1200);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.response?.data?.message || 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout mode="register" footer={<>Already a member? <button type="button" className="auth-link" onClick={onSwitchToLogin}>Sign in</button></>}>
    <h1>SIGN UP</h1>
    <p className="auth-intro">Welcome to MAD Invoice.<br/>A simpler start for your business.</p>
    {errorMessage && <div className="auth-error" role="alert">{errorMessage}</div>}
    {successMessage && <div className="auth-success" role="status">{successMessage}</div>}
    <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
      <div className="auth-field"><label htmlFor="register-company">Company name</label><input id="register-company" name="companyName" autoComplete="organization" placeholder="Your company" value={companyName} onChange={event => setCompanyName(event.target.value)} required pattern=".*\S.*"/></div>
      <div className="auth-name-row">
        <div className="auth-field"><label htmlFor="register-first-name">First name</label><input id="register-first-name" name="firstName" autoComplete="given-name" placeholder="First name" value={firstName} onChange={event => setFirstName(event.target.value)} required pattern=".*\S.*"/></div>
        <div className="auth-field"><label htmlFor="register-last-name">Last name</label><input id="register-last-name" name="lastName" autoComplete="family-name" placeholder="Last name" value={lastName} onChange={event => setLastName(event.target.value)} required pattern=".*\S.*"/></div>
      </div>
      <div className="auth-field"><label htmlFor="register-email">E-mail</label><input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)} required/></div>
      <div className="auth-field"><label htmlFor="register-password">Password</label><div className="auth-password"><input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a password" value={password} onChange={event => setPassword(event.target.value)} required/><PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)}/></div></div>
      <button className="auth-primary" type="submit" disabled={loading || !!successMessage}>{loading ? 'Creating account…' : successMessage ? 'Account created' : 'Create Account'}</button>
      <p className="auth-note"><Building2 size={14}/>Your own workspace. All your invoicing in one place.</p>
    </form>
  </AuthLayout>;
}
