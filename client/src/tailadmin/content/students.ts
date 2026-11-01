import { SAMPLE_STUDENT, type StudentRecord } from '@/lib/studentData';

/* ======================================================================= *
 *  Student fixtures for the admin UI (frontend phase)
 *
 *  The portal has no backend, so these are sample records that let the
 *  admin's student screens be seen and used. The first is the same student
 *  the portal shows; the others are lighter records at different stages so
 *  the lists and tables read realistically. Names, countries and
 *  universities are drawn from the site's own world. None of this is real.
 *
 *  Replaced by a real database and private file store in the backend phase
 *  (see Docs/ADMIN-CONTENT-MAP.md §5).
 * ======================================================================= */

export type { StudentRecord } from '@/lib/studentData';
export {
  DOC_STATUS,
  STAGE_STATE,
  openItems,
  fileProgress,
  unreadFromAgency,
  unreadNotifications,
} from '@/lib/studentData';

export const STUDENTS: StudentRecord[] = [
  SAMPLE_STUDENT,
  {
    name: 'Tanvir Ahmed',
    email: 'tanvir.demo@studyhubbd.com',
    studentId: 'SHB-2026-0191',
    counsellor: 'Rakib Hasan',
    country: 'Canada',
    university: 'University of Windsor',
    course: 'MEng Electrical Engineering',
    intake: 'January 2027',
    stages: [
      { name: 'Counselling', state: 'done', when: '18 Apr 2026' },
      { name: 'Documents', state: 'now', when: 'Since 02 May 2026', note: 'Transcripts in, IELTS booked.' },
      { name: 'Application sent', state: 'todo', when: 'Expected Jun 2026' },
      { name: 'Offer received', state: 'todo', when: '' },
      { name: 'Visa file', state: 'todo', when: '' },
      { name: 'Departure', state: 'todo', when: 'Expected Dec 2026' },
    ],
    documents: [
      { id: 'passport', name: 'Passport, bio page', group: 'application', status: 'accepted', file: 'passport.pdf', size: '1.1 MB', updated: '2026-04-20' },
      { id: 'transcripts', name: 'Bachelor transcripts', group: 'application', status: 'review', file: 'transcripts.pdf', size: '2.4 MB', updated: '2026-05-02' },
      { id: 'ielts', name: 'IELTS test report', group: 'application', status: 'needed', note: 'Booked for 14 June. Upload the TRF when it arrives.' },
    ],
    messages: [
      { id: 'm1', from: 'agency', author: 'Rakib Hasan', at: '2026-05-02T11:00:00+06:00', body: 'Transcripts received and with us for checking. IELTS is the one thing left before we apply.' },
    ],
    notifications: [
      { id: 'n1', kind: 'document', title: 'Transcripts received', at: '2026-05-02T11:02:00+06:00', href: '/student/documents' },
    ],
  },
  {
    name: 'Sadia Islam',
    email: 'sadia.demo@studyhubbd.com',
    studentId: 'SHB-2026-0203',
    counsellor: 'Amirul Islam',
    country: 'Australia',
    university: 'Deakin University',
    course: 'Master of Business Analytics',
    intake: 'July 2026',
    stages: [
      { name: 'Counselling', state: 'done', when: '09 Jan 2026' },
      { name: 'Documents', state: 'done', when: '01 Feb 2026' },
      { name: 'Application sent', state: 'done', when: '20 Feb 2026' },
      { name: 'Offer received', state: 'done', when: '15 Mar 2026', note: 'Conditional offer, condition met.' },
      { name: 'Visa file', state: 'now', when: 'Since 28 Apr 2026', note: 'GTE statement and OSHC left.' },
      { name: 'Departure', state: 'todo', when: 'Expected Jun 2026' },
    ],
    documents: [
      { id: 'coe', name: 'Confirmation of Enrolment', group: 'visa', status: 'accepted', file: 'coe.pdf', size: '300 KB', updated: '2026-04-27' },
      { id: 'gte', name: 'GTE statement', group: 'visa', status: 'review', file: 'gte-draft.pdf', size: '160 KB', updated: '2026-05-10', note: 'Draft read once; one paragraph to tighten.' },
      { id: 'oshc', name: 'Overseas health cover', group: 'visa', status: 'needed', note: 'Buy single cover for the full course length.' },
    ],
    messages: [
      { id: 'm1', from: 'student', author: 'Sadia Islam', at: '2026-05-10T19:00:00+06:00', body: 'I have uploaded the GTE draft. Please check when you can.' },
    ],
    notifications: [
      { id: 'n1', kind: 'stage', title: 'Visa file stage started', at: '2026-04-28T10:00:00+06:00' },
    ],
  },
  {
    name: 'Mehedi Hasan',
    email: 'mehedi.demo@studyhubbd.com',
    studentId: 'SHB-2026-0210',
    counsellor: 'Rakib Hasan',
    country: 'United Kingdom',
    university: 'Coventry University',
    course: 'MSc Data Science',
    intake: 'September 2026',
    stages: [
      { name: 'Counselling', state: 'now', when: 'Since 22 May 2026', note: 'Shortlisting two courses.' },
      { name: 'Documents', state: 'todo', when: '' },
      { name: 'Application sent', state: 'todo', when: '' },
      { name: 'Offer received', state: 'todo', when: '' },
      { name: 'Visa file', state: 'todo', when: '' },
      { name: 'Departure', state: 'todo', when: '' },
    ],
    documents: [
      { id: 'passport', name: 'Passport, bio page', group: 'application', status: 'needed', note: 'Needed to start the file.' },
    ],
    messages: [],
    notifications: [
      { id: 'n1', kind: 'announcement', title: 'Welcome to Study Hub BD', body: 'Your counsellor is Rakib Hasan.', at: '2026-05-22T10:00:00+06:00' },
    ],
  },
];

