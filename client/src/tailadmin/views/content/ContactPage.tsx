import {
  GapNotice,
  PageHead,
  Row,
  SaveBar,
  Section,
  TextAreaField,
  TextField,
} from 'src/content/fields';

/* Contact page editor. Drives content.contact on the public Contact page
 * ("/contact"). There are no arrays to map here, so it reads no store directly:
 * every field binds itself to its dotted path. */

export default function ContactPage() {
  return (
    <>
      <PageHead
        title="Contact page"
        subtitle="The header, the contact details, the map links, and the closing banner."
        previewUrl="/contact"
      />

      <Section title="Header" note="The heading and intro at the top of the page.">
        <Row>
          <TextField label="Title" path="contact.hero.title" />
          <TextField label="Highlighted word" path="contact.hero.titleHighlight" />
        </Row>
        <TextAreaField label="Subtitle" path="contact.hero.subtitle" rows={2} />
      </Section>

      <Section title="Contact details" note="Shown on the page and used by the contact buttons.">
        <TextAreaField label="Address" path="contact.address" rows={2} />
        <Row>
          <TextField label="Phone 1" path="contact.phone1" />
          <TextField label="Phone 2" path="contact.phone2" />
        </Row>
        <Row>
          <TextField label="Email" path="contact.email" />
          <TextField label="Website" path="contact.website" />
        <TextField
          label="Opening hours"
          path="contact.hours"
          hint="Shown on the contact page beside the map. Confirm these before launch."
        />
        </Row>
      </Section>

      <Section title="Map" note="The embedded map and the directions link.">
        <TextField
          label="Map embed URL"
          path="contact.mapEmbedUrl"
          hint="The src of the Google Maps embed iframe."
        />
        <TextField
          label="Directions URL"
          path="contact.mapDirectionsUrl"
          hint="Where the “Get directions” link points."
        />
      </Section>

      <Section title="Closing call to action" note="The banner near the foot of the page.">
        <TextField label="Title" path="contact.ctaTitle" />
        <TextAreaField label="Subtitle" path="contact.ctaSubtitle" rows={2} />
        <TextField label="Button" path="contact.ctaButton" />
      </Section>

      <GapNotice>
        The <strong>contact form</strong> on this page is static: it looks like a form
        but sends nothing. Wiring it to an inbox is a later decision. See{' '}
        <code>Docs/ADMIN-CONTENT-MAP.md §4E</code>.
      </GapNotice>

      <SaveBar />
    </>
  );
}
