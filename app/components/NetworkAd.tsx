'use client';

import { useEffect, useRef } from 'react';

interface NetworkAdProps {
  code: string;
}

export default function NetworkAd({ code }: NetworkAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !code) return;

    // Rebuild the slot each time so scripts execute in the same place they are rendered.
    container.replaceChildren();

    const template = document.createElement('template');
    template.innerHTML = code;

    Array.from(template.content.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
        const oldScript = node as HTMLScriptElement;
        const newScript = document.createElement('script');

        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        if (oldScript.textContent) {
          newScript.textContent = oldScript.textContent;
        }

        container.appendChild(newScript);
        return;
      }

      if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
        return;
      }

      container.appendChild(node.cloneNode(true));
    });

    return () => {
      // Clean up scripts if necessary? 
      // Usually these network scripts stay in the body.
    };
  }, [code]);

  if (!code) return null;

  return (
    <div className="my-8 flex justify-center overflow-hidden min-h-[250px] w-full">
      <div ref={containerRef} className="max-w-full" />
    </div>
  );
}
