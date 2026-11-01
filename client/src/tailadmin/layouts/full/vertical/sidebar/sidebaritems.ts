export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: string;
  children?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  isPro?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: string;
  id?: number;
  to?: string;
  items?: MenuItem[];
  children?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  isPro?: boolean;
}

import { uniqueId } from 'lodash';

/* ======================================================================= *
 *  Study Hub BD, admin navigation
 *
 *  Every item maps to a section of the public website and to the part of
 *  content/site-content.json that drives it. The grouping follows how an
 *  editor thinks about the site, not how the JSON is shaped. The full map is
 *  in Docs/ADMIN-CONTENT-MAP.md. The dashboard is the template's own.
 * ======================================================================= */

const SidebarContent: MenuItem[] = [
  {
    heading: 'Overview',
    children: [
      {
        name: 'Dashboard',
        icon: 'solar:widget-2-linear',
        id: uniqueId(),
        url: '/',
        isPro: false,
      },
    ],
  },

  {
    heading: 'Students',
    children: [
      {
        name: 'Students',
        icon: 'solar:users-group-rounded-linear',
        id: uniqueId(),
        url: '/students',
        isPro: false,
      },
      {
        name: 'Applications & visa',
        icon: 'solar:map-arrow-square-linear',
        id: uniqueId(),
        url: '/students/applications',
        isPro: false,
      },
      {
        name: 'Documents',
        icon: 'solar:folder-with-files-linear',
        id: uniqueId(),
        url: '/students/documents',
        isPro: false,
      },
      {
        name: 'Messages',
        icon: 'solar:chat-round-line-linear',
        id: uniqueId(),
        url: '/students/messages',
        isPro: false,
      },
      {
        name: 'Announcements',
        icon: 'solar:bell-linear',
        id: uniqueId(),
        url: '/students/announcements',
        isPro: false,
      },
      {
        name: 'Bookings',
        icon: 'solar:calendar-mark-linear',
        id: uniqueId(),
        url: '/students/bookings',
        isPro: false,
      },
    ],
  },

  {
    heading: 'Website content',
    children: [
      {
        name: 'Home page',
        icon: 'solar:home-smile-linear',
        id: uniqueId(),
        url: '/pages/home',
        isPro: false,
      },
      {
        name: 'About page',
        icon: 'solar:info-circle-linear',
        id: uniqueId(),
        url: '/pages/about',
        isPro: false,
      },
      {
        name: 'Services',
        icon: 'solar:checklist-minimalistic-linear',
        id: uniqueId(),
        url: '/pages/services',
        isPro: false,
      },
      {
        name: 'Destinations',
        icon: 'solar:global-linear',
        id: uniqueId(),
        url: '/pages/destinations',
        isPro: false,
      },
      {
        name: 'Success stories',
        icon: 'solar:star-linear',
        id: uniqueId(),
        url: '/pages/success',
        isPro: false,
      },
      {
        name: 'IELTS course',
        icon: 'solar:notebook-linear',
        id: uniqueId(),
        url: '/pages/ielts',
        isPro: false,
      },
      {
        name: 'Contact page',
        icon: 'solar:phone-calling-linear',
        id: uniqueId(),
        url: '/pages/contact',
        isPro: false,
      },
    ],
  },

  {
    heading: 'Site',
    children: [
      {
        name: 'Media library',
        icon: 'solar:gallery-wide-linear',
        id: uniqueId(),
        url: '/media',
        isPro: false,
      },
      {
        name: 'Legal & compliance',
        icon: 'solar:shield-check-linear',
        id: uniqueId(),
        url: '/legal',
        isPro: false,
      },
      {
        name: 'Settings',
        icon: 'solar:settings-linear',
        id: uniqueId(),
        url: '/settings',
        isPro: false,
      },
    ],
  },
];

export default SidebarContent;
