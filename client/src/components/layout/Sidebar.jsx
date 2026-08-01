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
    <aside className="w-60 shrink-0 bg-[ #836444] 900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-600/30">
          E
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-slate-100 leading-tight tracking-tight">EMBELLISH</h1>
          <span className="text-[10px] text-blue-400 font-semibold tracking-wider">OPERATING SPINE</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-slate-400 hover:bg-[ #836444] 800/60 hover:text-slate-200'
                )
              }
            >
              <Icon className="w-4 h-4 mr-3 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 px-3">Embellish ERP v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
