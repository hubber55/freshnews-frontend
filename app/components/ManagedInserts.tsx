'use client';

import { useEffect } from 'react';

type HeaderInsert = {
  id?: string;
  name?: string;
  enabled?: boolean;
  placement?: 'head' | 'body';
  scope?: 'all' | 'home';
  code?: string;
};

function parseHeaderInserts(value: unknown): HeaderInsert[] {
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as HeaderInsert[]) : [];
  } catch {
    return [];
  }
}

function normalizeInserts(inserts: HeaderInsert[]) {
  return inserts
    .filter(
      (ins) =>
        (ins?.enabled ?? true) &&
        (ins?.scope ?? 'all') === 'all' &&
        typeof ins?.code === 'string' &&
        ins.code.trim()
    )
    .map((ins) => ({
      ...ins,
      placement: ins.placement ?? 'head',
      scope: ins.scope ?? 'all',
      code: ins.code!.trim(),
    }));
}

function extractScripts(html: string) {
  const scripts: Array<{ attrs: Record<string, string>; inline: string }> = [];
  const remainderParts: string[] = [];

  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    remainderParts.push(html.slice(lastIndex, match.index));
    lastIndex = re.lastIndex;

    const rawAttrs = match[1] ?? '';
    const inline = match[2] ?? '';
    const attrs: Record<string, string> = {};

    const attrRe = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(rawAttrs)) !== null) {
      const name = attrMatch[1];
      const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      attrs[name] = value;
    }

    scripts.push({ attrs, inline });
  }

  remainderParts.push(html.slice(lastIndex));
  return { scripts, remainder: remainderParts.join('').trim() };
}

function injectHtml(target: HTMLElement, html: string) {
  if (!html.trim()) return [];

  const insertedNodes: Node[] = [];
  const { scripts, remainder } = extractScripts(html);

  for (const script of scripts) {
    const element = document.createElement('script');
    const { src, ...rest } = script.attrs;

    if (src) {
      element.src = src;
    }

    for (const [name, value] of Object.entries(rest)) {
      element.setAttribute(name, value);
    }

    if (!src && script.inline) {
      element.textContent = script.inline;
    }

    target.appendChild(element);
    insertedNodes.push(element);
  }

  if (remainder) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.display = 'none';
    wrapper.innerHTML = remainder;
    target.appendChild(wrapper);
    insertedNodes.push(wrapper);
  }

  return insertedNodes;
}

export default function ManagedInserts() {
  useEffect(() => {
    let cancelled = false;
    const insertedNodes: Node[] = [];

    async function loadInserts() {
      try {
        const response = await fetch('/api/site-settings', {
          credentials: 'same-origin',
        });

        if (!response.ok || cancelled) {
          return;
        }

        const data = await response.json().catch(() => null);
        const settings = Array.isArray(data?.settings) ? data.settings : [];
        const settingsMap = new Map<string, string>();

        for (const setting of settings) {
          if (setting && typeof setting.key === 'string' && typeof setting.value === 'string') {
            settingsMap.set(setting.key, setting.value);
          }
        }

        const headerInserts = normalizeInserts(parseHeaderInserts(settingsMap.get('header_inserts')));
        const legacyBidVertiser =
          typeof settingsMap.get('bidvertiser_verification_code') === 'string'
            ? settingsMap.get('bidvertiser_verification_code')!.trim()
            : '';

        const normalizedInserts: HeaderInsert[] = [
          ...(legacyBidVertiser
            ? [
                {
                  id: 'legacy-bidvertiser',
                  name: 'BidVertiser Verification (Legacy)',
                  enabled: true,
                  placement: 'head',
                  scope: 'all',
                  code: legacyBidVertiser,
                } satisfies HeaderInsert,
              ]
            : []),
          ...headerInserts,
        ]
          .filter(
            (ins) =>
              (ins?.enabled ?? true) &&
              (ins?.scope ?? 'all') === 'all' &&
              typeof ins?.code === 'string' &&
              ins.code.trim()
          )
          .map((ins) => ({
            ...ins,
            placement: ins.placement ?? 'head',
            scope: ins.scope ?? 'all',
            code: ins.code!.trim(),
          }));

        const headHtml = normalizedInserts
          .filter((insert) => insert.placement === 'head')
          .map((insert) => insert.code!)
          .join('\n');

        const bodyHtml = normalizedInserts
          .filter((insert) => insert.placement === 'body')
          .map((insert) => insert.code!)
          .join('\n');

        insertedNodes.push(...injectHtml(document.head, headHtml));

        if (bodyHtml) {
          insertedNodes.push(...injectHtml(document.body, bodyHtml));
        }
      } catch (error) {
        console.error('ManagedInserts error:', error);
      }
    }

    void loadInserts();

    return () => {
      cancelled = true;
      for (const node of insertedNodes) {
        node.parentNode?.removeChild(node);
      }
    };
  }, []);

  return null;
}
