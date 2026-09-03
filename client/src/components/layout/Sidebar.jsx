import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  Settings2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Folder,
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
      {
        label: 'Leads',
        children: [
          { label: 'Leads', path: '/crm/leads' },
          { label: 'DCM Assignment', path: '/crm/dcm-assignments' },
          { label: 'Qualification', path: '/crm/qualification' },
          { label: 'Follow Ups', path: '/crm/follow-ups' },
        ],
      },
      {
        label: 'Sales and Commercials',
        children: [
          { label: 'Leads - (Qualified Decision)', path: '/crm/sales-commercials/leads' },
          { label: 'Pre Site Visit', path: '/crm/sales-commercials/pre-site-visit' },
          { label: 'Measurement Capture', path: '/crm/sales-commercials/measurement' },
          { label: 'Studio Meeting', path: '/crm/sales-commercials/studio-meeting' },
          { label: 'Consumption Sheet/BOQ Dashboard', path: '/crm/sales-commercials/consumption-boq' },
          { label: 'Ready Size Confirmation', path: '/crm/sales-commercials/ready-size' },
          { label: 'Proposal Creation', path: '/crm/sales-commercials/proposal' },
          { label: 'Budgeting/Token Discussion', path: '/crm/sales-commercials/token-discussion' },
          { label: 'Pricing/Material Costing', path: '/crm/sales-commercials/pricing-costing' },
          { label: 'Quotation Preparation', path: '/crm/sales-commercials/quotation' },
          { label: 'Client Approval', path: '/crm/sales-commercials/client-approval' },
          { label: "KYC/Customer Conversion", path: '/crm/sales-commercials/kyc' }
        ],
      },
    ],
  },
  { label: 'Members', path: '/members', icon: Users },
  { label: 'Settings', path: '/settings', icon: Settings2, permission: 'settings:manage' },
];

const isPathActive = (targetPath, currentPathname, currentSearch) => {
  if (!targetPath) return false;
  if (targetPath.includes('?')) {
    const [basePath, targetQueryStr] = targetPath.split('?');
    if (currentPathname !== basePath) return false;
    const targetParams = new URLSearchParams(targetQueryStr);
    const currentParams = new URLSearchParams(currentSearch);

    const targetSection = targetParams.get('section');
    const currentSection = currentParams.get('section') || 's1';

    if (targetSection) {
      return targetSection === currentSection;
    }
    return true;
  }
  return currentPathname === targetPath || currentPathname.startsWith(targetPath + '/');
};

const hasActiveChild = (children, currentPathname, currentSearch) => {
  if (!children || children.length === 0) return false;
  return children.some((child) => {
    if (child.path) {
      return isPathActive(child.path, currentPathname, currentSearch);
    }
    if (child.children) {
      return hasActiveChild(child.children, currentPathname, currentSearch);
    }
    return false;
  });
};

