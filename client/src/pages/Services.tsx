import {
  CheckCircle,
  BookOpen,
  Globe,
  Users,
  Award,
  Zap,
  Heart,
  FileText,
} from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import RichText from "@/components/RichText";
import { useConsultation } from "@/components/ConsultationDialog";

export default function Services() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const services = content.services;
  const page = content.servicesPage;
  const g = content.global;
  const icons = [
    BookOpen,
    Globe,
    Users,
    Award,
    FileText,
    Globe,
    Zap,
    Heart,
    Award,
    Users,
    Globe,
    Heart,
  ];

  return (
    <div className="bg-off-white">
      {/* Hero Section */}
      <section className="py-8 sm:py-10 md:py-12 bg-gradient-to-br from-light-golden to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-6">
              {page.heroTitle}{" "}
              <span className="text-golden">{page.heroHighlight}</span>
            </h1>
            <RichText
              as="p"
              className="text-sm sm:text-base md:text-lg text-gray leading-relaxed"
              text={page.heroSubtitle}
            />
          </div>
        </div>
      </section>

      {/* All Services */}
      <section className="py-8 sm:py-10 md:py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {services.map((service, index) => {
              const Icon = icons[index % icons.length];
              return (
                <div
                  key={index}
                  className="bg-light-golden rounded-xl p-6 sm:p-8 border-2 border-golden hover:border-dark-golden hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-golden to-dark-golden rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                    <Icon size={28} className="text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2 sm:mb-3">
                    {service.title}
                  </h3>
                  <RichText
                    as="p"
                    className="text-sm sm:text-base text-gray"
                    text={service.description}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-8 sm:py-10 md:py-12 bg-light-golden">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-8 sm:mb-16 text-center">
            {page.categoriesTitle}{" "}
            <span className="text-golden">{page.categoriesHighlight}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            {page.categories.map(category => (
              <div
                key={category.id}
                className="bg-white rounded-xl p-6 sm:p-8 border-l-4 border-golden"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">
                  {category.title}
                </h3>
                <ul className="space-y-3 sm:space-y-4">
                  {category.items.map(item => (
                    <li key={item} className="flex gap-3">
                      <CheckCircle
                        size={24}
                        className="text-golden flex-shrink-0"
                      />
                      <RichText
                        as="span"
                        className="text-sm sm:text-base text-gray"
                        text={item}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-golden to-dark-golden text-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            {page.ctaTitle}
          </h2>
          <RichText
            as="p"
            className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto"
            text={page.ctaSubtitle}
          />
          <button
            type="button"
            onClick={() => openConsultation("Services")}
            className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-black text-white font-bold rounded-lg hover:bg-opacity-90 transition-all text-sm sm:text-base"
          >
            {page.ctaButton}
          </button>
        </div>
      </section>
    </div>
  );
}
