import { Link, useLocation } from "wouter";
import { Bell } from "lucide-react";
import { useStudent } from "@/contexts/StudentContext";
import { unreadNotifications } from "@/lib/studentData";

/* ====================================================================== *
 *  The bell.                                                             *
 *                                                                        *
 *  A link to the notifications page rather than a drop-down. A panel     *
 *  that hangs off a button has to survive every way a pointer can        *
 *  behave; a link just navigates, works the same under a thumb, and can  *
 *  be opened in a new tab.                                               *
 * ====================================================================== */

export default function NotificationBell() {
  const { student, notesLastRead } = useStudent();
  const [location] = useLocation();
  if (!student) return null;

  const unread = unreadNotifications(student.notifications, notesLastRead);

  return (
    <Link
      href="/student/notifications"
      className="sp-bell"
      aria-current={location === "/student/notifications" ? "page" : undefined}
      aria-label={
        unread > 0
          ? `Notifications, ${unread} new`
          : "Notifications, nothing new"
      }
    >
      <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
      {unread > 0 && (
        <span className="sp-bell-count" aria-hidden="true">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
