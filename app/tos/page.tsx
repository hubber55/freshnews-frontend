import type { Metadata } from 'next';
import Header from '../components/header';
import Footer from '../components/footer';

export const metadata: Metadata = {
  title: 'Terms of Service | FreshNews.top',
  description: 'Terms of Service for FreshNews.top.',
};

export default function TosPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="mx-auto mt-6 w-full max-w-[800px] px-5">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="post-title mb-6 text-[#ffd42a]">Terms of Service</h1>
          <p className="text-[12px] text-[var(--text-muted)] mb-6" style={{ fontFamily: 'var(--font-en)' }}>
            Last updated: April 2026
          </p>

          <div className="article-body text-[var(--text-primary)]">
            <p>
              Please read these Terms of Service carefully before using FreshNews.top. By accessing or using our website, you agree to be bound by these terms.
            </p>

            <p><strong>1. Acceptance of Terms</strong></p>
            <p>
              By accessing and using FreshNews.top, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of the terms, you may not access the website.
            </p>

            <p><strong>2. Description of Service</strong></p>
            <p>
              FreshNews.top is a news aggregation platform that collects and displays news content from various Malayalam news publishers. We provide links and summaries to third-party content. We do not claim ownership of the original news content.
            </p>

            <p><strong>3. Intellectual Property</strong></p>
            <p>
              The website design, layout, logos, and original content on FreshNews.top are the intellectual property of FreshNews.top. News content is attributed to its respective original publishers and sources. All trademarks and copyrights belong to their respective owners.
            </p>

            <p><strong>4. User Conduct</strong></p>
            <p>
              You agree not to:<br/>
              • Use the website for any unlawful purpose<br/>
              • Attempt to gain unauthorized access to any part of the website<br/>
              • Use automated systems or software to extract data from the website (scraping)<br/>
              • Interfere with or disrupt the website or servers
            </p>

            <p><strong>5. Disclaimer of Warranties</strong></p>
            <p>
              FreshNews.top is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We make no warranties, expressed or implied, regarding the accuracy, reliability, or completeness of any content on the website. We do not guarantee that the service will be uninterrupted, secure, or error-free.
            </p>

            <p><strong>6. Limitation of Liability</strong></p>
            <p>
              In no event shall FreshNews.top, its operators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the website.
            </p>

            <p><strong>7. Third-Party Links & Attribution</strong></p>
            <p>
              Our website contains links and summaries to third-party content. We provide full attribution and direct links to the original sources as a courtesy. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites.
            </p>

            <p><strong>8. Notice and Takedown Policy</strong></p>
            <p>
              FreshNews.top respects the intellectual property rights of others. Our platform aggregates content from <strong>publicly available RSS feeds</strong> provided by original publishers, and we operate in full compliance with <strong>Fair Usage</strong> principles by providing clear attribution and direct links to the original sources. 
            </p>
            <p>
              However, we understand that some owners may prefer their content not be aggregated. We are committed to a prompt response and will <strong>remove any content immediately</strong> upon receiving a valid request from the original source or authorized owner. If you wish to have your content removed, simply <a href="/contact" className="text-[#ffd42a] hover:underline">Contact Us</a>.
            </p>

            <p><strong>9. Modifications</strong></p>
            <p>
              We reserve the right to modify or replace these Terms at any time. It is your responsibility to review these Terms periodically for changes.
            </p>

            <p><strong>9. Contact</strong></p>
            <p>
              If you have any questions about these Terms, please contact us at: <a href="mailto:kerlot4@gmail.com" className="text-[#ffd42a] hover:underline">kerlot4@gmail.com</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
