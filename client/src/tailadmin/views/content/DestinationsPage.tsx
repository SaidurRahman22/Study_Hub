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

/* Destinations page editor. Drives content.destinationsPage and
 * content.destinations on the public Destinations page ("/destinations"). The
 * country cards and country pages are not in the CMS (see the notice below). */

export default function DestinationsPage() {
  const { content } = useContentStore();
  const whyCards = content.destinationsPage?.whyCards ?? [];
  const destinations = content.destinations ?? [];

  return (
    <>
      <PageHead
        title="Destinations page"
        subtitle="The page header, the reasons to study abroad, and the destination list."
        previewUrl="/destinations"
      />

      <GapNotice>
        The <strong>country cards</strong> on this page and every{' '}
        <strong>country page</strong> (summary, universities, costs, and the{' '}
        <strong>“what a degree opens up”</strong> section) are written in{' '}
        <code>client/src/lib/countries.ts</code>, not the CMS, and cannot be edited
        here. See <code>Docs/ADMIN-CONTENT-MAP.md §4A</code>.
      </GapNotice>

      <Section title="Page header" note="The heading and intro at the top of the page.">
        <Row>
          <TextField label="Title" path="destinationsPage.heroTitle" />
          <TextField label="Highlighted word" path="destinationsPage.heroHighlight" />
        </Row>
        <TextAreaField label="Subtitle" path="destinationsPage.heroSubtitle" rows={2} />
      </Section>

      <Section title="Before you choose" note="The heading and the cards under it.">
        <Row>
          <TextField label="Title" path="destinationsPage.whyTitle" />
          <TextField label="Highlighted word" path="destinationsPage.whyHighlight" />
        </Row>
        {whyCards.map((_, i) => (
          <ItemCard key={i}>
            <TextField label="Title" path={`destinationsPage.whyCards[${i}].title`} />
            <TextAreaField
              label="Description"
              path={`destinationsPage.whyCards[${i}].description`}
              rows={2}
            />
          </ItemCard>
        ))}
      </Section>

      <Section title="Closing call to action" note="The banner near the foot of the page.">
        <TextField label="Title" path="destinationsPage.ctaTitle" />
        <TextAreaField label="Subtitle" path="destinationsPage.ctaSubtitle" rows={2} />
      </Section>

      <Section
        title={`Destination list (${destinations.length})`}
        note="This list only feeds the home page country grid and the consultation dropdown. The country pages come from the code file noted at the top."
      >
        {destinations.map((_, i) => (
          <Row key={i}>
            <TextField label="Name" path={`destinations[${i}].name`} />
            <TextField label="Flag" path={`destinations[${i}].flag`} />
          </Row>
        ))}
      </Section>

      <SaveBar />
    </>
  );
}
