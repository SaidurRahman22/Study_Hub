import {
  CheckCircle,
  Clock,
  Users,
  Award,
  BookOpen,
  Target,
} from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import RichText from "@/components/RichText";
import { useConsultation } from "@/components/ConsultationDialog";

export default function IELTS() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const ielts = content.ielts;
  const g = content.global;

  return (
    <div className="bg-off-white">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light-golden via-off-white to-white relative overflow-hidden py-12 md:py-0">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-72 h-72 bg-golden rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-dark-golden rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block mb-4 sm:mb-6">
              <span className="text-golden font-bold text-xs sm:text-sm bg-light-golden px-3 sm:px-4 py-2 rounded-full">
                {ielts.hero.badge}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-6 leading-tight">
              {ielts.hero.title}{" "}
              <span className="text-golden">{ielts.hero.titleHighlight}</span>{" "}
              {ielts.hero.titleSuffix}
            </h1>
            <RichText
              as="p"
              className="text-sm sm:text-base md:text-lg text-gray leading-relaxed mb-6 sm:mb-8"
              text={ielts.hero.description}
            />
            <button
              type="button"
              onClick={() => openConsultation("IELTS")}
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-golden to-dark-golden text-white font-bold rounded-lg hover:shadow-xl transition-all transform hover:scale-105 text-sm sm:text-base"
            >
              {ielts.hero.ctaButton}
            </button>
          </div>
        </div>
      </section>

      {/* Course Overview */}
      <section className="py-8 sm:py-10 md:py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-8 sm:mb-12 text-center">
            Course <span className="text-golden">Overview</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
            <div className="bg-light-golden rounded-xl p-6 sm:p-8 text-center border-2 border-golden">
              <Clock size={32} className="text-golden mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray font-semibold">
                {ielts.courseFeatures[0]}
              </p>
            </div>
            <div className="bg-light-golden rounded-xl p-6 sm:p-8 text-center border-2 border-golden">
              <BookOpen size={32} className="text-golden mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray font-semibold">
                {ielts.courseFeatures[1]}
              </p>
            </div>
            <div className="bg-light-golden rounded-xl p-6 sm:p-8 text-center border-2 border-golden">
              <Users size={32} className="text-golden mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray font-semibold">
                {ielts.courseFeatures[2]}
              </p>
            </div>
            <div className="bg-light-golden rounded-xl p-6 sm:p-8 text-center border-2 border-golden">
              <Award size={32} className="text-golden mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray font-semibold">
                {ielts.courseFeatures[3]}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-golden to-dark-golden text-black rounded-xl p-6 sm:p-8 text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">
              {ielts.programTitle}
            </h3>
            <RichText
              as="p"
              className="text-sm sm:text-base md:text-lg mb-6"
              text={ielts.programDescription}
            />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {ielts.courseStats.classes}
                </p>
                <p className="text-xs sm:text-sm">Classes</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {ielts.courseStats.perWeek}
                </p>
                <p className="text-xs sm:text-sm">Per Week</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {ielts.courseStats.mockTests}
                </p>
                <p className="text-xs sm:text-sm">Mock Test</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className="py-8 sm:py-10 md:py-12 bg-light-golden">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-8 sm:mb-12 text-center">
            What You'll <span className="text-golden">Learn</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {ielts.curriculum.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-6 sm:p-8 border-l-4 border-golden"
              >
                <h3 className="text-lg sm:text-xl font-bold text-black mb-3">
                  {item.title}
                </h3>
                <RichText
                  as="p"
                  className="text-sm sm:text-base text-gray"
                  text={item.description}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-8 sm:py-10 md:py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-8 sm:mb-12 text-center">
            Why Choose Our <span className="text-golden">IELTS Program</span>?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
            {ielts.whyChooseUs.map(item => (
              <div key={item.id} className="flex gap-3 sm:gap-4">
                <CheckCircle
                  size={28}
                  className="text-golden flex-shrink-0 mt-1"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-black mb-1">
                    {item.title}
                  </h3>
                  <RichText
                    as="p"
                    className="text-sm sm:text-base text-gray"
                    text={item.description}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-golden to-dark-golden text-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            {ielts.ctaTitle}
          </h2>
          <RichText
            as="p"
            className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto"
            text={ielts.ctaSubtitle}
          />
          <button
            type="button"
            onClick={() => openConsultation("IELTS")}
            className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-black text-white font-bold rounded-lg hover:bg-opacity-90 transition-all text-sm sm:text-base"
          >
            {ielts.hero.ctaButton}
          </button>
        </div>
      </section>
    </div>
  );
}