/* ---------------------------------------------------------------------- *
 *  Bookings, consultation requests.
 *
 *  Not captured anywhere on the live site yet (the form posts to WhatsApp
 *  or email). These fixtures show how the inbox would read once the form
 *  writes to a store. See ADMIN-CONTENT-MAP.md §5.
 * ---------------------------------------------------------------------- */

export type BookingStatus = 'new' | 'contacted' | 'booked' | 'closed';

export type Booking = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  destination: string;
  need: string;
  message?: string;
  /** ISO date-time */
  at: string;
  status: BookingStatus;
};

export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; tone: 'info' | 'warn' | 'success' | 'mute' }
> = {
  new: { label: 'New', tone: 'warn' },
  contacted: { label: 'Contacted', tone: 'info' },
  booked: { label: 'Booked', tone: 'success' },
  closed: { label: 'Closed', tone: 'mute' },
};

export const BOOKINGS: Booking[] = [
  {
    id: 'b1',
    name: 'Rifat Chowdhury',
    phone: '01712-004455',
    email: 'rifat.demo@example.com',
    destination: 'United Kingdom',
    need: 'Student visa and documents',
    message: 'Finished BSc, IELTS 6.5. Want September intake.',
    at: '2026-05-25T14:20:00+06:00',
    status: 'new',
  },
  {
    id: 'b2',
    name: 'Nabila Karim',
    phone: '01899-112233',
    destination: 'Canada',
    need: 'University admission',
    message: 'Looking for MBA options, 3.4 CGPA.',
    at: '2026-05-24T10:05:00+06:00',
    status: 'contacted',
  },
  {
    id: 'b3',
    name: 'Imran Hossain',
    phone: '01555-667788',
    email: 'imran.demo@example.com',
    destination: 'Australia',
    need: 'IELTS preparation',
    at: '2026-05-23T17:40:00+06:00',
    status: 'booked',
  },
  {
    id: 'b4',
    name: 'Farhana Akter',
    phone: '01633-998877',
    destination: 'Not decided yet',
    need: 'Scholarship',
    message: 'Wants fully funded options.',
    at: '2026-05-21T09:15:00+06:00',
    status: 'closed',
  },
];

/** The stage a student is currently on, if any. */
export function activeStage(s: StudentRecord) {
  return s.stages.find((st) => st.state === 'now');
}
