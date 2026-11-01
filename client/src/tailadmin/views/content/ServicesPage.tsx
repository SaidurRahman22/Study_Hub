import {
  GapNotice,
  ItemCard,
  PageHead,
  Row,
  SaveBar,
  Section,
  TextAreaField,
  TextAreaListField,
  TextField,
} from 'src/content/fields';
import { useContentStore } from 'src/content/store';

/* Services page editor. Drives content.servicesPage and content.services on the
 * public Services page ("/services"). */

export default function ServicesPage() {
  const { content } = useContentStore();
  const categories = content.servicesPage?.categories ?? [];
  const services = content.services ?? [];

  return (
    <>
      <PageHead
        title="Services page"
        subtitle="The page header, the service categories, the full list of services, and the closing banner."
        previewUrl="/services"
      />

      <Section title="Page header" note="The heading and intro at the top of the page.">
        <Row>
          <TextField label="Title" path="servicesPage.heroTitle" />
          <TextField label="Highlighted word" path="servicesPage.heroHighlight" />
        </Row>
        <TextAreaField label="Subtitle" path="servicesPage.heroSubtitle" rows={2} />
      </Section>

      <Section title="Service categories" note="The grouped categories shown as cards.">
        {categories.map((_, i) => (
          <ItemCard key={i}>
            <TextField label="Title" path={`servicesPage.categories[${i}].title`} />
            <TextAreaListField
              label="Items"
              path={`servicesPage.categories[${i}].items`}
              hint="One item per line."
            />
          </ItemCard>
        ))}
      </Section>

      <Section
        title={`The full list (${services.length} services)`}
        note="Every service the office offers. This list also appears on the About page."
      >
        {services.map((_, i) => (
          <ItemCard key={i}>
            <TextField label="Title" path={`services[${i}].title`} />
            <TextAreaField label="Description" path={`services[${i}].description`} rows={2} />
          </ItemCard>
        ))}
      </Section>

      <Section title="Closing call to action" note="The banner near the foot of the page.">
        <TextField label="Title" path="servicesPage.ctaTitle" />
        <TextAreaField label="Subtitle" path="servicesPage.ctaSubtitle" rows={2} />
        <TextField label="Button" path="servicesPage.ctaButton" />
      </Section>

      <GapNotice>
        Two blocks on the Services page are written in the page code, not here: the{' '}
        <strong>“one office, the whole journey” steps</strong> and the{' '}
        <strong>“a look at the work” photo strip</strong>. See{' '}
        <code>Docs/ADMIN-CONTENT-MAP.md §4B</code>.
      </GapNotice>

      <SaveBar />
    </>
  );
}
