import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Factory,
  Package,
  Receipt,
  BarChart3,
  UserCog,
  Settings2,
} from 'lucide-react';
import cn from '../../utils/cn';
import Logo from '../common/Logo';

/**
 * Navigation is filtered by permission, so each department sees only the parts of
 * the spine it works on — the ERP's "each department sees their own tasks" rule
 * expressed in the shell itself.
 */
const NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'CRM', path: '/crm', icon: Users, permission: 'crm:view' },
  { label: 'Projects', path: '/projects', icon: Briefcase, permission: 'project:view' },
  { label: 'Production', path: '/production', icon: Factory, permission: 'production:view' },
  { label: 'Inventory', path: '/inventory', icon: Package, permission: 'inventory:view' },
  { label: 'Accounts', path: '/accounts', icon: Receipt, permission: 'accounts:view' },
  { label: 'Reports', path: '/reports', icon: BarChart3, permission: 'reports:view' },
  { label: 'Team', path: '/team', icon: UserCog, permission: 'user:manage' },
  { label: 'Settings', path: '/settings', icon: Settings2, permission: 'settings:manage' },
];

export const Sidebar = () => {
  const permissions = useSelector((state) => state.auth.user?.permissions || []);
  const granted = new Set(permissions);
  const items = NAV.filter((item) => !item.permission || granted.has(item.permission));

  return (
    <aside
      className="w-64 shrink-0 border-r flex flex-col h-screen sticky top-0 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-surface-alt)',
        borderColor: 'var(--border)',
      }}
    >
      <div
        className="px-5 py-5 border-b flex items-center justify-center"
        style={{ borderColor: 'var(--border)' }}
      >
        <Logo size="sm" variant="horizontal" mode="dark" />
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-brand-500/15 text-brand-300 font-semibold border-l-2 border-brand-500 shadow-sm shadow-brand-900/30'
                    : 'border-l-2 border-transparent'
                )
              }
              style={({ isActive }) =>
                isActive
                  ? {}
                  : { color: 'var(--text-muted)' }
              }
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('text-brand-300')) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains('text-brand-300')) {
                  e.currentTarget.style.backgroundColor = '';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon className="w-4 h-4 mr-3 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div
        className="p-4 border-t text-center"
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="text-[10px] tracking-wider font-medium" style={{ color: 'var(--text-faint)' }}>
          EMBELLIISH ERP v1.0
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
