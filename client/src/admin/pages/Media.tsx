import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Copy, ImageOff, Trash2, Upload } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { adminApi, type ImageRecord } from "../api";
import { asset } from "@/lib/asset";

/* ====================================================================== *
 *  MEDIA                                                                 *
 *                                                                        *
 *  The images live in the repository, not in a bucket, so an upload is a *
 *  commit. That has one consequence worth stating plainly: the file is   *
 *  safely stored the moment the upload returns, but the site has not     *
 *  rebuilt yet, so the path it returns serves nothing for about a        *
 *  minute. A fresh thumbnail will 404 until then, which is why every     *
 *  image here falls back to a plain box instead of a broken image icon.  *
 *                                                                        *
 *  This screen does not touch the content document, so it never marks    *
 *  anything dirty and the save bar stays out of it. Deleting an image    *
 *  that a story still points at will leave that story without a photo,   *
 *  so the confirm step matters.                                          *
 * ====================================================================== */

/** "/images/students/aisha.jpg" gives "students". */
function folderOf(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 2] : "";
}

function sizeOf(bytes?: number): string {
  if (typeof bytes !== "number" || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Media() {
  const { setNotice } = useAdmin();

  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [broken, setBroken] = useState<Record<string, true>>({});

  const [folder, setFolder] = useState("students");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listImages();
      setImages(Array.isArray(res?.images) ? res.images : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the images");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyPath = async (path: string) => {
    setActionError(null);
    try {
      await navigator.clipboard.writeText(path);
      setCopied(path);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access is blocked outside a secure context and in some
      // browsers without a user gesture. Say so rather than fail silently.
      setActionError(
        `The browser would not let the page copy. The path is ${path}`
      );
    }
  };

  const remove = async (image: ImageRecord) => {
    if (
      !window.confirm(
        `Delete ${image.name}? It is removed from the repository, and any page still pointing at it loses its picture.`
      )
    ) {
      return;
    }
    setActionError(null);
    setBusyPath(image.path);
    try {
      await adminApi.deleteImage(image.path, image.sha);
      await load();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not delete that image"
      );
    } finally {
      setBusyPath(null);
    }
  };

  const upload = async () => {
    if (!file) return;
    const target = folder.trim() || "students";
    setActionError(null);
    setUploading(true);
    try {
      const res = await adminApi.uploadImage(file, target);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setNotice(
        `Uploaded. ${res.filename} is committed to the repository and will be served at ${res.path} once the site rebuilds, which takes about a minute. Until then its thumbnail stays blank.`
      );
      await load();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not upload that file"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Media</h1>
          <p className="ad-sub">
            Every image in the repository. Upload here, then paste the path into
            a story or a service.
          </p>
        </div>
      </div>

      <div className="ad-grid">
        {/* ---- upload ---------------------------------------------------- */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Upload an image</h2>
              <p className="ad-card-note">
                The file is committed straight away. The site serves it after
                the next rebuild, about a minute later.
              </p>
            </div>
          </div>
          <div className="ad-card-body">
            <div className="ad-row ad-row-2">
              <div className="ad-field">
                <label className="ad-label" htmlFor="md-file">
                  Image file
                </label>
                <input
                  id="md-file"
                  ref={fileRef}
                  className="ad-input"
                  type="file"
                  accept="image/*"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="ad-hint">
                  Use a photo that is already cropped. Nothing here resizes it.
                </p>
              </div>
              <div className="ad-field">
                <label className="ad-label" htmlFor="md-folder">
                  Folder
                </label>
                <input
                  id="md-folder"
                  className="ad-input"
                  type="text"
                  value={folder}
                  onChange={e => setFolder(e.target.value)}
                />
                <p className="ad-hint">
                  The folder under images. Student photos go in students.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="ad-btn ad-btn-primary"
                onClick={() => void upload()}
                disabled={!file || uploading}
              >
                <Upload size={16} aria-hidden="true" />
                {uploading ? "Uploading..." : "Upload"}
              </button>
              {uploading && (
                <span
                  className="ad-hint"
                  style={{ marginTop: 0 }}
                  role="status"
                >
                  Reading the file and committing it. This can take a few
                  seconds.
                </span>
              )}
              {!uploading && file && (
                <span className="ad-hint" style={{ marginTop: 0 }}>
                  {file.name}
                  {sizeOf(file.size) ? `, ${sizeOf(file.size)}` : ""}
                </span>
              )}
            </div>

            {actionError && (
              <p
                className="ad-note ad-note-bad"
                style={{ marginTop: 16 }}
                role="alert"
              >
                <AlertTriangle size={16} aria-hidden="true" />
                <span>{actionError}</span>
              </p>
            )}
          </div>
        </section>

        {/* ---- library --------------------------------------------------- */}
        <section className="ad-card">
          <div className="ad-card-head">
            <div>
              <h2 className="ad-card-title">Library</h2>
              <p className="ad-card-note">
                {loading
                  ? "Reading the repository."
                  : `${images.length} ${images.length === 1 ? "image" : "images"}.`}
              </p>
            </div>
            <button
              type="button"
              className="ad-btn ad-btn-sm"
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <div className="ad-card-body">
            {loading && <p className="ad-note">Loading the image list.</p>}

            {!loading && error && (
              <p className="ad-note ad-note-bad" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            {!loading && !error && images.length === 0 && (
              <p className="ad-note">
                There are no images yet. Upload one above.
              </p>
            )}

            {!loading && !error && images.length > 0 && (
              <div
                className="ad-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                }}
              >
                {images.map(image => {
                  const isBroken = broken[image.path];
                  const where = folderOf(image.path);
                  return (
                    // the stacked-row margin would misalign the grid
                    <div
                      className="ad-item"
                      key={image.path}
                      style={{ marginTop: 0 }}
                    >
                      {isBroken ? (
                        <div
                          style={{
                            display: "grid",
                            placeItems: "center",
                            gap: 6,
                            width: "100%",
                            height: 120,
                            borderRadius: 10,
                            background: "#eff2f7",
                            color: "#6b788d",
                            fontSize: 12.5,
                            textAlign: "center",
                            padding: 10,
                          }}
                        >
                          <ImageOff size={18} aria-hidden="true" />
                          <span>Not served yet</span>
                        </div>
                      ) : (
                        <img
                          src={asset(image.path)}
                          alt=""
                          onError={() =>
                            setBroken(prev => ({ ...prev, [image.path]: true }))
                          }
                          style={{
                            width: "100%",
                            height: 120,
                            objectFit: "cover",
                            borderRadius: 10,
                            display: "block",
                            background: "#eff2f7",
                          }}
                        />
                      )}

                      <p
                        className="ad-item-name"
                        style={{
                          marginTop: 12,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {image.name}
                      </p>
                      <p className="ad-hint" style={{ marginTop: 4 }}>
                        {where ? `Folder: ${where}` : "At the images root"}
                        {sizeOf(image.size) ? `, ${sizeOf(image.size)}` : ""}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 12,
                        }}
                      >
                        <button
                          type="button"
                          className="ad-btn ad-btn-sm"
                          onClick={() => void copyPath(image.path)}
                        >
                          <Copy size={15} aria-hidden="true" />
                          {copied === image.path ? "Copied" : "Copy path"}
                        </button>
                        <button
                          type="button"
                          className="ad-btn ad-btn-sm ad-btn-danger"
                          onClick={() => void remove(image)}
                          disabled={busyPath === image.path}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          {busyPath === image.path ? "Deleting" : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
