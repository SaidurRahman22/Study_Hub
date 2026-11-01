import {
  GapNotice,
  PageHead,
  Row,
  SaveBar,
  Section,
  TextAreaField,
  TextField,
} from 'src/content/fields';

/* Settings editor, drives content.global, content.header and content.footer.
 * These are the site-wide details used by the header, the footer and the
 * call/WhatsApp/email buttons on every page. No arrays are mapped here, so this
 * page reads nothing from the store directly. */

export default function SettingsPage() {
  return (
    <>
      <PageHead
        title="Settings"
        subtitle="Site name, contact details and social links used across the whole site."
      />

      <Section title="Identity">
        <Row>
          <TextField label="Site name" path="global.siteName" />
          <TextField label="Tagline" path="global.tagline" />
        </Row>
        <Row>
          <TextField
            label="Website"
            path="global.website"
            hint="Shown as text, no https:// needed."
          />
          <TextField label="Copyright year" path="global.copyrightYear" />
        </Row>
      </Section>

      <Section
        title="Contact details"
        note="Used by the call, WhatsApp and email buttons across the site."
      >
        <Row>
          <TextField label="Phone 1" path="global.phone1" />
          <TextField label="Phone 2" path="global.phone2" />
        </Row>
        <Row>
          <TextField
            label="WhatsApp number"
            path="global.whatsapp"
            hint="Digits only, no spaces or dashes."
          />
          <TextField label="Email" path="global.email" />
        </Row>
        <TextAreaField label="Address" path="global.address" rows={2} />
        <TextField
          label="Registration link"
          path="global.registrationLink"
          hint="Where the registration buttons send people."
        />
      </Section>

      <Section
        title="Social links"
        note="Paste the full address. A single # means the icon shows but links nowhere."
      >
        <Row>
          <TextField label="Facebook" path="global.socialMedia.facebook" />
          <TextField label="Instagram" path="global.socialMedia.instagram" />
        </Row>
        <Row>
          <TextField label="LinkedIn" path="global.socialMedia.linkedin" />
          <TextField label="YouTube" path="global.socialMedia.youtube" />
        </Row>
      </Section>

      <Section title="Header & footer">
        <TextField label="Register button text" path="header.registerButtonText" />
        <TextAreaField label="Footer blurb" path="footer.about" rows={2} />
        <TextField label="Footer copyright line" path="footer.copyrightText" />
      </Section>

      <GapNotice>
        The <strong>header menu</strong> and the <strong>footer link columns</strong> are
        fixed in the page code, not here. Changing them means editing the site. See
        <code> Docs/ADMIN-CONTENT-MAP.md §4D</code>.
      </GapNotice>

      <SaveBar />
    </>
  );
}
