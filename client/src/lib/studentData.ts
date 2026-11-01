/* ====================================================================== *
 *  STUDENT PORTAL: DATA MODEL AND SAMPLE RECORD                         *
 *                                                                        *
 *  THIS FILE CONTAINS SAMPLE DATA, NOT A REAL STUDENT.                   *
 *                                                                        *
 *  The portal is a working front end with no back end behind it. There   *
 *  is no student account system, no private file storage and no server    *
 *  that could hold a passport scan. Everything below is a fixture so the  *
 *  screens can be seen, used and reviewed.                               *
 *                                                                        *
 *  Before this goes anywhere near a real student:                        *
 *   1. Authentication has to move to a server. A password compared in     *
 *      the browser protects nothing. See `studentSession` in            *
 *      `contexts/StudentContext.tsx`.                                     *
 *   2. Documents have to live in private, access-controlled storage.      *
 *      NOT in this repository: it is a public GitHub repo, and the site   *
 *      uses the repo as its datastore. A passport scan committed there    *
 *      is a passport scan published to the world.                         *
 *   3. Messages need a real transport and an audit trail.                 *
 *                                                                        *
 *  The vocabulary, the six stages and the split between the          *
 *  university file and the visa file, follows how the office actually    *
 *  works, and matches the reference portal in D:\project\VFI_website.     *
 * ====================================================================== */

/** Where a document stands. Named the way the office would say it. */
export type DocStatus =
  | "accepted" // checked in-house and ready to send
  | "review" // with Study Hub, being checked
  | "needed" // the student has to provide it
  | "rejected" // sent back, needs doing again
  | "later"; // not due at this stage

/** Where a stage stands. Mirrors the reference portal's done/now/todo. */
export type StageState = "done" | "now" | "todo";

export type Stage = {
  name: string;
  state: StageState;
  /** "12 Feb 2026", or "Expected Jul 2026" for a stage not yet reached */
  when: string;
  note?: string;
};

export type StudentDoc = {
  id: string;
  /** What the office calls it, not a generic noun */
  name: string;
  /** The university application file, or the visa file the embassy reads */
  group: "application" | "visa";
  status: DocStatus;
  /** Present once something has been uploaded */
  file?: string;
  size?: string;
  updated?: string;
  /** One line saying what is wrong, or what is wanted */
  note?: string;
};

export type Message = {
  id: string;
  from: "student" | "agency";
  author: string;
  /** ISO date-time, rendered in the reader's locale */
  at: string;
  body: string;
};

export type StudentRecord = {
  name: string;
  email: string;
  studentId: string;
  counsellor: string;
  country: string;
  university: string;
  course: string;
  intake: string;
  stages: Stage[];
  documents: StudentDoc[];
  messages: Message[];
};

/* ---------------------------------------------------------------------- *
 *  Status presentation                                                    *
 *                                                                         *
 *  Following the GOV.UK task-list guidance: a finished item is plain      *
 *  text rather than a coloured tag, and an item that is not due yet is    *
 *  grey with no background. Colour is spent only where the reader has     *
 *  something to decide, which keeps the coloured area of the screen      *
 *  small, the way the measured product screens do.                        *
 * ---------------------------------------------------------------------- */

export const DOC_STATUS: Record<
  DocStatus,
  { label: string; tone: "plain" | "info" | "warn" | "bad" | "mute" }
> = {
  accepted: { label: "Accepted", tone: "plain" },
  review: { label: "With Study Hub", tone: "info" },
  needed: { label: "We need this", tone: "warn" },
  rejected: { label: "Send again", tone: "bad" },
  later: { label: "Not needed yet", tone: "mute" },
};

export const STAGE_STATE: Record<StageState, string> = {
  done: "Completed",
  now: "In progress",
  todo: "Not started",
};

/** Documents the student still has to act on. The portal's whole point. */
export function openItems(docs: StudentDoc[]): StudentDoc[] {
  return docs.filter(d => d.status === "needed" || d.status === "rejected");
}

/** Accepted out of everything that is actually due. Items marked "later"
 *  are left out of both halves, so the figure cannot read as worse than
 *  it is just because a later stage has not started. */
export function fileProgress(docs: StudentDoc[]): {
  accepted: number;
  due: number;
} {
  const due = docs.filter(d => d.status !== "later");
  return {
    accepted: due.filter(d => d.status === "accepted").length,
    due: due.length,
  };
}

export function unreadFromAgency(
  messages: Message[],
  lastRead: string | null
): number {
  if (!lastRead) return messages.filter(m => m.from === "agency").length;
  return messages.filter(m => m.from === "agency" && m.at > lastRead).length;
}

/* ---------------------------------------------------------------------- *
 *  THE SAMPLE RECORD                                                      *
 *  One student, mid-way through a UK application: the university file is  *
 *  done and the visa file is waiting on her.                              *
 * ---------------------------------------------------------------------- */

