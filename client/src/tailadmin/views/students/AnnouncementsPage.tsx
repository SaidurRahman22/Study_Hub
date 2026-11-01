import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import CardBox from 'src/components/shared/CardBox';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Textarea } from 'src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/components/ui/table';
import { ScreenHead, StatusTag, type Tone } from 'src/content/ui';
import { useStudents } from 'src/content/students-store';
import { useListSearch } from 'src/content/search';

/* Announcements. Post a notice to one student or to everyone, then read the
 * feed of every notification flattened across students (newest first). Store-
 * backed: posting adds a notification to each targeted student right away. */

const KIND_TAG: Record<
  'document' | 'stage' | 'message' | 'announcement',
  { tone: Tone; label: string }
> = {
  document: { tone: 'info', label: 'Document' },
  stage: { tone: 'primary', label: 'Stage' },
  message: { tone: 'mute', label: 'Message' },
  announcement: { tone: 'warn', label: 'Announcement' },
};

export default function AnnouncementsPage() {
  const { students, postAnnouncement } = useStudents();
  const q = useListSearch('Search announcements');

  const [audience, setAudience] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  function post() {
    if (!title.trim()) return;
    postAnnouncement(audience, title.trim(), body.trim());
    setTitle('');
    setBody('');
  }

  const feed = useMemo(() => {
    const rows = students.flatMap((student) =>
      student.notifications.map((note) => ({ student, note }))
    );
    rows.sort((a, b) => (a.note.at < b.note.at ? 1 : -1));
    return rows.filter(({ student, note }) =>
      [note.title, student.name].join(' ').toLowerCase().includes(q)
    );
  }, [students, q]);

  return (
    <>
      <ScreenHead
        title="Announcements"
        subtitle="Post a notice to one student or to everyone."
      />

      <CardBox className="mb-6">
        <div className="p-6">
          <h2 className="text-base font-semibold text-foreground">Post an announcement</h2>

          <div className="mt-4 grid gap-4">
            <div>
              <Label>Title</Label>
              <Input
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What students will see in their bell"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                className="mt-1.5"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add any detail (optional)"
              />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="w-full sm:max-w-xs">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    {students.map((s) => (
                      <SelectItem key={s.studentId} value={s.studentId}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={post} disabled={!title.trim()}>
                Post
              </Button>
            </div>
          </div>
        </div>
      </CardBox>

      <CardBox>
        <div className="p-4 sm:p-6">
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Kind</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Title</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Student</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.map(({ student, note }) => {
                  const tag = KIND_TAG[note.kind];
                  return (
                    <TableRow key={`${student.studentId}-${note.id}`}>
                      <TableCell className="py-3">
                        <StatusTag tone={tag.tone}>{tag.label}</StatusTag>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-foreground">{note.title}</div>
                        {note.body && (
                          <div className="text-xs text-muted-foreground max-w-[360px] truncate">
                            {note.body}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-foreground/90">{student.name}</TableCell>
                      <TableCell className="py-3 whitespace-nowrap text-muted-foreground">
                        {format(new Date(note.at), 'd MMM yyyy')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden flex flex-col gap-3">
            {feed.map(({ student, note }) => {
              const tag = KIND_TAG[note.kind];
              return (
                <div
                  key={`${student.studentId}-${note.id}`}
                  className="rounded-lg border border-ld p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <StatusTag tone={tag.tone}>{tag.label}</StatusTag>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(note.at), 'd MMM yyyy')}
                    </span>
                  </div>
                  <div className="mt-3 font-medium text-foreground">{note.title}</div>
                  {note.body && (
                    <div className="text-sm text-muted-foreground">{note.body}</div>
                  )}
                  <div className="mt-2 text-sm text-muted-foreground">{student.name}</div>
                </div>
              );
            })}
          </div>

          {feed.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No announcements match your search.
            </p>
          )}
        </div>
      </CardBox>
    </>
  );
}
