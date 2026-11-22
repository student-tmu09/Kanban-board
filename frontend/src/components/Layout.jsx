import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Avatar from "./Avatar";
import {
  IconLayoutDashboard,
  IconBell,
  IconLogOut,
  IconKanban,
  IconMenu,
  IconClose
} from "./Icons";
import { getWorkspaces } from "../Api/workspaceApi";
import { getNotifications } from "../Api/notificationApi";
import { socket } from "../Api/socket";
import { unwrap } from "../utils/response";

export default function Layout({ children, title, breadcrumbs = [], right }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch workspaces for sidebar quick list
  useEffect(() => {
    let isMounted = true;
    const fetchQuickWorkspaces = async () => {
      try {
        const res = await getWorkspaces();
        if (isMounted) {
          setWorkspaces(unwrap(res, []));
        }
      } catch (err) {
        // Silently catch in sidebar
      }
    };
    fetchQuickWorkspaces();
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  // Fetch unread notifications & listen on socket
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await getNotifications();
        if (isMounted) {
          const items = unwrap(res, []);
          setUnreadCount(items.filter((n) => !n.isRead).length);
        }
      } catch (err) {}
    };

    fetchUnread();

    const handleSocketNotif = (notif) => {
      setUnreadCount((prev) => prev + 1);
      showToast(notif.message || "New notification received!", "info");
    };

    socket.on("notification", handleSocketNotif);
    return () => {
      isMounted = false;
      socket.off("notification", handleSocketNotif);
    };
  }, [showToast]);

  const handleLogout = async () => {
    await logout();
    showToast("Logged out successfully", "info");
    navigate("/login");
  };

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Modern Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <Link to="/dashboard" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
            <div className="brand-icon">
              <IconKanban size={20} />
            </div>
            <span>KANBAN<b>FLOW</b></span>
          </Link>
          <button
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Live sync status chip */}
        <div className="live-status-chip">
          <span className="pulse-indicator" />
          <span>Real-time Sync Active</span>
        </div>

        {/* Main Navigation */}
        <div className="sidebar-section-title">MENU</div>
        <nav className="sidebar-nav">
          <Link
            className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
          >
            <IconLayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

          <Link
            className={`nav-link ${location.pathname === "/notifications" ? "active" : ""}`}
            to="/notifications"
            onClick={() => setMobileMenuOpen(false)}
          >
            <IconBell size={18} />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="sidebar-badge-unread">{unreadCount}</span>
            )}
          </Link>
        </nav>

        {/* Quick Workspaces List */}
        {workspaces.length > 0 && (
          <div className="sidebar-workspaces">
            <div className="sidebar-section-title">YOUR WORKSPACES</div>
            <div className="workspace-links">
              {workspaces.slice(0, 6).map((ws) => {
                const isActive = location.pathname.includes(`/workspace/${ws._id}`);
                return (
                  <Link
                    key={ws._id}
                    to={`/workspace/${ws._id}`}
                    className={`workspace-link-item ${isActive ? "active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="ws-mini-badge">
                      {(ws.name || "W")[0].toUpperCase()}
                    </span>
                    <span className="ws-mini-name">{ws.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* User Profile & Logout section at bottom */}
        <div className="sidebar-footer">
          <div className="user-profile-card">
            <Avatar
              src={user?.avatar}
              name={user?.name || user?.email || "User"}
              size="md"
              className="user-profile-avatar"
            />
            <div className="user-profile-info">
              <span className="user-name">{user?.name || "User"}</span>
              <span className="user-email">{user?.email || ""}</span>
            </div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Sign out of account"
          >
            <IconLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu size={22} />
            </button>

            {/* Breadcrumbs or Page Title */}
            <div className="breadcrumbs-wrap">
              {breadcrumbs.length > 0 ? (
                <div className="breadcrumbs">
                  <Link to="/dashboard">Dashboard</Link>
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={idx}>
                      <span className="bc-separator">/</span>
                      {bc.path ? (
                        <Link to={bc.path}>{bc.label}</Link>
                      ) : (
                        <span className="bc-current">{bc.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : null}
              <h1 className="page-header-title">{title}</h1>
            </div>
          </div>

          <div className="topbar-right">
            {right}
            <div className="topbar-user-pill">
              <Avatar
                src={user?.avatar}
                name={user?.name || "User"}
                size="sm"
              />
              <span className="topbar-user-name">{user?.name || "User"}</span>
            </div>
          </div>
        </header>

        <main className="page-main-content">{children}</main>
      </div>
    </div>
  );
}