export const Sidebar = ({ isCollapsed = false, onToggle, isMobileOpen = false, onCloseMobile }) => {
  const permissions = useSelector((state) => state.auth?.user?.permissions || []);
  const themeMode = useSelector((state) => state.theme?.mode || 'light');
  const granted = new Set(permissions);
  const location = useLocation();
  const navigate = useNavigate();

  const items = NAV.filter((item) => !item.permission || granted.has(item.permission));

  const [openMenus, setOpenMenus] = useState(() => {
    const initial = {};
    if (location.pathname.startsWith('/crm')) {
      initial['CRM'] = true;
      initial['CRM_Leads'] = true;
      initial['CRM_Sales and Commercials'] = true;
    }
    return initial;
  });

  useEffect(() => {
    if (location.pathname.startsWith('/crm')) {
      setOpenMenus((prev) => ({
        ...prev,
        CRM: true,
        CRM_Leads: prev['CRM_Leads'] ?? true,
        'CRM_Sales and Commercials': prev['CRM_Sales and Commercials'] ?? true,
      }));
    }
  }, [location.pathname]);

  const toggleMenu = (key, defaultChildPath) => {
    setOpenMenus((prev) => {
      const isOpening = !prev[key];
      if (isOpening && defaultChildPath && !location.pathname.startsWith('/crm')) {
        navigate(defaultChildPath);
      }
      return { ...prev, [key]: isOpening };
    });
  };

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={cn(
        "shrink-0 border-r flex flex-col h-screen select-none z-50 transition-all duration-300",
        // Desktop positioning & responsive collapse
        "hidden md:flex md:sticky md:top-0",
        isCollapsed ? "md:w-0 md:border-r-0 md:opacity-0 md:overflow-hidden" : "md:w-64 md:opacity-100",
        // Mobile drawer overlay positioning
        isMobileOpen ? "!flex fixed inset-y-0 left-0 w-64 shadow-2xl opacity-100 z-50" : ""
      )}
      style={{
        backgroundColor: 'var(--bg-surface-alt)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="w-64 flex flex-col h-full shrink-0">
        <div
          className="px-4 py-4 border-b flex items-center justify-between gap-2"
          style={{ borderColor: 'var(--border)' }}
        >
          <Logo size="sm" variant="horizontal" showEmblem={false} mode={themeMode === 'dark' ? 'dark' : 'light'} />
          <button
            type="button"
            onClick={() => {
              if (isMobileOpen && onCloseMobile) {
                onCloseMobile();
              } else if (onToggle) {
                onToggle();
              }
            }}
            title="Close / Collapse Sidebar"
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.children && item.children.length > 0);

            if (hasChildren) {
              const isChildActive = hasActiveChild(item.children, location.pathname, location.search);
              const isOpen = Boolean(openMenus[item.label]);

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.label, '/crm/leads')}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 border-l-2 text-left',
                      isChildActive
                        ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold border-brand-500 shadow-sm shadow-brand-900/30'
                        : 'border-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    )}
                    style={
                      isChildActive
                        ? {}
                        : { color: 'var(--text-primary)' }
                    }
                  >
                    <div className="flex items-center">
                      <Icon className="w-4 h-4 mr-3 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="ml-3 pl-2.5 border-l border-[var(--border)] space-y-2 pt-1">
                      {item.children.map((subGroup) => {
                        if (subGroup.children) {
                          const subKey = `${item.label}_${subGroup.label}`;
                          const isSubGroupOpen = Boolean(openMenus[subKey]);
                          const isSubGroupActive = hasActiveChild(subGroup.children, location.pathname, location.search);

                          return (
                            <div key={subGroup.label} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => toggleMenu(subKey)}
                                className={cn(
                                  'w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold tracking-wider rounded-md transition-all text-left uppercase',
                                  isSubGroupActive
                                    ? 'text-brand-700 dark:text-brand-300 bg-brand-500/10'
                                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                )}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Folder className="w-3.5 h-3.5 shrink-0 text-brand-500" />
                                  <span className="truncate">{subGroup.label}</span>
                                </div>
                                {isSubGroupOpen ? (
                                  <ChevronDown className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
                                )}
                              </button>

                              {isSubGroupOpen && (
                                <div className="ml-2 pl-2 border-l border-[var(--border)] space-y-0.5">
                                  {subGroup.children.map((child) => {
                                    const isActive = isPathActive(child.path, location.pathname, location.search);
                                    return (
                                      <NavLink
                                        key={child.path}
                                        to={child.path}
                                        onClick={handleLinkClick}
                                        className={cn(
                                          'flex items-center px-2.5 py-1.5 text-[11.5px] font-medium rounded-md transition-all duration-200',
                                          isActive
                                            ? 'bg-brand-500/20 text-brand-700 dark:text-brand-300 font-semibold border-l-2 border-brand-500 shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                                        )}
                                      >
                                        {child.label}
                                      </NavLink>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        const isActive = isPathActive(subGroup.path, location.pathname, location.search);
                        return (
                          <NavLink
                            key={subGroup.path}
                            to={subGroup.path}
                            onClick={handleLinkClick}
                            className={cn(
                              'flex items-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-200',
                              isActive
                                ? 'bg-brand-500/20 text-brand-700 dark:text-brand-300 font-semibold border-l-2 border-brand-500 shadow-sm'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                            )}
                          >
                            {subGroup.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold border-l-2 border-brand-500 shadow-sm shadow-brand-900/30'
                      : 'border-l-2 border-transparent text-[var(--text-primary)]'
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? {}
                    : { color: 'var(--text-primary)' }
                }
                onMouseEnter={(e) => {
                  if (!e.currentTarget.classList.contains('text-brand-700')) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.classList.contains('text-brand-700')) {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.color = 'var(--text-primary)';
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
          <a
            href="https://www.dtableanalytics.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] tracking-wider font-semibold uppercase hover:underline transition-all block"
            style={{ color: 'var(--text-muted)' }}
          >
            Powered by D-table analytics
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

