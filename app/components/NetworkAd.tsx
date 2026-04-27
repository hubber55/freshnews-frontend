'use client';

import { useEffect, useRef, useState } from 'react';

interface NetworkAdProps {
  code: string;
}

/**
 * Detects whether the ad code snippet uses a "mount target" pattern (e.g. mybid.io / bidvertiser).
 * These ads place a `<div id="...">` in the page and a separate `<script>` (often loaded from the
 * `<head>`) populates that div. When rendered inside an iframe the head-level script can't reach
 * the div, so these must be injected directly into the main page DOM.
 *
 * Heuristic: The snippet contains a bare `<div id="..."></div>` (empty, no classes, just an id)
 * that looks like a numeric or short alphanumeric mount target.
 */
function isMountTargetAd(code: string): boolean {
  // Match patterns like <div id="2028306"></div> — numeric / short IDs typical of mybid, mgid, etc.
  return /\<div\s+id\s*=\s*["'][A-Za-z0-9_-]{3,20}["']\s*>\s*<\/div>/i.test(code);
}

export default function NetworkAd({ code }: NetworkAdProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const directRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const useDirect = isMountTargetAd(code);

  // --- Direct DOM injection (for mount-target ads like mybid.io) ---
  useEffect(() => {
    if (!useDirect) return;
    const container = directRef.current;
    if (!container || !code || mounted) return;

    // Parse the HTML and inject elements directly into the DOM.
    // We need to handle <script> tags specially because innerHTML doesn't execute them.
    const temp = document.createElement('div');
    temp.innerHTML = code;

    const scripts: HTMLScriptElement[] = [];

    // First pass: move all non-script nodes into the container.
    Array.from(temp.childNodes).forEach((node) => {
      if (node instanceof HTMLScriptElement) {
        scripts.push(node);
      } else {
        container.appendChild(node.cloneNode(true));
      }
    });

    // Second pass: create real <script> elements so the browser executes them.
    scripts.forEach((origScript) => {
      const script = document.createElement('script');
      // Copy attributes (src, type, async, defer, data-*, etc.)
      Array.from(origScript.attributes).forEach((attr) => {
        script.setAttribute(attr.name, attr.value);
      });
      // Copy inline content
      if (origScript.textContent) {
        script.textContent = origScript.textContent;
      }
      container.appendChild(script);
    });

    setMounted(true);

    // Collapse if nothing visible after a delay.
    const timer = window.setTimeout(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper || !container) return;
      const hasVisible = container.scrollHeight > 10 || container.scrollWidth > 10;
      if (!hasVisible) {
        wrapper.style.display = 'none';
        console.warn('[ads] mount-target slot empty; collapsing');
      }
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [code, useDirect, mounted]);

  // --- Iframe injection (for self-contained ad snippets like Adsterra) ---
  useEffect(() => {
    if (useDirect) return;
    const wrapper = wrapperRef.current;
    const iframe = iframeRef.current;
    if (!wrapper || !iframe || !code) return;

    // Ensure the slot is visible on new code.
    wrapper.style.display = '';

    // Many ad network snippets rely on document.write or assume they run in a clean document.
    // Rendering inside an iframe keeps the ad anchored to this slot and avoids breaking the main page.
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;}</style></head><body>${code}</body></html>`);
    doc.close();

    const timer = window.setTimeout(() => {
      try {
        const d = iframe.contentDocument;
        const body = d?.body;
        if (!body) return;

        // If the network didn't insert any visible element, collapse the slot to avoid a black gap.
        const hasVisible = Boolean(
          body.querySelector('iframe, img, video, ins, a, div, span') &&
          (body.scrollHeight > 10 || body.scrollWidth > 10)
        );

        if (!hasVisible) {
          wrapper.style.display = 'none';
          console.warn('[ads] slot empty; collapsing');
        }
      } catch {
        // If something goes wrong reading the iframe, keep the slot visible.
      }
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [code, useDirect]);

  if (!code) return null;

  return (
    <div ref={wrapperRef} className="my-8 flex justify-center overflow-hidden min-h-[250px] w-full">
      {useDirect ? (
        <div ref={directRef} className="w-full max-w-full min-h-[250px]" />
      ) : (
        <iframe
          ref={iframeRef}
          title="Advertisement"
          className="w-full max-w-full min-h-[250px] border-0"
          // No sandbox: some ad providers refuse to render inside sandboxed frames.
        />
      )}
    </div>
  );
}
