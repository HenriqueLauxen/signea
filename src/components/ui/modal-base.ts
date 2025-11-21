export const modalOverlayClasses =
  "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const modalContentClasses =
  "fixed left-1/2 top-1/2 z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-border/10 bg-background p-6 text-foreground shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl focus-visible:outline-none focus-visible:ring-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const modalHeaderClasses =
  "flex flex-col space-y-2 text-center relative pb-4 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[0.5px] after:bg-white/20";

export const modalFooterClasses =
  "flex flex-col gap-2 w-full";

export const modalTitleClasses = "text-2xl font-light tracking-wide text-foreground";

export const modalDescriptionClasses =
  "text-[15px] leading-relaxed text-muted-foreground text-center";

export const modalButtonClasses =
  "inline-flex h-11 min-w-[6rem] items-center justify-center gap-2 rounded-md border-[0.5px] border-border/15 bg-transparent px-6 font-light tracking-wide text-foreground transition-all duration-200 hover:border-border/25 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border/30 disabled:pointer-events-none disabled:opacity-50";

export const modalCloseButtonClasses =
  "absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md border border-border/10 bg-transparent text-muted-foreground/80 transition-all duration-200 hover:border-border/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border/30";

