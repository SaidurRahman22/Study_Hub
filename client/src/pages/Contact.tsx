import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useCms } from "@/contexts/CmsContext";
import RichText from "@/components/RichText";
import { useConsultation } from "@/components/ConsultationDialog";

export default function Contact() {
  const { content } = useCms();
  const { open: openConsultation } = useConsultation();
  const c = content.contact;
  const g = content.global;

  return (
    <div className="bg-off-white">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-light-golden to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-black mb-6">
              {c.hero.title}{" "}
              <span className="text-golden">{c.hero.titleHighlight}</span>
            </h1>
            <RichText
              as="p"
              className="text-xl text-gray leading-relaxed"
              text={c.hero.subtitle}
            />
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Address */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-golden to-dark-golden rounded-lg flex items-center justify-center mx-auto mb-4">
                <MapPin size={32} className="text-black" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Address</h3>
              <RichText as="p" className="text-gray text-sm" text={c.address} />
            </div>

            {/* Phone 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-golden to-dark-golden rounded-lg flex items-center justify-center mx-auto mb-4">
                <Phone size={32} className="text-black" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Phone</h3>
              <p className="text-gray text-sm">
                {c.phone1}
                <br />
                {c.phone2}
              </p>
            </div>

            {/* Email */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-golden to-dark-golden rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-black" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Email</h3>
              <p className="text-gray text-sm">
                <a
                  href={`mailto:${c.email}`}
                  className="hover:text-golden transition-colors"
                >
                  {c.email}
                </a>
              </p>
            </div>

            {/* Website */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-golden to-dark-golden rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-black" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Website</h3>
              <p className="text-gray text-sm">
                <a
                  href={`https://${c.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-golden transition-colors"
                >
                  {c.website}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 bg-light-golden">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
              Send us a <span className="text-golden">Message</span>
            </h2>

            <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-golden">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your name"
                      className="w-full px-4 py-3 border-2 border-light-golden rounded-lg focus:outline-none focus:border-golden focus:ring-2 focus:ring-golden focus:ring-opacity-20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border-2 border-light-golden rounded-lg focus:outline-none focus:border-golden focus:ring-2 focus:ring-golden focus:ring-opacity-20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+880..."
                      className="w-full px-4 py-3 border-2 border-light-golden rounded-lg focus:outline-none focus:border-golden focus:ring-2 focus:ring-golden focus:ring-opacity-20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Subject
                    </label>
                    <select className="w-full px-4 py-3 border-2 border-light-golden rounded-lg focus:outline-none focus:border-golden focus:ring-2 focus:ring-golden focus:ring-opacity-20 transition-all">
                      <option>Select a subject</option>
                      <option>IELTS Inquiry</option>
                      <option>Japanese Language</option>
                      <option>Admission Support</option>
                      <option>Visa Assistance</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Message
                  </label>
                  <textarea
                    placeholder="Your message..."
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-light-golden rounded-lg focus:outline-none focus:border-golden focus:ring-2 focus:ring-golden focus:ring-opacity-20 transition-all resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-gradient-to-r from-golden to-dark-golden text-black font-bold rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
                >
                  Send Message
                </button>
              </form>

              <p className="text-center text-gray text-sm mt-6">
                Or register directly through our{" "}
                <button
                  type="button"
                  onClick={() => openConsultation("Contact")}
                  className="text-golden hover:underline font-semibold"
                >
                  online form
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12 text-center">
            Visit Our <span className="text-golden">Office</span>
          </h2>

          <div className="rounded-xl overflow-hidden shadow-lg h-96 border-4 border-golden">
            <iframe
              src={c.mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray mb-4">Located at {c.address}</p>
            <a
              href={c.mapDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-gradient-to-r from-golden to-dark-golden text-black font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              Get Directions
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-golden to-dark-golden text-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{c.ctaTitle}</h2>
          <RichText
            as="p"
            className="text-lg mb-8 max-w-2xl mx-auto"
            text={c.ctaSubtitle}
          />
          <button
            type="button"
            onClick={() => openConsultation("Contact")}
            className="inline-block px-8 py-4 bg-black text-golden font-bold rounded-lg hover:bg-opacity-90 transition-all"
          >
            {c.ctaButton}
          </button>
        </div>
      </section>
    </div>
  );
}
