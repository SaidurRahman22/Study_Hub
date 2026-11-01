import {
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

/* IELTS course page editor. Drives content.ielts on the public page ("/ielts"). */

export default function IeltsPage() {
  const { content } = useContentStore();
  const curriculum = content.ielts?.curriculum ?? [];
  const whyChooseUs = content.ielts?.whyChooseUs ?? [];

  return (
    <>
      <PageHead
        title="IELTS course page"
        subtitle="The hero, the course facts, the programme, the curriculum, and the reasons to enrol."
        previewUrl="/ielts"
      />

      <Section title="Hero" note="The first thing a visitor sees at the top of the page.">
        <TextField label="Badge" path="ielts.hero.badge" />
        <Row>
          <TextField label="Title" path="ielts.hero.title" />
          <TextField label="Highlighted word" path="ielts.hero.titleHighlight" />
        </Row>
        <TextField label="Title ending" path="ielts.hero.titleSuffix" />
        <TextAreaField label="Description" path="ielts.hero.description" rows={3} />
        <TextField label="Button" path="ielts.hero.ctaButton" />
      </Section>

      <Section title="Course at a glance" note="The headline numbers and the short feature list.">
        <Row>
          <TextField label="Classes" path="ielts.courseStats.classes" />
          <TextField label="Classes per week" path="ielts.courseStats.perWeek" />
        </Row>
        <Row>
          <TextField label="Mock tests" path="ielts.courseStats.mockTests" />
          <TextField label="Support" path="ielts.courseStats.support" />
        </Row>
        <TextAreaListField
          label="Course features"
          path="ielts.courseFeatures"
          hint="One feature per line."
        />
      </Section>

      <Section title="Programme" note="The heading and description for the programme block.">
        <TextField label="Title" path="ielts.programTitle" />
        <TextAreaField label="Description" path="ielts.programDescription" rows={3} />
      </Section>

      <Section title="What you’ll learn" note="The curriculum shown as a row of cards.">
        {curriculum.map((_, i) => (
          <ItemCard key={i}>
            <TextField label="Title" path={`ielts.curriculum[${i}].title`} />
            <TextAreaField
              label="Description"
              path={`ielts.curriculum[${i}].description`}
              rows={2}
            />
          </ItemCard>
        ))}
      </Section>

      <Section title="Why choose our IELTS programme" note="The reasons listed as cards.">
        {whyChooseUs.map((_, i) => (
          <ItemCard key={i}>
            <TextField label="Title" path={`ielts.whyChooseUs[${i}].title`} />
            <TextAreaField
              label="Description"
              path={`ielts.whyChooseUs[${i}].description`}
              rows={2}
            />
          </ItemCard>
        ))}
      </Section>

      <Section title="Closing call to action" note="The banner near the foot of the page.">
        <TextField label="Title" path="ielts.ctaTitle" />
        <TextAreaField label="Subtitle" path="ielts.ctaSubtitle" rows={2} />
      </Section>

      <SaveBar />
    </>
  );
}
