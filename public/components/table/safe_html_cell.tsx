import React, { useEffect, useRef } from 'react';

/** Branded type: only strings that have passed through DOMPurify.sanitize may be assigned here. */
export type SanitizedHtml = string & { readonly __brand: 'sanitized' };

// innerHTML is intentionally used here. The SanitizedHtml branded type enforces that content
// has already been passed through DOMPurify.sanitize() before reaching this component —
// the only place that cast exists is renderTemplate() in handlebars_template.ts.
export const SafeHtmlCell: React.FC<{
  sanitizedHtml: SanitizedHtml;
  style?: React.CSSProperties;
  tag?: 'span' | 'strong';
}> = ({ sanitizedHtml, style, tag = 'span' }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      // Safe: content is DOMPurify-sanitized (enforced by the SanitizedHtml branded type).
      ref.current.innerHTML = sanitizedHtml; // NOSONAR: sanitized via DOMPurify
    }
  }, [sanitizedHtml]);

  return tag === 'strong'
    ? <strong ref={ref as React.RefObject<HTMLElement>} style={style} />
    : <span ref={ref as React.RefObject<HTMLElement>} style={style} />;
};

export const CssStyledCell: React.FC<{
  cssText: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ cssText, style, children }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.cssText = cssText;
  }, [cssText]);
  return <span ref={ref} style={style}>{children}</span>;
};
