import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Icon } from '@iconify/react';
import CardBox from 'src/components/shared/CardBox';
import { Button } from 'src/components/ui/button';
import { Textarea } from 'src/components/ui/textarea';
import { EmptyState, ScreenHead } from 'src/content/ui';
import { useStudents } from 'src/content/students-store';
import { useListSearch } from 'src/content/search';

/* Messages, conversations with students, as a master-detail view. The left
 * list picks a student; the right shows the thread and a working reply.
 *
 * Threads come from the API and a reply is sent for real, which also emails
 * the student. Nothing is attached: files belong on the Documents screen,
 * where each one gets a status and is kept on the private disk. */

export default function MessagesPage() {
  const { students, sendMessage } = useStudents();
  const q = useListSearch('Search students');

  const [selectedId, setSelectedId] = useState<string | undefined>(
    students[0]?.studentId
  );
  const [draft, setDraft] = useState('');

  const list = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(q)),
    [students, q]
  );

  // Derive the selected student from the store each render, so a new message
  // shows at once. If the chosen id is gone (or none), fall back to the first
  // student in the filtered list.
  const selected = list.find((s) => s.studentId === selectedId) ?? list[0];

  function send() {
    const text = draft.trim();
    if (!text || !selected) return;
    sendMessage(selected.studentId, text);
    setDraft('');
  }

  // No students at all: nothing to show.
  if (students.length === 0) {
    return (
      <>
        <ScreenHead title="Messages" subtitle="Replies and questions from students." />
        <CardBox>
          <EmptyState
            icon="solar:chat-round-line-linear"
            title="No students yet"
            note="Add a student first, then your conversations will show here."
          />
        </CardBox>
      </>
    );
  }

  return (
    <>
      <ScreenHead title="Messages" subtitle="Replies and questions from students." />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left, student list */}
        <CardBox>
          <div className="p-3">
            {list.map((s) => {
              const last = s.messages[s.messages.length - 1];
              const active = selected?.studentId === s.studentId;
              return (
                <button
                  key={s.studentId}
                  type="button"
                  onClick={() => setSelectedId(s.studentId)}
                  className={`w-full text-left rounded-lg px-3 py-3 transition-colors ${
                    active ? 'bg-lightprimary' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {s.messages.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {last ? last.body : 'No messages yet.'}
                  </p>
                </button>
              );
            })}
            {list.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No students match your search.
              </p>
            )}
          </div>
        </CardBox>

        {/* Right, thread */}
        <CardBox>
          <div className="p-6 flex flex-col">
            {selected ? (
              <>
                <div className="pb-4 mb-4 border-b border-ld">
                  <h2 className="text-lg font-semibold text-foreground">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.studentId}</p>
                </div>

                {selected.messages.length === 0 ? (
                  <EmptyState
                    icon="solar:chat-round-line-linear"
                    title="No messages yet"
                    note="When this student writes in, the conversation will show here."
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {selected.messages.map((m) => {
                      const fromAgency = m.from === 'agency';
                      return (
                        <div
                          key={m.id}
                          className={`flex ${fromAgency ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                              fromAgency ? 'bg-lightprimary' : 'border border-ld'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-6 mb-1">
                              <span className="text-xs font-medium text-foreground">
                                {m.author}
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(m.at), 'd MMM yyyy, h:mm a')}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-line">
                              {m.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-ld">
                  <Textarea
                    placeholder="Write a reply"
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="flex items-center justify-between gap-4 mt-3">
                    <p className="text-xs text-muted-foreground">
                      Sending emails {selected.name.split(' ')[0]} a copy as well.
                    </p>
                    <Button onClick={send} disabled={!draft.trim()}>
                      <Icon icon="solar:plain-linear" width={18} className="mr-1.5" />
                      Send
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                icon="solar:chat-round-line-linear"
                title="No student selected"
                note="Search for a student on the left to open the conversation."
              />
            )}
          </div>
        </CardBox>
      </div>
    </>
  );
}
