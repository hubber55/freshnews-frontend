import type { Metadata } from 'next';
import Header from '../components/header';
import Footer from '../components/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | FreshNews.top',
  description: 'Privacy Policy for FreshNews.top - Learn how we handle your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="mx-auto mt-6 w-full max-w-[800px] px-5">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="post-title mb-6 text-[#ffd42a]">Privacy Policy</h1>
          <p className="text-[12px] text-[var(--text-muted)] mb-6" style={{ fontFamily: 'var(--font-en)' }}>
            Last updated: April 2026
          </p>

          <div className="article-body text-[var(--text-primary)]">
            <p>
              At FreshNews.top, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
            </p>

            <p><strong>1. Information We Collect</strong></p>
            <p>
              We may collect information about you in a variety of ways. The information we may collect includes:<br/>
              • <strong>Usage Data:</strong> Information about your device, browser type, IP address, pages visited, time spent on pages, and other diagnostic data.<br/>
              • <strong>Cookies:</strong> We use cookies and similar tracking technologies to track activity on our website and hold certain information.
            </p>

            <p><strong>2. How We Use Your Information</strong></p>
            <p>
              We use the information we collect to:<br/>
              • Provide, operate, and maintain our website<br/>
              • Improve, personalize, and expand our website<br/>
              • Understand and analyze how you use our website<br/>
              • Develop new products, services, features, and functionality
            </p>

            <p><strong>3. Third-Party Services</strong></p>
            <p>
              We may employ third-party companies and services to facilitate our website, provide services on our behalf, or assist us in analyzing how our website is used. These third parties have access to your information only to perform these tasks and are obligated not to disclose or use it for any other purpose.
            </p>

            <p><strong>4. Advertising</strong></p>
            <p>
              We may use third-party advertising companies to serve ads when you visit our website. These companies may use information about your visits to provide advertisements about goods and services of interest to you.
            </p>

            <p><strong>5. Data Security</strong></p>
            <p>
              The security of your data is important to us. We strive to use commercially acceptable means to protect your personal information, but no method of transmission over the Internet or electronic storage is 100% secure.
            </p>

            <p><strong>6. Children&apos;s Privacy</strong></p>
            <p>
              Our website does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13.
            </p>

            <p><strong>7. Changes to This Privacy Policy</strong></p>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. Changes are effective immediately after they are posted on this page.
            </p>

            <p><strong>8. Contact Us</strong></p>
            <p>
              If you have questions about this Privacy Policy, please contact us at: <a href="mailto:kerlot4@gmail.com" className="text-[#ffd42a] hover:underline">kerlot4@gmail.com</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
