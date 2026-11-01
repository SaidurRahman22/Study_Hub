/* Study Hub BD wordmark for the admin sidebar.
 *
 * The template shipped two flat SVGs swapped by theme. The brand mark is a
 * full-colour PNG that reads on both the light and the dark ground, so one
 * image serves both, with the name set beside it in the theme's text colour. */

const FullLogo = () => {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src="/images/logo-mark.png"
        alt="Study Hub BD"
        width={34}
        height={34}
        className="rtl:scale-x-[-1]"
      />
      <span className="flex flex-col leading-tight">
        <span className="text-[17px] font-semibold text-foreground">
          Study Hub BD
        </span>
        <span className="text-[11px] text-muted-foreground">Content admin</span>
      </span>
    </span>
  );
};

export default FullLogo;
