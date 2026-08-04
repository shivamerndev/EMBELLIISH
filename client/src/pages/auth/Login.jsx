import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { login, clearError } from '../../features/auth/authSlice';
import { loadMeta } from '../../features/meta/metaSlice';
import { Button, Field, Input } from '../../components/ui';

/** Seeded accounts, offered as one-click fill so each role is easy to try. */
const DEMO_ACCOUNTS = [
  ['admin@embellish.com', 'Hitesh — Admin'],
  ['rahul@embellish.com', 'Rahul — DCM'],
  ['coordinator@embellish.com', 'Ankit — Coordinator'],
  ['factory@embellish.com', 'Suresh — Factory'],
  ['accounts@embellish.com', 'Neha — Accounts'],
];

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, token, user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: 'Embellish@2026' });

  useEffect(() => {
    if (token && user) {
      dispatch(loadMeta());
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    }
  }, [token, user, dispatch, navigate, location.state]);

  const submit = (event) => {
    event.preventDefault();
    dispatch(clearError());
    dispatch(login(form));
  };

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs rounded-lg">
          {error.message}
        </div>
      )}

      <Field label="Email" required>
        <Input
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="rahul@embellish.com"
          autoComplete="username"
          required
        />
      </Field>

      <Field label="Password" required>
        <Input
          type="password"
          value={form.password}
          onChange={set('password')}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" icon={LogIn} loading={status === 'loading'} className="w-full" size="lg">
        Sign in
      </Button>

      <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
          Seeded accounts
        </p>
        <div className="grid grid-cols-1 gap-1">
          {DEMO_ACCOUNTS.map(([email, label]) => (
            <button
              key={email}
              type="button"
              onClick={() => setForm({ email, password: 'Embellish@2026' })}
              className="text-left px-2.5 py-1.5 rounded-md text-xs transition"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
};

export default Login;
