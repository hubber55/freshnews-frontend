export const runtime = 'edge';
import type { Metadata } from 'next';
import Header from '../components/header';
import Footer from '../components/footer';

export const metadata: Metadata = {
  title: 'About Us | FreshNews.top',
  description: 'Learn more about FreshNews.top - Your trusted source for latest Malayalam news.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="mx-auto mt-6 w-full max-w-[800px] px-5">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="post-title mb-6 text-[#ffd42a]">About Us</h1>

          <div className="article-body text-[var(--text-primary)]">
            <p>
              Welcome to <strong>FreshNews.top</strong> — your go-to destination for the latest and most reliable Malayalam news updates from across Kerala, India, and the world.
            </p>
            <p>
              Our platform aggregates news from multiple trusted sources, delivering real-time updates to keep you informed around the clock. We believe in making quality journalism accessible to everyone, everywhere.
            </p>
            <p>
              <strong>Our Mission:</strong> To provide fast, accurate, and unbiased news coverage in Malayalam, bringing together stories from top publishers into a single, easy-to-read platform.
            </p>
            <p>
              <strong>What We Offer:</strong>
            </p>
            <p>
              • Breaking news alerts and real-time updates<br/>
              • Coverage spanning politics, sports, entertainment, technology, and more<br/>
              • Multi-source aggregation ensuring diverse perspectives<br/>
              • Clean, distraction-free reading experience<br/>
              • Mobile-friendly design for news on the go
            </p>
            <p>
              <strong>Our Sources:</strong> We curate content from leading Malayalam newspapers and media outlets including Mathrubhumi, Manorama, Suprabhaatham, and other trusted publishers.
            </p>
            <p>
              FreshNews.top is built with the latest web technologies to deliver a seamless, fast, and beautiful news reading experience. Our content is updated automatically, ensuring you always have access to the freshest stories.
            </p>
            <p>
              Thank you for choosing FreshNews.top as your trusted news companion.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
