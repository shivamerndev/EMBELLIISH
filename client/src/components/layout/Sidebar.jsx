import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronDown,
  ChevronRight,
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
  {
    label: 'CRM',
    icon: Users,
    permission: 'crm:view',
    children: [
      { label: 'Leads', path: '/crm/leads' },
      { label: 'DCM Assignments', path: '/crm/dcm-assignments' },
      { label: 'Qualification', path: '/crm/qualification' },
      { label: 'Follow-ups', path: '/crm/follow-ups' },
      { label: 'Sales and Commercials', path: '/crm/sales-commercials' },
      { label: 'Clients', path: '/crm/clients' },
    ],
  },
  { label: 'Projects', path: '/projects', icon: Briefcase, permission: 'project:view' },
  { label: 'Production', path: '/production', icon: Factory, permission: 'production:view' },
  { label: 'Inventory', path: '/inventory', icon: Package, permission: 'inventory:view' },
  { label: 'Accounts', path: '/accounts', icon: Receipt, permission: 'accounts:view' },
  { label: 'Reports', path: '/reports', icon: BarChart3, permission: 'reports:view' },
  { label: 'Team', path: '/team', icon: UserCog, permission: 'user:manage' },
  { label: 'Settings', path: '/settings', icon: Settings2, permission: 'settings:manage' },
];

export const Sidebar = () => {
  const permissions = useSelector((state) => state.auth?.user?.permissions || []);
  const granted = new Set(permissions);
  const location = useLocation();
  const navigate = useNavigate();

  const items = NAV.filter((item) => !item.permission || granted.has(item.permission));

  const [openMenus, setOpenMenus] = useState(() => {
    const initial = {};
    if (location.pathname.startsWith('/crm')) {
      initial['CRM'] = true;
    }
    return initial;
  });

  useEffect(() => {
    if (location.pathname.startsWith('/crm') && !openMenus['CRM']) {
      setOpenMenus((prev) => ({ ...prev, CRM: true }));
    }
  }, [location.pathname]);

  const toggleMenu = (label, defaultChildPath) => {
    setOpenMenus((prev) => {
      const isOpening = !prev[label];
      if (isOpening && defaultChildPath && !location.pathname.startsWith('/crm')) {
        navigate(defaultChildPath);
      }
      return { ...prev, [label]: isOpening };
    });
  };

  return (
    <aside
      className="w-64 shrink-0 border-r flex flex-col h-screen sticky top-0 transition-colors duration-300 select-none"
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
          const hasChildren = Boolean(item.children && item.children.length > 0);

          if (hasChildren) {
            const isChildActive = item.children.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
            const isOpen = Boolean(openMenus[item.label]);

            return (
              <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label, item.children[0]?.path)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 border-l-2 text-left',
                    isChildActive
                      ? 'bg-brand-500/15 text-brand-300 font-semibold border-brand-500 shadow-sm shadow-brand-900/30'
                      : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  )}
                  style={
                    isChildActive
                      ? {}
                      : { color: 'var(--text-muted)' }
                  }
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-3 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="ml-4 pl-3 border-l border-slate-700/40 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-200',
                            isActive
                              ? 'bg-brand-500/20 text-brand-300 font-semibold border-l-2 border-brand-500 shadow-sm'
                              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

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
