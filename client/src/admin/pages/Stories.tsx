import { useRef, useState } from "react";
import { Info, Plus, Trash2, Upload, X } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { adminApi } from "../api";

/* ====================================================================== *
 *  SUCCESS STORIES                                                       *
 *                                                                        *
 *  The site renders a student's photo only when it serves the file       *
 *  itself, so this editor can only ever set an uploaded path. There is   *
 *  deliberately no way to paste a link: the page used to carry stock     *
 *  photographs of strangers next to real students' names, and the easy   *
 *  path has to be the honest one.                                        *
 *                                                                        *
 *  The preview after an upload comes from the chosen file, not from the  *
 *  returned path. The upload commits to the repository and the site      *
 *  cannot serve that path until it rebuilds, so pointing a preview at it *
 *  would show a broken image for the next minute.                        *
 * ====================================================================== */

type Story = {
  id: string;
  name: string;
  university: string;
  country: string;
  program?: string;
  year?: string;
  image: string;
  quote: string;
};

function initialsOf(name: string): string {
  return String(name || "")
    .replace(/^(Md\.?|Mohammad|Muhammad)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Stories() {
  const { content, patch, setNotice } = useAdmin();
  const stories = (content?.successStories as Story[] | undefined) ?? [];

  /* Object URLs for photos chosen in this session, keyed by story id, so a
   * fresh upload previews instantly while the site is still rebuilding. */
  const [localPreview, setLocalPreview] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const write = (next: Story[]) => patch("successStories", next);

  const update = (id: string, field: keyof Story, value: string) =>
    write(stories.map(s => (s.id === id ? { ...s, [field]: value } : s)));

  const add = () =>
    write([
      ...stories,
      {
        id: String(Date.now()),
        name: "",
        university: "",
        country: "",
        program: "",
        year: "",
        image: "",
        quote: "",
      },
    ]);

  const remove = (id: string, name: string) => {
    if (!window.confirm(`Remove ${name || "this story"} from the site?`))
      return;
    write(stories.filter(s => s.id !== id));
  };

  async function onPick(story: Story, file: File) {
    setUploading(story.id);
    try {
      const { path } = await adminApi.uploadImage(file, "students");
      update(story.id, "image", path);
      setLocalPreview(p => ({ ...p, [story.id]: URL.createObjectURL(file) }));
      setFailed(f => ({ ...f, [story.id]: false }));
      setNotice(
        "Photo uploaded to the site files. Press Save to publish the change, then it appears publicly once the site rebuilds."
      );
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "The photo could not be uploaded"
      );
    } finally {
      setUploading(null);
    }
  }

  const clearPhoto = (id: string) => {
    update(id, "image", "");
    setLocalPreview(p => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Success stories</h1>
          <p className="ad-sub">
            {stories.length} on the site. A student without a photo is shown as
            their initials.
          </p>
        </div>
        <button type="button" className="ad-btn ad-btn-primary" onClick={add}>
          <Plus size={16} aria-hidden="true" />
          Add a story
        </button>
      </div>

      <p className="ad-note ad-note-warn" style={{ marginBottom: 18 }}>
        <Info size={16} aria-hidden="true" />
        <span>
          Publish a name, a university or a photograph only with that student's
          permission. A photo can be uploaded here but not linked from the web,
          so a stock picture of a stranger cannot end up beside a real name.
        </span>
      </p>

      {stories.length === 0 && (
        <div className="ad-card">
          <div className="ad-card-body">
            <p className="ad-sub" style={{ margin: 0 }}>
              No stories yet. Add one to get started.
            </p>
          </div>
        </div>
      )}

      {stories.map(s => {
        const preview =
          localPreview[s.id] || (s.image && !failed[s.id] ? s.image : "");
        return (
          <div className="ad-item" key={s.id}>
            <div className="ad-item-head">
              <span className="ad-item-name">{s.name || "New story"}</span>
              <button
                type="button"
                className="ad-btn ad-btn-sm ad-btn-danger"
                onClick={() => remove(s.id, s.name)}
              >
                <Trash2 size={14} aria-hidden="true" />
                Remove
              </button>
            </div>

            <div className="ad-field">
              <span className="ad-label">Student photo</span>
              <div className="ad-photo">
                {preview ? (
                  <img
                    className="ad-photo-prev"
                    src={preview}
                    alt=""
                    onError={() => setFailed(f => ({ ...f, [s.id]: true }))}
                  />
                ) : (
                  <span className="ad-photo-mono" aria-hidden="true">
                    {initialsOf(s.name) || "?"}
                  </span>
                )}

                <input
                  ref={el => {
                    inputs.current[s.id] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onPick(s, file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="ad-btn ad-btn-sm"
                  onClick={() => inputs.current[s.id]?.click()}
                  disabled={uploading === s.id}
                >
                  <Upload size={14} aria-hidden="true" />
                  {uploading === s.id
                    ? "Uploading…"
                    : s.image
                      ? "Replace"
                      : "Upload photo"}
                </button>
                {s.image && (
                  <button
                    type="button"
                    className="ad-btn ad-btn-sm"
                    onClick={() => clearPhoto(s.id)}
                  >
                    <X size={14} aria-hidden="true" />
                    Remove photo
                  </button>
                )}
                <span className="ad-hint" style={{ marginTop: 0 }}>
                  {s.image || "No photo. The site will show initials."}
                </span>
              </div>
              {failed[s.id] && s.image && (
                <p className="ad-hint">
                  Saved, but not served yet. It appears after the site rebuilds.
                </p>
              )}
            </div>

            <div className="ad-row ad-row-3">
              <label className="ad-field" htmlFor={`st-name-${s.id}`}>
                <span className="ad-label">Student name</span>
                <input
                  id={`st-name-${s.id}`}
                  className="ad-input"
                  value={s.name}
                  onChange={e => update(s.id, "name", e.target.value)}
                />
              </label>
              <label className="ad-field" htmlFor={`st-uni-${s.id}`}>
                <span className="ad-label">University</span>
                <input
                  id={`st-uni-${s.id}`}
                  className="ad-input"
                  value={s.university}
                  onChange={e => update(s.id, "university", e.target.value)}
                />
              </label>
              <label className="ad-field" htmlFor={`st-country-${s.id}`}>
                <span className="ad-label">Country</span>
                <input
                  id={`st-country-${s.id}`}
                  className="ad-input"
                  value={s.country}
                  onChange={e => update(s.id, "country", e.target.value)}
                />
              </label>
            </div>

            <label className="ad-field" htmlFor={`st-quote-${s.id}`}>
              <span className="ad-label">What the student said</span>
              <textarea
                id={`st-quote-${s.id}`}
                className="ad-input"
                value={s.quote}
                onChange={e => update(s.id, "quote", e.target.value)}
              />
              <span className="ad-hint">
                Their own words persuade far more than a polished line written
                for them.
              </span>
            </label>
          </div>
        );
      })}
    </>
  );
}
