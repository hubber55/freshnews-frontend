'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

type FAQItem = {
  id: number;
  question: string;
  answer: string;
};

export default function FAQClient({ initialFaqs }: { initialFaqs: FAQItem[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggleFAQ = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <main className="px-4 pt-8 pb-10">
      <div className="mx-auto w-full max-w-[800px]">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center rounded-2xl bg-[#ffd42a]/10 p-4 mb-4">
            <HelpCircle size={32} className="text-[#ffd42a]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: 'var(--font-en)' }}>
            Frequently Asked Questions
          </h1>
          <p className="text-[var(--text-secondary)]">
            Find answers to common questions about FreshNews
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {initialFaqs.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)]">
              No FAQs available at the moment.
            </div>
          ) : (
            initialFaqs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-[var(--bg-primary)] transition-colors"
                >
                  <h3 className="text-lg font-bold text-[#ffd42a] pr-4">
                    {faq.question}
                  </h3>
                  {openId === faq.id ? (
                    <ChevronUp size={24} className="text-[#ffd42a] flex-shrink-0" />
                  ) : (
                    <ChevronDown size={24} className="text-[#ffd42a] flex-shrink-0" />
                  )}
                </button>
                
                {openId === faq.id && (
                  <div className="px-6 pb-6">
                    <div className="pt-2 border-t border-[var(--border)]">
                      <p className="text-white leading-relaxed mt-4 whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-10 text-center">
          <p className="text-[var(--text-secondary)] mb-4">
            Still have questions?
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00cfff] px-6 py-3 font-bold text-[#0d1117] hover:brightness-110 transition-all"
          >
            Contact Us
          </a>
        </div>
      </div>
    </main>
  );
}
