import {
  GapNotice,
  ItemCard,
  PageHead,
  Row,
  SaveBar,
  Section,
  TextAreaField,
  TextField,
} from 'src/content/fields';
import { useContentStore } from 'src/content/store';

/* Legal & compliance editor, drives content.legal. Registration details, the
 * data contact, and the title and summary of each of the six legal documents.
 * The document bodies (numbered sections, lists, tables) are edited in a later
 * phase; this page edits the parts around them. */

const DOC_LABELS: Record<string, string> = {
  privacy: 'Privacy policy',
  terms: 'Terms of service',
  refunds: 'Refund policy',
  complaints: 'Complaints procedure',
  dataProcessing: 'Data processing statement',
  cookies: 'Cookie notice',
};

export default function LegalPage() {
  const { content } = useContentStore();
  const documents = (content.legal?.documents ?? {}) as Record<
    string,
    { title?: string; summary?: string; sections?: unknown[] }
  >;

  return (
    <>
      <PageHead
        title="Legal & compliance"
        subtitle="Registration details, the data contact, and the six legal documents."
        previewUrl="/privacy"
      />

      <Section title="Registration & dates">
        <TextField
          label="Last updated"
          path="legal.lastUpdated"
          hint="Written out, e.g. 1 November 2026."
        />
        <Row>
          <TextField label="Trade licence" path="legal.tradeLicence" />
          <TextField label="BIN number" path="legal.binNumber" />
        </Row>
      </Section>

      <Section
        title="Data contact"
        note="The person a visitor writes to about their personal information."
      >
        <Row>
          <TextField label="Name" path="legal.dataContact.name" />
          <TextField label="Job title" path="legal.dataContact.role" />
        </Row>
        <Row>
          <TextField label="Email" path="legal.dataContact.email" />
          <TextField label="Phone" path="legal.dataContact.phone" />
        </Row>
      </Section>

      <Section
        title="The six documents"
        note="Title and summary for each. The section bodies are edited in the next phase."
      >
        {Object.keys(documents).map((key) => (
          <ItemCard key={key}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {DOC_LABELS[key] ?? key}
              </h3>
              <span className="text-xs text-muted-foreground">
                {documents[key].sections?.length ?? 0} sections
              </span>
            </div>
            <TextField label="Title" path={`legal.documents.${key}.title`} />
            <TextAreaField label="Summary" path={`legal.documents.${key}.summary`} rows={3} />
          </ItemCard>
        ))}
      </Section>

      <GapNotice>
        The <strong>body of each legal document</strong> (numbered sections, lists and
        tables) is edited in the next phase. Any <code>[SQUARE BRACKET]</code> value on the
        live pages is an unfilled placeholder.
      </GapNotice>

      <SaveBar />
    </>
  );
}
