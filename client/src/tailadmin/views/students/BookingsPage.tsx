import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import CardBox from 'src/components/shared/CardBox';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
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
import { Caveat, ScreenHead } from 'src/content/ui';
import { BOOKING_STATUS, type Booking, type BookingStatus } from 'src/content/students';
import { useStudents, type NewBookingInput } from 'src/content/students-store';
import { useListSearch } from 'src/content/search';

/* Bookings, consultation requests from the website plus ones the admin adds.
 * Store-backed: the create dialog adds a request, and each row's status is a
 * Select that writes straight back to the store. */

const STATUS_KEYS = Object.keys(BOOKING_STATUS) as BookingStatus[];

const BLANK: NewBookingInput = {
  name: '',
  phone: '',
  email: '',
  destination: '',
  need: '',
  date: '',
  online: false,
};

export default function BookingsPage() {
  const { bookings, addBooking, setBookingStatus } = useStudents();
  const q = useListSearch('Search bookings');

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<NewBookingInput>(BLANK);

  const rows = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => (a.at < b.at ? 1 : -1));
    return sorted.filter((b) =>
      [b.name, b.destination, b.need].join(' ').toLowerCase().includes(q)
    );
  }, [bookings, q]);

  const set =
    (k: keyof NewBookingInput) => (v: string | boolean) =>
      setForm((f) => ({ ...f, [k]: v }));

  const canCreate =
    form.name.trim() &&
    form.phone.trim() &&
    form.destination.trim() &&
    form.need.trim() &&
    (!form.online || (form.email ?? '').trim());

  function create() {
    if (!canCreate) return;
    addBooking({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: (form.email ?? '').trim(),
      destination: form.destination.trim(),
      need: form.need.trim(),
      date: form.date,
      online: form.online,
    });
    setForm(BLANK);
    setAddOpen(false);
  }

  /* The status control: a Select bound to the row's status, used by both the
   * desktop table and the mobile cards so they stay in step. */
  const statusSelect = (b: Booking, triggerClass: string) => (
    <Select
      value={b.status}
      onValueChange={(v) => setBookingStatus(b.id, v as BookingStatus)}
    >
      <SelectTrigger size="sm" className={triggerClass}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_KEYS.map((k) => (
          <SelectItem key={k} value={k}>
            {BOOKING_STATUS[k].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <ScreenHead
        title="Bookings"
        subtitle="Consultation requests from the website and ones you add."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Icon icon="solar:add-circle-linear" width={18} className="mr-1.5" />
            Create booking
          </Button>
        }
      />

      <Caveat>
        Website bookings will auto-save here and send a copy to WhatsApp once the backend is built.
        For now this is in-memory sample data (see <code>Docs/ADMIN-CONTENT-MAP.md §5</code>).
      </Caveat>

      <CardBox>
        <div className="p-4 sm:p-6">
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Name</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Contact</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Destination</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Need</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">When</TableHead>
                  <TableHead className="text-sm font-semibold py-3 whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="py-3 font-medium text-foreground">{b.name}</TableCell>
                    <TableCell className="py-3">
                      <div className="text-foreground/90">{b.phone}</div>
                      {b.email && (
                        <div className="text-xs text-muted-foreground">{b.email}</div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-foreground/90">{b.destination}</TableCell>
                    <TableCell className="py-3 text-foreground/90">{b.need}</TableCell>
                    <TableCell className="py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(b.at), 'd MMM yyyy')}
                    </TableCell>
                    <TableCell className="py-3">{statusSelect(b, 'w-[130px]')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden flex flex-col gap-3">
            {rows.map((b) => (
              <div key={b.id} className="rounded-lg border border-ld p-4">
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(b.at), 'd MMM yyyy')}
                  </div>
                </div>
                <dl className="mt-3 flex flex-col gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Contact</dt>
                    <dd className="text-foreground/90">{b.phone}</dd>
                    {b.email && (
                      <dd className="text-xs text-muted-foreground">{b.email}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Destination</dt>
                    <dd className="text-foreground/90">{b.destination}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Need</dt>
                    <dd className="text-foreground/90">{b.need}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center gap-2">
                  {statusSelect(b, 'w-full')}
                  <Button
                    asChild
                    variant="outline"
                    className="h-9 px-3 text-xs shrink-0"
                  >
                    <a href={`tel:${b.phone}`}>Open</a>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No bookings match your search.
            </p>
          )}
        </div>
      </CardBox>

      {/* Create booking */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create a booking</DialogTitle>
            <DialogDescription>
              Log a consultation request. Website requests will arrive here on their own once the
              backend is built.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 py-2">
            <Field label="Name" value={form.name} onChange={set('name')} />
            <Field label="Phone" value={form.phone} onChange={set('phone')} />
            <Field
              label={form.online ? 'Email (required for online)' : 'Email'}
              value={form.email ?? ''}
              onChange={set('email')}
              type="email"
            />
            <Field label="Destination" value={form.destination} onChange={set('destination')} />
            <Field label="Need" value={form.need} onChange={set('need')} />
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={form.date}
                onChange={(e) => set('date')(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ld accent-primary"
              checked={form.online}
              onChange={(e) => set('online')(e.target.checked)}
            />
            Online booking
          </label>
          {form.online && (
            <p className="text-xs text-muted-foreground">
              A confirmation email to the student is sent after booking (backend).
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!canCreate}>
              Create booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A labelled text input used in the create dialog. */
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
