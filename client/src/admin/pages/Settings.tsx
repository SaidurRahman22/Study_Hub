import { useAdmin } from "../AdminContext";

/* ====================================================================== *
 *  SITE SETTINGS                                                         *
 *                                                                        *
 *  Two top level sections of the content document:                       *
 *                                                                        *
 *    content.global  the name, the phone numbers, the address and the    *
 *                    social links that the header and footer read on     *
 *                    every page                                          *
 *    content.legal   the registration details and the data contact that  *
 *                    the privacy and terms pages quote                   *
 *                                                                        *
 *  Several legal values ship as placeholder tokens in square brackets,   *
 *  for example [TRADE LICENCE NUMBER]. They are deliberate: nobody has   *
 *  supplied the real number yet, and the public pages print the token so  *
 *  the gap is visible rather than quietly wrong. This screen flags them   *
 *  and leaves them alone. Only someone holding the paperwork can fill    *
 *  one in.                                                               *
 *                                                                        *
 *  content.legal also carries the full privacy and terms documents under *
 *  a "documents" key. Nothing here edits those, so every write spreads    *
 *  the existing object rather than replacing it.                         *
 *                                                                        *
 *  No save button lives here. patch() marks the document dirty and the   *
 *  save bar in the shell commits the lot.                                *
 * ====================================================================== */

/** A value still sitting at its square bracket placeholder. */
const PLACEHOLDER = /^\[[A-Z0-9 /.-]+\]$/;

type Social = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
};

type Global = {
  siteName?: string;
  tagline?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  address?: string;
  website?: string;
  whatsapp?: string;
  registrationLink?: string;
  socialMedia?: Social;
  copyrightYear?: string;
};

type DataContact = {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
};

type Legal = {
  lastUpdated?: string;
  tradeLicence?: string;
  binNumber?: string;
  dataContact?: DataContact;
  [key: string]: unknown;
};

