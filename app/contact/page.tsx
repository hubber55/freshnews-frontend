import type { Metadata } from 'next';
import Header from '../components/header';
import Footer from '../components/footer';

export const metadata: Metadata = {
  title: 'Contact Us | FreshNews.top',
  description: 'Get in touch with FreshNews.top team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="mx-auto mt-6 w-full max-w-[800px] px-5">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="post-title mb-6 text-[#ffd42a]">Contact Us</h1>

          <div className="article-body text-[var(--text-primary)]">
            <p>
              We value your feedback and are always happy to hear from our readers. Whether you have a question, suggestion, or concern, feel free to reach out to us.
            </p>

            <p><strong>Email</strong></p>
            <p>
              For general inquiries, feedback, or support:<br/>
              <a href="mailto:kerlot4@gmail.com" className="text-[#ffd42a] hover:underline text-[18px] font-semibold">
                kerlot4@gmail.com
              </a>
            </p>

            <p><strong>Response Time</strong></p>
            <p>
              We try to respond to all emails within 24-48 hours. For urgent matters, please mention &quot;URGENT&quot; in the subject line.
            </p>

            <p><strong>Content Removal Requests</strong></p>
            <p>
              If you are a content owner and would like your content removed from FreshNews.top, please email us with the following details:<br/>
              • The URL of the content on our website<br/>
              • Proof of ownership of the original content<br/>
              • Your contact information<br/>
              We will review and process all legitimate requests promptly.
            </p>

            <p><strong>Advertising &amp; Partnerships</strong></p>
            <p>
              Interested in advertising on FreshNews.top or exploring partnership opportunities? Please reach out to us via email with your proposal.
            </p>

            <p><strong>Report a Bug</strong></p>
            <p>
              Found a bug or technical issue? Please describe the problem, include your browser and device information, and send it to our email. We appreciate your help in making FreshNews.top better.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
