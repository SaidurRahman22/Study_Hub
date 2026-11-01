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

/* Home page editor drives content.home on the public home page ("/").
 * This is the exemplar for the website content forms: PageHead, Section cards,
 * TextField/TextAreaField bound to dotted paths, a GapNotice for hardcoded
 * parts, and a SaveBar. */

export default function HomePage() {
  const { content } = useContentStore();
  const stats = content.home?.hero?.stats ?? [];

  return (
    <>
      <PageHead
        title="Home page"
        subtitle="The hero, the three headline numbers, and the section intros on the front page."
        previewUrl="/"
      />

      <Section title="Hero" note="The first thing a visitor sees at the top of the page.">
        <TextField label="Badge" path="home.hero.badge" />
        <Row>
          <TextField label="Title" path="home.hero.title" />
          <TextField
            label="Highlighted word"
            path="home.hero.titleHighlight"
            hint="Shown in the brand colour inside the title."
          />
        </Row>
        <TextAreaField label="Description" path="home.hero.description" rows={3} />
        <Row>
          <TextField label="Primary button" path="home.hero.ctaButton" />
          <TextField label="Secondary button" path="home.hero.learnMoreButton" />
        </Row>
      </Section>

      <Section
        title="Headline numbers"
        note="The three figures under the hero. These also appear on the About and Success Stories pages."
      >
        {stats.map((_, i) => (
          <Row key={i}>
            <TextField label={`Figure ${i + 1} value`} path={`home.hero.stats[${i}].value`} />
            <TextField label={`Figure ${i + 1} label`} path={`home.hero.stats[${i}].label`} />
          </Row>
        ))}
      </Section>

      <Section title="Section intros" note="The heading and subtitle above each block down the page.">
        <ItemCard>
          <Row>
            <TextField label="Services title" path="home.servicesSection.title" />
            <TextField label="Services highlight" path="home.servicesSection.titleHighlight" />
          </Row>
          <TextAreaField label="Services subtitle" path="home.servicesSection.subtitle" rows={2} />
        </ItemCard>
        <ItemCard>
          <Row>
            <TextField label="Destinations title" path="home.destinationsSection.title" />
            <TextField label="Destinations highlight" path="home.destinationsSection.titleHighlight" />
          </Row>
          <TextAreaField label="Destinations subtitle" path="home.destinationsSection.subtitle" rows={2} />
        </ItemCard>
        <ItemCard>
          <Row>
            <TextField label="Success title" path="home.successSection.title" />
            <TextField label="Success highlight" path="home.successSection.titleHighlight" />
          </Row>
          <TextAreaField label="Success subtitle" path="home.successSection.subtitle" rows={2} />
        </ItemCard>
      </Section>

      <Section title="Closing call to action" note="The banner near the foot of the page.">
        <TextField label="Title" path="home.ctaSection.title" />
        <TextAreaField label="Subtitle" path="home.ctaSection.subtitle" rows={2} />
        <TextField label="Button" path="home.ctaSection.buttonText" />
      </Section>

      <GapNotice>
        Some blocks on the home page are written in the page code, not here: the
        <strong> “How we work” steps</strong>, the <strong>intake months and photos</strong> under
        each country card, and four sections switched off until there is content for them
        (visa success rate, certificates, events, partner universities). See
        <code> Docs/ADMIN-CONTENT-MAP.md §4B-4C</code>.
      </GapNotice>

      <SaveBar />
    </>
  );
}
