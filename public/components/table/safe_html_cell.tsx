import React, { useEffect, useRef } from 'react';

/**
 * Renders pre-sanitized HTML (output of DOMPurify.sanitize) into a span via a DOM ref.
 * The `html` prop MUST already be sanitized before being passed here.
 */
export const SafeHtmlCell: React.FC<{
  html: string;
  style?: React.CSSProperties;
  tag?: 'span' | 'strong';
}> = ({ html, style, tag = 'span' }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
    }
  }, [html]);

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
