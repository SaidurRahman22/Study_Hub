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

/* About page editor. Drives content.about on the public About page ("/about").
 * Same shape as the Home page exemplar: PageHead, Section cards with fields on
 * dotted paths, a GapNotice for the parts still in code, then a SaveBar. */

export default function AboutPage() {
  const { content } = useContentStore();
  const values = content.about?.values ?? [];
  const whyChooseUs = content.about?.whyChooseUs ?? [];

  return (
    <>
      <PageHead
        title="About page"
        subtitle="The hero, mission and vision, the values, and the reasons to choose the office."
        previewUrl="/about"
      />

      <Section title="Hero" note="The heading and intro at the top of the page.">
        <Row>
          <TextField label="Title" path="about.hero.title" />
          <TextField
            label="Highlighted word"
            path="about.hero.titleHighlight"
            hint="Shown in the brand colour inside the title."
          />
        </Row>
        <TextAreaField label="Subtitle" path="about.hero.subtitle" rows={3} />
      </Section>

      <Section
        title="Mission and vision"
        note="Two short statements shown near the top of the page."
      >
        <TextAreaField label="Mission" path="about.mission" rows={3} />
        <TextAreaField label="Vision" path="about.vision" rows={3} />
      </Section>

      <Section title="What we hold to" note="The values shown as a row of cards.">
        {values.map((_, i) => (
          <ItemCard key={i}>
            <TextField label="Title" path={`about.values[${i}].title`} />
            <TextAreaField
              label="Description"
              path={`about.values[${i}].description`}
              rows={2}
            />
          </ItemCard>
        ))}
      </Section>

      <Section title="Why choose us" note="The heading and the reasons listed under it.">
        <Row>
          <TextField label="Title" path="about.whyChooseTitle" />
          <TextField label="Highlighted word" path="about.whyChooseHighlight" />
        </Row>
        {whyChooseUs.map((_, i) => (
          <ItemCard key={i}>
            <TextField label="Title" path={`about.whyChooseUs[${i}].title`} />
            <TextAreaField
              label="Description"
              path={`about.whyChooseUs[${i}].description`}
              rows={2}
            />
          </ItemCard>
        ))}
      </Section>

      <Section title="Closing call to action" note="The banner near the foot of the page.">
        <TextField label="Title" path="about.ctaTitle" />
        <TextField label="Button" path="about.ctaButton" />
      </Section>

      <GapNotice>
        Some of the About page is written in the page code, not here: the three{' '}
        <strong>story paragraphs</strong>, the <strong>Tangail photo grid</strong>, the{' '}
        <strong>“why Tangail” cards</strong>, and the{' '}
        <strong>“Where our students go” country grid</strong> (which reads{' '}
        <code>lib/countries.ts</code>). See <code>Docs/ADMIN-CONTENT-MAP.md §4A-4B</code>.
      </GapNotice>

      <SaveBar />
    </>
  );
}