function Field({
  id,
  label,
  value,
  onChange,
  hint,
  type = "text",
  multiline = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  type?: string;
  multiline?: boolean;
}) {
  const unfilled = PLACEHOLDER.test(value);
  return (
    <div className="ad-field">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 7,
        }}
      >
        <label className="ad-label" htmlFor={id} style={{ marginBottom: 0 }}>
          {label}
        </label>
        {unfilled && (
          <span className="ad-tag ad-tag-warn">Not filled in yet</span>
        )}
      </div>
      {multiline ? (
        <textarea
          id={id}
          className="ad-input"
          rows={2}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="ad-input"
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
      {hint && <p className="ad-hint">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const { content, patch } = useAdmin();

  const global: Global =
    content && typeof content.global === "object" && content.global
      ? (content.global as Global)
      : {};

  const social: Social =
    typeof global.socialMedia === "object" && global.socialMedia
      ? global.socialMedia
      : {};

  const legal: Legal =
    content && typeof content.legal === "object" && content.legal
      ? (content.legal as Legal)
      : {};

  const dataContact: DataContact =
    typeof legal.dataContact === "object" && legal.dataContact
      ? legal.dataContact
      : {};

  const setGlobal = (field: keyof Global, value: string) =>
    patch("global", { ...global, [field]: value });

  const setSocial = (field: keyof Social, value: string) =>
    patch("global", { ...global, socialMedia: { ...social, [field]: value } });

  const setLegal = (field: string, value: string) =>
    patch("legal", { ...legal, [field]: value });

  const setContact = (field: keyof DataContact, value: string) =>
    patch("legal", {
      ...legal,
      dataContact: { ...dataContact, [field]: value },
    });

  if (!content) {
    return (
      <>
        <div className="ad-head">
          <div>
            <h1 className="ad-title">Site settings</h1>
          </div>
        </div>
        <p className="ad-note">The content has not loaded yet.</p>
      </>
    );
  }

  const unfilledCount = [
    legal.tradeLicence ?? "",
    legal.binNumber ?? "",
    dataContact.name ?? "",
    dataContact.role ?? "",
    dataContact.email ?? "",
    dataContact.phone ?? "",
  ].filter(v => PLACEHOLDER.test(v)).length;

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Site settings</h1>
          <p className="ad-sub">
            The details the header, the footer and the legal pages read on every
            page of the site.
          </p>
        </div>
      </div>

      <div className="ad-grid">
        {/* ---- identity -------------------------------------------------- */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Identity</h2>
              <p className="ad-card-note">
                The name and line that appear in the header and the footer.
              </p>
            </div>
          </div>
          <div className="ad-card-body">
            <div className="ad-row ad-row-2">
              <Field
                id="st-site-name"
                label="Site name"
                value={global.siteName ?? ""}
                onChange={v => setGlobal("siteName", v)}
              />
              <Field
                id="st-tagline"
                label="Tagline"
                value={global.tagline ?? ""}
                onChange={v => setGlobal("tagline", v)}
              />
            </div>
            <div className="ad-row ad-row-2">
              <Field
                id="st-website"
                label="Website"
                value={global.website ?? ""}
                onChange={v => setGlobal("website", v)}
                hint="Shown as text, so no https prefix is needed."
              />
              <Field
                id="st-copyright-year"
                label="Copyright year"
                value={global.copyrightYear ?? ""}
                onChange={v => setGlobal("copyrightYear", v)}
                hint="Printed in the footer notice."
              />
            </div>
          </div>
        </section>

        {/* ---- contact --------------------------------------------------- */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Contact</h2>
              <p className="ad-card-note">
                Used by the call, WhatsApp and email buttons across the site.
              </p>
            </div>
          </div>
          <div className="ad-card-body">
            <div className="ad-row ad-row-3">
              <Field
                id="st-phone1"
                label="Phone, first"
                type="tel"
                value={global.phone1 ?? ""}
                onChange={v => setGlobal("phone1", v)}
              />
              <Field
                id="st-phone2"
                label="Phone, second"
                type="tel"
                value={global.phone2 ?? ""}
                onChange={v => setGlobal("phone2", v)}
              />
              <Field
                id="st-whatsapp"
                label="WhatsApp number"
                type="tel"
                value={global.whatsapp ?? ""}
                onChange={v => setGlobal("whatsapp", v)}
                hint="Digits only, no spaces or dashes."
              />
            </div>
            <Field
              id="st-email"
              label="Email"
              type="email"
              value={global.email ?? ""}
              onChange={v => setGlobal("email", v)}
            />
            <Field
              id="st-address"
              label="Office address"
              multiline
              value={global.address ?? ""}
              onChange={v => setGlobal("address", v)}
            />
            <Field
              id="st-registration-link"
              label="Registration form link"
              type="url"
              value={global.registrationLink ?? ""}
              onChange={v => setGlobal("registrationLink", v)}
              hint="Where the registration buttons send people."
            />
          </div>
        </section>

        {/* ---- social ---------------------------------------------------- */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Social links</h2>
              <p className="ad-card-note">
                A single hash means the icon is shown but goes nowhere. Paste
                the full address to make it work.
              </p>
            </div>
          </div>
          <div className="ad-card-body">
            <div className="ad-row ad-row-2">
              <Field
                id="st-facebook"
                label="Facebook"
                value={social.facebook ?? ""}
                onChange={v => setSocial("facebook", v)}
              />
              <Field
                id="st-instagram"
                label="Instagram"
                value={social.instagram ?? ""}
                onChange={v => setSocial("instagram", v)}
              />
            </div>
            <div className="ad-row ad-row-2">
              <Field
                id="st-linkedin"
                label="LinkedIn"
                value={social.linkedin ?? ""}
                onChange={v => setSocial("linkedin", v)}
              />
              <Field
                id="st-youtube"
                label="YouTube"
                value={social.youtube ?? ""}
                onChange={v => setSocial("youtube", v)}
              />
            </div>
          </div>
        </section>

        {/* ---- legal ----------------------------------------------------- */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Legal and registration</h2>
              <p className="ad-card-note">
                Quoted on the privacy policy and the terms page.
              </p>
            </div>
          </div>
          <div className="ad-card-body">
            {unfilledCount > 0 && (
              <p className="ad-note ad-note-warn" style={{ marginBottom: 18 }}>
                <span>
                  {unfilledCount === 1
                    ? "One value below is still a placeholder."
                    : `${unfilledCount} values below are still placeholders.`}{" "}
                  The public pages print the placeholder text exactly as it is
                  here. Replace it only with the real detail from the paperwork.
                </span>
              </p>
            )}

            <div className="ad-row ad-row-2">
              <Field
                id="st-trade-licence"
                label="Trade licence number"
                value={legal.tradeLicence ?? ""}
                onChange={v => setLegal("tradeLicence", v)}
              />
              <Field
                id="st-bin-number"
                label="BIN or TIN number"
                value={legal.binNumber ?? ""}
                onChange={v => setLegal("binNumber", v)}
              />
            </div>

            <Field
              id="st-last-updated"
              label="Legal pages last updated"
              value={legal.lastUpdated ?? ""}
              onChange={v => setLegal("lastUpdated", v)}
              hint="Written out, for example 1 November 2026. Change it when the wording of a legal page changes."
            />

            <h3 className="ad-card-title" style={{ marginTop: 10 }}>
              Data contact
            </h3>
            <p className="ad-card-note" style={{ marginBottom: 14 }}>
              The person a visitor writes to about their personal information.
            </p>

            <div className="ad-row ad-row-2">
              <Field
                id="st-contact-name"
                label="Name"
                value={dataContact.name ?? ""}
                onChange={v => setContact("name", v)}
              />
              <Field
                id="st-contact-role"
                label="Job title"
                value={dataContact.role ?? ""}
                onChange={v => setContact("role", v)}
              />
            </div>
            <div className="ad-row ad-row-2">
              <Field
                id="st-contact-email"
                label="Email"
                type="email"
                value={dataContact.email ?? ""}
                onChange={v => setContact("email", v)}
              />
              <Field
                id="st-contact-phone"
                label="Phone"
                type="tel"
                value={dataContact.phone ?? ""}
                onChange={v => setContact("phone", v)}
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
