import { Award, Globe, Users } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import RichText from "@/components/RichText";
import { useConsultation } from "@/components/ConsultationDialog";

export default function SuccessStories() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const stories = content.successStories;
  const g = content.global;
  const page = content.successPage;

  const stats = [
    { icon: Users, number: "500+", label: "Students Placed" },
    { icon: Globe, number: "10+", label: "Countries" },
    { icon: Award, number: "50+", label: "Universities" },
  ];

  return (
    <div className="bg-off-white">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-light-golden to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-black mb-6">
              {page.heroTitle}{" "}
              <span className="text-golden">{page.heroHighlight}</span>
            </h1>
            <RichText
              as="p"
              className="text-xl text-gray leading-relaxed"
              text={page.heroSubtitle}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-golden to-dark-golden rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon size={40} className="text-black" />
                  </div>
                  <p className="text-4xl font-bold text-golden mb-2">
                    {stat.number}
                  </p>
                  <p className="text-gray text-lg">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Success Stories Grid */}
      <section className="py-20 bg-light-golden">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            {page.sectionTitle}{" "}
            <span className="text-golden">{page.sectionHighlight}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.map((story, index) => (
              <div
                key={index}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 border-2 border-golden"
              >
                {/* Image */}
                <div className="h-64 bg-gradient-to-br from-golden to-dark-golden flex items-center justify-center overflow-hidden">
                  <img
                    src={story.image}
                    alt={story.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-black mb-2">
                    {story.name}
                  </h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray mb-1">
                      <span className="font-semibold">University:</span>{" "}
                      <RichText as="span" text={story.university} />
                    </p>
                    <p className="text-sm text-golden font-semibold">
                      <span className="text-gray">Country:</span>{" "}
                      {story.country}
                    </p>
                  </div>
                  <div className="border-t-2 border-light-golden pt-4">
                    <RichText
                      as="p"
                      className="text-gray italic"
                      text={`"${story.quote}"`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            {page.testimonialTitle}{" "}
            <span className="text-golden">{page.testimonialHighlight}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {page.testimonials.map(item => (
              <div
                key={item.id}
                className="bg-light-golden rounded-xl p-8 border-l-4 border-golden"
              >
                <RichText
                  as="p"
                  className="text-gray mb-4 italic"
                  text={`"${item.quote}"`}
                />
                <p className="font-bold text-black">- {item.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-golden to-dark-golden text-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {page.ctaTitle}
          </h2>
          <RichText
            as="p"
            className="text-lg mb-8 max-w-2xl mx-auto"
            text={page.ctaSubtitle}
          />
          <button
            type="button"
            onClick={() => openConsultation("SuccessStories")}
            className="inline-block px-8 py-4 bg-black text-golden font-bold rounded-lg hover:bg-opacity-90 transition-all"
          >
            {page.ctaButton}
          </button>
        </div>
      </section>
    </div>
  );
}
