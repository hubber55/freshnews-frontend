'use client';

import { useState, useEffect } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

type FAQItem = {
  id: number;
  question: string;
  answer: string;
};

// Dummy FAQ data - in production this would come from an API
const DUMMY_FAQS: FAQItem[] = [
  {
    id: 1,
    question: 'What is FreshNews?',
    answer: 'FreshNews is a Malayalam news aggregator platform where you can read the latest news, submit your own news stories, events, and classified advertisements for free.',
  },
  {
    id: 2,
    question: 'How do I submit news or events?',
    answer: 'Simply create an account using your WhatsApp number, then click on "Submit News" or "Submit Events" from the menu. Fill in the details and your submission will be reviewed by our editors before publishing.',
  },
  {
    id: 3,
    question: 'Is it free to post classified ads?',
    answer: 'Yes! Posting classified advertisements on FreshNews is completely free. You can post ads for jobs, real estate, services, items for sale, and more.',
  },
  {
    id: 4,
    question: 'How long does it take for my submission to be approved?',
    answer: 'Our editorial team typically reviews submissions within 24-48 hours. You can check the status of your submissions in your Profile page.',
  },
  {
    id: 5,
    question: 'Can I edit my nickname?',
    answer: 'Yes! Your nickname is the name that appears publicly with your comments and ads. You can change it anytime by visiting your Profile page.',
  },
  {
    id: 6,
    question: 'How do I install FreshNews as an app?',
    answer: 'Go to the "Install As App" option in the menu. On Android, you can add it to your home screen directly. On iOS, use the Share button in Safari and select "Add to Home Screen".',
  },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFaqs() {
      const { createClient } = await import('@/app/utils/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'site_faqs')
        .single();
        
      if (!error && data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (parsed && parsed.length > 0) {
            setFaqs(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      // Fallback to dummy data if not configured
      setFaqs(DUMMY_FAQS);
      setIsLoading(false);
    }
    
    fetchFaqs();
  }, []);

  const toggleFAQ = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      
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
            {isLoading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffd42a] mx-auto"></div>
              </div>
            ) : faqs.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-muted)]">
                No FAQs available at the moment.
              </div>
            ) : (
              faqs.map((faq) => (
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
                        <p className="text-white leading-relaxed mt-4">
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
      
      <Footer />
    </div>
  );
}