export const SAMPLE_STUDENT: StudentRecord = {
  name: "Nusrat Jahan",
  email: "student@demo.studyhubbd.com",
  studentId: "SHB-2026-0184",
  counsellor: "Rakib Hasan",
  country: "United Kingdom",
  university: "University of Portsmouth",
  course: "MSc Computer Science",
  intake: "September 2026",

  stages: [
    {
      name: "Counselling",
      state: "done",
      when: "12 Feb 2026",
      note: "Course and country agreed after two sittings.",
    },
    {
      name: "Documents",
      state: "done",
      when: "03 Mar 2026",
      note: "Transcripts, certificates and IELTS report checked in-house.",
    },
    {
      name: "Application sent",
      state: "done",
      when: "21 Mar 2026",
      note: "Submitted to Portsmouth with the SOP and one reference.",
    },
    {
      name: "Offer received",
      state: "done",
      when: "22 Apr 2026",
      note: "Unconditional offer. Deposit paid 06 May, CAS issued 19 May.",
    },
    {
      name: "Visa file",
      state: "now",
      when: "Since 20 May 2026",
      note: "Two items left before the file can be submitted.",
    },
    {
      name: "Departure",
      state: "todo",
      when: "Expected Sep 2026",
    },
  ],

  documents: [
    // ---- the university file ----
    {
      id: "passport",
      name: "Passport, bio page",
      group: "application",
      status: "accepted",
      file: "passport-bio-page.pdf",
      size: "1.2 MB",
      updated: "2026-02-28",
    },
    {
      id: "transcripts",
      name: "Bachelor transcripts",
      group: "application",
      status: "accepted",
      file: "bsc-transcripts-2025.pdf",
      size: "2.8 MB",
      updated: "2026-03-01",
    },
    {
      id: "certificates",
      name: "SSC and HSC certificates",
      group: "application",
      status: "accepted",
      file: "ssc-hsc-certificates.pdf",
      size: "3.4 MB",
      updated: "2026-03-01",
    },
    {
      id: "ielts",
      name: "IELTS test report form",
      group: "application",
      status: "accepted",
      file: "ielts-trf-7-0.pdf",
      size: "640 KB",
      updated: "2026-03-02",
      note: "Overall 7.0, no band below 6.5.",
    },
    {
      id: "sop",
      name: "Statement of purpose",
      group: "application",
      status: "accepted",
      file: "statement-of-purpose-v4.pdf",
      size: "180 KB",
      updated: "2026-03-18",
      note: "Fourth draft, written with the office.",
    },
    {
      id: "reference",
      name: "Academic reference",
      group: "application",
      status: "accepted",
      file: "reference-dr-karim.pdf",
      size: "210 KB",
      updated: "2026-03-19",
    },

    // ---- the visa file ----
    {
      id: "cas",
      name: "CAS letter",
      group: "visa",
      status: "accepted",
      file: "cas-portsmouth.pdf",
      size: "320 KB",
      updated: "2026-05-19",
      note: "Issued 19 May. Valid for six months.",
    },
    {
      id: "deposit",
      name: "Tuition deposit receipt",
      group: "visa",
      status: "accepted",
      file: "tuition-deposit-receipt.pdf",
      size: "140 KB",
      updated: "2026-05-06",
    },
    {
      id: "bank",
      name: "Bank statement, 28 days",
      group: "visa",
      status: "needed",
      note: "UKVI wants 28 unbroken days with the full amount held the whole time. Your last statement covered 19 days, so the count starts again.",
    },
    {
      id: "sponsor",
      name: "Sponsor affidavit and NID",
      group: "visa",
      status: "review",
      file: "sponsor-affidavit.pdf",
      size: "890 KB",
      updated: "2026-05-24",
      note: "With the office since Sunday. We will confirm by Thursday.",
    },
    {
      id: "photos",
      name: "Passport photographs",
      group: "visa",
      status: "rejected",
      file: "photos-set-1.jpg",
      size: "2.1 MB",
      updated: "2026-05-21",
      note: "The background is cream. UKVI needs plain light grey or white, so please have another set taken.",
    },
    {
      id: "visaform",
      name: "Online visa application form",
      group: "visa",
      status: "review",
      file: "ukvi-form-draft.pdf",
      size: "410 KB",
      updated: "2026-05-23",
      note: "Checked once. One section on travel history still to confirm with you.",
    },
    {
      id: "tb",
      name: "TB test certificate",
      group: "visa",
      status: "later",
      note: "Book this after the bank statement is settled. The certificate lasts six months.",
    },
    {
      id: "police",
      name: "Police clearance",
      group: "visa",
      status: "later",
      note: "Not required for this course. Listed in case the university asks later.",
    },
  ],

  messages: [
    {
      id: "m1",
      from: "agency",
      author: "Rakib Hasan",
      at: "2026-05-19T10:12:00+06:00",
      body: "Good news. Portsmouth issued your CAS this morning and it is in your documents now. The visa file is the last stretch.",
    },
    {
      id: "m2",
      from: "student",
      author: "Nusrat Jahan",
      at: "2026-05-20T18:40:00+06:00",
      body: "Thank you! I have sent the bank statement from my father's account. Is that enough?",
    },
    {
      id: "m3",
      from: "agency",
      author: "Rakib Hasan",
      at: "2026-05-21T09:05:00+06:00",
      body: "It is the right account, but it covers 19 days. UKVI asks for 28 unbroken days with the full amount held the whole time. If the balance dips even once, the count starts again. Get a fresh statement after 28 clear days and we will file that week.",
    },
    {
      id: "m4",
      from: "agency",
      author: "Rakib Hasan",
      at: "2026-05-21T09:11:00+06:00",
      body: "The photographs were taken against a cream wall. It has to be plain light grey or white. Any studio near the college gate will know the format if you ask for UK visa size.",
    },
    {
      id: "m5",
      from: "student",
      author: "Nusrat Jahan",
      at: "2026-05-24T20:02:00+06:00",
      body: "Understood. The affidavit is uploaded. I will get the photos done this week and the statement on 18 June when the 28 days are complete.",
    },
  ],
};
