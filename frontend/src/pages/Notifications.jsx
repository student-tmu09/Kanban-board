import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { socket } from "../Api/socket";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "../Api/notificationApi";
import { unwrap } from "../utils/response";
import { useToast } from "../context/ToastContext";
import { IconBell, IconCheck, IconSparkles } from "../components/Icons";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const r = await getNotifications();
      setItems(unwrap(r, []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const handleNewNotification = (notif) => {
      setItems((prev) => [
        notif,
        ...prev.filter((item) => item._id !== notif._id)
      ]);
      showToast("🔔 " + (notif.message || "New notification received!"), "info");
    };

    socket.on("notification", handleNewNotification);
    return () => socket.off("notification", handleNewNotification);
  }, [showToast]);

  const read = async (id) => {
    try {
      await markNotificationAsRead(id);
      showToast("Marked as read", "success");
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      showToast("All notifications marked as read", "success");
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <Layout
      title="Notifications"
      breadcrumbs={[{ label: "Notifications" }]}
      right={
        unreadCount > 0 && (
          <button className="btn-secondary" onClick={markAllRead}>
            <IconCheck size={16} />
            <span>Mark all read</span>
          </button>
        )
      }
    >
      <div className="notifications-header-box">
        <div className="modern-tabs-bar">
          <button
            className={`modern-tab-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({items.length})
          </button>
          <button
            className={`modern-tab-btn ${filter === "unread" ? "active" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      <div className="notifications-container">
        {loading ? (
          <div className="empty-loading-card">
            <span className="spinner-circle" />
            <p>Loading notifications...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="notification-list-wrap">
            {filteredItems.map((n) => (
              <div
                className={`notification-card ${n.isRead ? "is-read" : "is-unread"}`}
                key={n._id}
              >
                <div className="notification-icon-box">
                  <IconBell size={18} />
                </div>
                <div className="notification-body">
                  <div className="notification-top">
                    <span className="notification-type-badge">
                      {n.type?.replace(/_/g, " ") || "Notification"}
                    </span>
                    <span className="notification-date">
                      {n.createdAt
                        ? new Date(n.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "Just now"}
                    </span>
                  </div>
                  <p className="notification-msg">{n.message}</p>
                </div>
                <div className="notification-actions">
                  {!n.isRead ? (
                    <button
                      className="btn-ghost-sm"
                      onClick={() => read(n._id)}
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="read-status-check">✓ Read</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <div className="empty-icon-box">
              <IconSparkles size={36} />
            </div>
            <h4>You're all caught up!</h4>
            <p>
              {filter === "unread"
                ? "No unread notifications at the moment."
                : "No notifications found."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
