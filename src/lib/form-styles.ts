/** Shared form control styles (public + admin). */

export const inputControlClass =
  // Clay: inputs are recessed wells that lift to white on focus.
  "rounded-xl border border-transparent bg-clay-well px-3.5 py-2 text-base text-zinc-900 shadow-clay-inset placeholder:text-zinc-400 transition-[background-color,box-shadow,border-color] md:text-sm focus:border-zinc-300 focus:bg-white focus:shadow-none focus:outline-none focus:ring-2 focus:ring-brand-accent/15 min-h-[44px]";

export const inputFieldClass = `mt-1 w-full ${inputControlClass}`;

export const inputInlineClass = `w-full ${inputControlClass}`;
