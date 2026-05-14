import { createAdminClient } from '@/lib/supabase-admin';
import Header from '../components/header';
import Footer from '../components/footer';
import FAQClient from './FAQClient';

type FAQItem = {
  id: number;
  question: string;
  answer: string;
};

const DUMMY_FAQS: FAQItem[] = [
  {
    id: 0,
    question: 'What are your unique features?',
    answer: 'We are more than just a news source! You can post your own Classifieds, local Events, Ads, and even your own News stories. \n\nKey features include:\n- **Read Aloud:** Simply close your eyes, relax, and let our site read the news for you. Perfect for driving (connect to Bluetooth in your car) or relaxing. You can skip between stories or go back to a previous one easily. This feature is also available for Classifieds!\n- **Zoom In:** Unlike many other apps, we allow you to zoom in on images and content to take a closer look at what matters to you.\n- **Summarizing:** We know you don\'t want to read lengthy news. So our AI summarises and let you know just the key facts. If you wish you can read the full News from its Original Source, which is linked underneath every Post.',
  },
  {
    id: 1,
    question: 'What is FreshNews?',
    answer: 'FreshNews is a Malayalam news aggregator platform where you can read the latest news, submit your own news stories, events, and classified advertisements for free.',
  },
  {
    id: 2,
    question: 'How do I submit news or events?',
    answer: 'Simply create an account using your WhatsApp number, then click on "Submit" as per the Category. Fill in the details and your submission will be reviewed by our editors before publishing.',
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
    question: 'Can I edit my username?',
    answer: 'Yes! Your username is the name that appears publicly with your comments and ads. You can change it anytime by visiting your Profile page.',
  },
  {
    id: 6,
    question: 'How do I install FreshNews as an app?',
    answer: 'Go to the "Install As App" option in the menu. On Android, you can add it to your home screen directly. On iOS, use the Share button in Safari and select "Add to Home Screen".',
  },
  {
    id: 7,
    question: 'What is the ideal size for advertisements?',
    answer: 'For the best results, use a 16:9 aspect ratio (e.g., 1280x720 pixels) for mobile users, or a 21:9 aspect ratio (e.g., 1600x685 pixels) for desktop users. To ensure your message is never cut off, keep important text and logos within the central 60% of the image.',
  },
  {
    id: 8,
    question: 'Can I lock multiple news stories at once?',
    answer: 'Yes! Multiple news stories can be locked at different positions (2nd, 8th, 16th, or 24th) simultaneously on the homepage.',
  },
  {
    id: 9,
    question: 'What is your Copyright & Takedown Policy?',
    answer: 'As a news aggregator, FreshNews.top aggregates content from **publicly available RSS feeds** and operates in compliance with **Fair Usage** principles. We provide clear attribution and direct links to the source of every article. However, if you are a content owner and wish to have your content removed, we will honor your request immediately. Simply reach out via our **Contact Us** page.',
  },
];

export const revalidate = 300;

export default async function FAQPage() {
  let faqs = DUMMY_FAQS;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'site_faqs')
      .single();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        faqs = parsed;
      }
    }
  } catch (err) {
    console.error('Failed to fetch FAQs:', err);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <FAQClient initialFaqs={faqs} />
      <Footer />
    </div>
  );
}
