import CardBox from 'src/components/shared/CardBox';
import { EmptyState, ScreenHead, Caveat } from 'src/content/ui';

/* Media library, a placeholder until the image API is wired. Uploading,
 * browsing and removing images needs the signed-in session, which lands in the
 * same phase as saving (see ADMIN-CONTENT-MAP.md §5). */

export default function MediaPage() {
  return (
    <>
      <ScreenHead
        title="Media library"
        subtitle="Browse and upload the photographs used across the site."
      />

      <CardBox>
        <EmptyState
          icon="solar:gallery-wide-linear"
          title="Image management arrives with the save wiring"
          note="Uploading, browsing and removing images runs through the admin image API, which needs the signed-in session. It is wired in the same phase as saving."
        />
      </CardBox>

      <Caveat>
        Student photos and the destination and Tangail photographs live in{' '}
        <code>/images</code>. Until this is wired, images are added by placing files there.
        See <code>Docs/ADMIN-CONTENT-MAP.md §5</code>.
      </Caveat>
    </>
  );
}
