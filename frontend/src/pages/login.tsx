import React, { useState } from 'react';
import axios from 'axios';
import { LockKeyhole } from 'lucide-react';
import AuthLayout, { PasswordToggle } from '../components/auth/AuthLayout';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  onSwitchToRegister: () => void;
}

export default function Login({ onLoginSuccess, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email: email.trim(), password });
      localStorage.setItem('token', res.data.token);
      onLoginSuccess(res.data.token, res.data.user);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.response?.data?.message || 'Unable to sign in. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout mode="login" footer={<>New to MAD Invoice? <button type="button" className="auth-link" onClick={onSwitchToRegister}>Create an account</button></>}>
    <h1>SIGN IN</h1>
    <p className="auth-intro">Welcome back to MAD Invoice.<br/>Sign in to keep your business moving.</p>
    {errorMessage && <div className="auth-error" role="alert">{errorMessage}</div>}
    <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
      <div className="auth-field"><label htmlFor="login-email">E-mail</label><input id="login-email" name="email" type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)} required/></div>
      <div className="auth-field"><label htmlFor="login-password">Password</label><div className="auth-password"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} required/><PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)}/></div></div>
      <button className="auth-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      <p className="auth-note"><LockKeyhole size={13}/>One place for your invoices, customers, and company.</p>
    </form>
  </AuthLayout>;
}
