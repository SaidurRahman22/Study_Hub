import {
  ItemCard,
  PageHead,
  Row,
  SaveBar,
  Section,
  TextAreaField,
  TextField,
} from 'src/content/fields';
import { useContentStore } from 'src/content/store';

/* Success stories page editor. Drives content.successPage and
 * content.successStories on the public page ("/success-stories"). */

export default function SuccessPage() {
  const { content } = useContentStore();
  const stories = content.successStories ?? [];
  const testimonials = content.successPage?.testimonials ?? [];

  return (
    <>
      <PageHead
        title="Success stories page"
        subtitle="The page header, the student stories, the short testimonials, and the closing banner."
        previewUrl="/success-stories"
      />

      <Section title="Page header" note="The headings and intro at the top of the page.">
        <Row>
          <TextField label="Title" path="successPage.heroTitle" />
          <TextField label="Highlighted word" path="successPage.heroHighlight" />
        </Row>
        <TextAreaField label="Subtitle" path="successPage.heroSubtitle" rows={2} />
        <Row>
          <TextField label="Section title" path="successPage.sectionTitle" />
          <TextField label="Section highlight" path="successPage.sectionHighlight" />
        </Row>
      </Section>

      <Section
        title={`Student stories (${stories.length})`}
        note="Real students and their quotes. Only publish a story once the student has given permission."
      >
        {stories.map((_, i) => (
          <ItemCard key={i}>
            <Row>
              <TextField label="Name" path={`successStories[${i}].name`} />
              <TextField label="Country" path={`successStories[${i}].country`} />
            </Row>
            <Row>
              <TextField label="University" path={`successStories[${i}].university`} />
              <TextField label="Program" path={`successStories[${i}].program`} />
            </Row>
            <TextAreaField label="Quote" path={`successStories[${i}].quote`} rows={2} />
          </ItemCard>
        ))}
      </Section>

      <Section title="Short testimonials" note="The heading and the shorter quotes under it.">
        <Row>
          <TextField label="Title" path="successPage.testimonialTitle" />
          <TextField label="Highlighted word" path="successPage.testimonialHighlight" />
        </Row>
        {testimonials.map((_, i) => (
          <ItemCard key={i}>
            <TextAreaField
              label="Quote"
              path={`successPage.testimonials[${i}].quote`}
              rows={2}
            />
            <TextField label="Author" path={`successPage.testimonials[${i}].author`} />
          </ItemCard>
        ))}
      </Section>

      <Section title="Closing call to action" note="The banner near the foot of the page.">
        <TextField label="Title" path="successPage.ctaTitle" />
        <TextAreaField label="Subtitle" path="successPage.ctaSubtitle" rows={2} />
        <TextField label="Button" path="successPage.ctaButton" />
      </Section>

      <SaveBar />
    </>
  );
}
