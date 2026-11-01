import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useAdmin } from "../AdminContext";

/* ====================================================================== *
 *  SERVICES                                                              *
 *                                                                        *
 *  Two separate things live under the word "services" in the content     *
 *  document, and the office staff think of them as one page:             *
 *                                                                        *
 *    content.services      the short cards shown on the home page        *
 *    content.servicesPage  the services page itself: hero, the grouped   *
 *                          category lists, and the closing call to       *
 *                          action                                        *
 *                                                                        *
 *  Both are edited here. Nothing saves from this screen. Every change    *
 *  goes through patch(), which marks the document dirty, and the save    *
 *  bar in the shell writes the whole document in one commit.             *
 * ====================================================================== */

type Service = {
  id?: string;
  title?: string;
  description?: string;
};

type Category = {
  id?: string;
  title?: string;
  items?: string[];
};

type ServicesPage = {
  heroTitle?: string;
  heroHighlight?: string;
  heroSubtitle?: string;
  categoriesTitle?: string;
  categoriesHighlight?: string;
  categories?: Category[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButton?: string;
};

/** Move one entry of a list. Out of range moves are ignored, which is what
 *  lets the up button on the first row simply do nothing. */
function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function newId(): string {
  return String(Date.now());
}

export default function Services() {
  const { content, patch } = useAdmin();

  const services: Service[] = Array.isArray(content?.services)
    ? (content.services as Service[])
    : [];

  const page: ServicesPage =
    content && typeof content.servicesPage === "object" && content.servicesPage
      ? (content.servicesPage as ServicesPage)
      : {};

  const categories: Category[] = Array.isArray(page.categories)
    ? page.categories
    : [];

  /* ---- writers ------------------------------------------------------- */

  const writeServices = (next: Service[]) => patch("services", next);

  const setService = (index: number, field: keyof Service, value: string) => {
    writeServices(
      services.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addService = () => {
    writeServices([...services, { id: newId(), title: "", description: "" }]);
  };

  const removeService = (index: number) => {
    const name = services[index]?.title || "this service";
    if (!window.confirm(`Remove ${name} from the services list?`)) return;
    writeServices(services.filter((_, i) => i !== index));
  };

  const writePage = (changes: Partial<ServicesPage>) =>
    patch("servicesPage", { ...page, ...changes });

  const setPageField = (field: keyof ServicesPage, value: string) =>
    writePage({ [field]: value } as Partial<ServicesPage>);

  const writeCategories = (next: Category[]) =>
    patch("servicesPage", { ...page, categories: next });

  const setCategoryTitle = (index: number, value: string) => {
    writeCategories(
      categories.map((c, i) => (i === index ? { ...c, title: value } : c))
    );
  };

  const setCategoryLine = (index: number, line: number, value: string) => {
    writeCategories(
      categories.map((c, i) => {
        if (i !== index) return c;
        const items = Array.isArray(c.items) ? c.items : [];
        return {
          ...c,
          items: items.map((text, j) => (j === line ? value : text)),
        };
      })
    );
  };

  const addCategoryLine = (index: number) => {
    writeCategories(
      categories.map((c, i) => {
        if (i !== index) return c;
        const items = Array.isArray(c.items) ? c.items : [];
        return { ...c, items: [...items, ""] };
      })
    );
  };

  const removeCategoryLine = (index: number, line: number) => {
    writeCategories(
      categories.map((c, i) => {
        if (i !== index) return c;
        const items = Array.isArray(c.items) ? c.items : [];
        return { ...c, items: items.filter((_, j) => j !== line) };
      })
    );
  };

  const addCategory = () => {
    writeCategories([...categories, { id: newId(), title: "", items: [] }]);
  };

  const removeCategory = (index: number) => {
    const name = categories[index]?.title || "this group";
    if (!window.confirm(`Remove the ${name} group and all its lines?`)) return;
    writeCategories(categories.filter((_, i) => i !== index));
  };

  /* ---- view ---------------------------------------------------------- */

  if (!content) {
    return (
      <>
        <div className="ad-head">
          <div>
            <h1 className="ad-title">Services</h1>
          </div>
        </div>
        <p className="ad-note">The content has not loaded yet.</p>
      </>
    );
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Services</h1>
          <p className="ad-sub">
            The service cards on the home page, and every word on the services
            page.
          </p>
        </div>
      </div>

      <div className="ad-grid">
        {/* ---- the service cards ---------------------------------------- */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Service list</h2>
              <p className="ad-card-note">
                {services.length} in the list. The order here is the order
                visitors see.
              </p>
            </div>
            <button
              type="button"
              className="ad-btn ad-btn-sm"
              onClick={addService}
            >
              <Plus size={16} aria-hidden="true" />
              Add a service
            </button>
          </div>
          <div className="ad-card-body">
            {services.length === 0 && (
              <p className="ad-note">
                There are no services yet. Add one to start the list.
              </p>
            )}

            {services.map((service, index) => {
              const key = service.id || `service-${index}`;
              const titleId = `sv-title-${key}`;
              const descId = `sv-desc-${key}`;
              return (
                <div className="ad-item" key={key}>
                  <div className="ad-item-head">
                    <span className="ad-item-name">
                      {service.title || "Untitled service"}
                    </span>
                    <span style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="ad-btn ad-btn-sm"
                        onClick={() =>
                          writeServices(move(services, index, index - 1))
                        }
                        disabled={index === 0}
                        aria-label={`Move ${service.title || "this service"} up`}
                      >
                        <ArrowUp size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ad-btn ad-btn-sm"
                        onClick={() =>
                          writeServices(move(services, index, index + 1))
                        }
                        disabled={index === services.length - 1}
                        aria-label={`Move ${service.title || "this service"} down`}
                      >
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ad-btn ad-btn-sm ad-btn-danger"
                        onClick={() => removeService(index)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Remove
                      </button>
                    </span>
                  </div>

                  <div className="ad-field">
                    <label className="ad-label" htmlFor={titleId}>
                      Title
                    </label>
                    <input
                      id={titleId}
                      className="ad-input"
                      type="text"
                      value={service.title ?? ""}
                      onChange={e => setService(index, "title", e.target.value)}
                    />
                  </div>

                  <div className="ad-field" style={{ marginBottom: 0 }}>
                    <label className="ad-label" htmlFor={descId}>
                      Description
                    </label>
                    <textarea
                      id={descId}
                      className="ad-input"
                      rows={2}
                      value={service.description ?? ""}
                      onChange={e =>
                        setService(index, "description", e.target.value)
                      }
                    />
                    <p className="ad-hint">
                      One or two sentences. This is the card text, so keep it
                      short.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- category groups ------------------------------------------ */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Service categories</h2>
              <p className="ad-card-note">
                The grouped lists further down the services page.
              </p>
            </div>
            <button
              type="button"
              className="ad-btn ad-btn-sm"
              onClick={addCategory}
            >
              <Plus size={16} aria-hidden="true" />
              Add a group
            </button>
          </div>
          <div className="ad-card-body">
            {categories.length === 0 && (
              <p className="ad-note">
                There are no category groups yet. Add one to start.
              </p>
            )}

            {categories.map((category, index) => {
              const key = category.id || `category-${index}`;
              const titleId = `sv-cat-${key}`;
              const items = Array.isArray(category.items) ? category.items : [];
              return (
                <div className="ad-item" key={key}>
                  <div className="ad-item-head">
                    <span className="ad-item-name">
                      {category.title || "Untitled group"}
                    </span>
                    <button
                      type="button"
                      className="ad-btn ad-btn-sm ad-btn-danger"
                      onClick={() => removeCategory(index)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Remove group
                    </button>
                  </div>

                  <div className="ad-field">
                    <label className="ad-label" htmlFor={titleId}>
                      Group title
                    </label>
                    <input
                      id={titleId}
                      className="ad-input"
                      type="text"
                      value={category.title ?? ""}
                      onChange={e => setCategoryTitle(index, e.target.value)}
                    />
                  </div>

                  <p className="ad-label">Lines in this group</p>
                  {items.length === 0 && (
                    <p className="ad-hint" style={{ marginTop: 0 }}>
                      No lines yet.
                    </p>
                  )}
                  {items.map((line, lineIndex) => {
                    const lineId = `sv-cat-${key}-line-${lineIndex}`;
                    return (
                      <div
                        key={lineId}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          marginBottom: 10,
                        }}
                      >
                        <label className="sr-only" htmlFor={lineId}>
                          Line {lineIndex + 1} of{" "}
                          {category.title || "this group"}
                        </label>
                        <input
                          id={lineId}
                          className="ad-input"
                          type="text"
                          value={line ?? ""}
                          onChange={e =>
                            setCategoryLine(index, lineIndex, e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="ad-btn ad-btn-sm ad-btn-danger"
                          onClick={() => removeCategoryLine(index, lineIndex)}
                          aria-label={`Remove line ${lineIndex + 1}`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="ad-btn ad-btn-sm"
                    onClick={() => addCategoryLine(index)}
                  >
                    <Plus size={15} aria-hidden="true" />
                    Add a line
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- hero and heading text ------------------------------------ */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Page headings</h2>
              <p className="ad-card-note">
                The title at the top of the services page splits in two. The
                second half is printed in gold.
              </p>
            </div>
          </div>
          <div className="ad-card-body">
            <div className="ad-row ad-row-2" style={{ marginBottom: 16 }}>
              <div className="ad-field" style={{ marginBottom: 0 }}>
                <label className="ad-label" htmlFor="sv-hero-title">
                  Hero title, first part
                </label>
                <input
                  id="sv-hero-title"
                  className="ad-input"
                  type="text"
                  value={page.heroTitle ?? ""}
                  onChange={e => setPageField("heroTitle", e.target.value)}
                />
              </div>
              <div className="ad-field" style={{ marginBottom: 0 }}>
                <label className="ad-label" htmlFor="sv-hero-highlight">
                  Hero title, gold part
                </label>
                <input
                  id="sv-hero-highlight"
                  className="ad-input"
                  type="text"
                  value={page.heroHighlight ?? ""}
                  onChange={e => setPageField("heroHighlight", e.target.value)}
                />
              </div>
            </div>

            <div className="ad-field">
              <label className="ad-label" htmlFor="sv-hero-subtitle">
                Hero subtitle
              </label>
              <textarea
                id="sv-hero-subtitle"
                className="ad-input"
                rows={2}
                value={page.heroSubtitle ?? ""}
                onChange={e => setPageField("heroSubtitle", e.target.value)}
              />
            </div>

            <div className="ad-row ad-row-2">
              <div className="ad-field" style={{ marginBottom: 0 }}>
                <label className="ad-label" htmlFor="sv-cats-title">
                  Categories heading, first part
                </label>
                <input
                  id="sv-cats-title"
                  className="ad-input"
                  type="text"
                  value={page.categoriesTitle ?? ""}
                  onChange={e =>
                    setPageField("categoriesTitle", e.target.value)
                  }
                />
              </div>
              <div className="ad-field" style={{ marginBottom: 0 }}>
                <label className="ad-label" htmlFor="sv-cats-highlight">
                  Categories heading, gold part
                </label>
                <input
                  id="sv-cats-highlight"
                  className="ad-input"
                  type="text"
                  value={page.categoriesHighlight ?? ""}
                  onChange={e =>
                    setPageField("categoriesHighlight", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---- call to action ------------------------------------------- */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Closing call to action</h2>
              <p className="ad-card-note">
                The block at the bottom of the services page.
              </p>
            </div>
          </div>
          <div className="ad-card-body">
            <div className="ad-field">
              <label className="ad-label" htmlFor="sv-cta-title">
                Title
              </label>
              <input
                id="sv-cta-title"
                className="ad-input"
                type="text"
                value={page.ctaTitle ?? ""}
                onChange={e => setPageField("ctaTitle", e.target.value)}
              />
            </div>
            <div className="ad-field">
              <label className="ad-label" htmlFor="sv-cta-subtitle">
                Subtitle
              </label>
              <textarea
                id="sv-cta-subtitle"
                className="ad-input"
                rows={2}
                value={page.ctaSubtitle ?? ""}
                onChange={e => setPageField("ctaSubtitle", e.target.value)}
              />
            </div>
            <div className="ad-field" style={{ marginBottom: 0 }}>
              <label className="ad-label" htmlFor="sv-cta-button">
                Button text
              </label>
              <input
                id="sv-cta-button"
                className="ad-input"
                type="text"
                value={page.ctaButton ?? ""}
                onChange={e => setPageField("ctaButton", e.target.value)}
              />
              <p className="ad-hint">
                Keep it to a few words. It has to fit on a phone.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
