import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Pole to Paddock — how we handle your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display mb-2 text-2xl font-bold text-white">Privacy Policy</h1>
        <p className="mb-8 text-sm text-white/30">Last updated: February 13, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-white/60">
          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Overview</h2>
            <p>
              Pole to Paddock is a fan-built Formula 1 information site. We believe in
              keeping things simple: we collect as little data as possible and we do not
              sell any information about our visitors. This policy explains what data is
              collected when you use the site and why.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Information We Collect Automatically</h2>
            <p>
              When you visit Pole to Paddock, our hosting provider may automatically
              collect basic technical information to serve the site and maintain
              security. This can include:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Pages viewed and time of access</li>
              <li>Browser type and operating system</li>
              <li>Referring URL (the page that linked you here)</li>
              <li>Country-level location derived from your IP address</li>
            </ul>
            <p className="mt-2">
              This data is aggregated and anonymized. We do not store raw IP addresses
              in our own systems or attempt to identify individual visitors.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Information You Provide</h2>
            <p>
              Pole to Paddock does not currently require user accounts, logins, or
              registration. We do not collect your name, email address, or any other
              personal information directly. If we add features that require personal
              information in the future, this policy will be updated before those
              features launch.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Cookies and Local Storage</h2>
            <p>
              The site may use local storage in your browser to save your preferences,
              such as temperature units (Celsius/Fahrenheit) or speed units (kph/mph).
              These preferences stay on your device and are never sent to our servers.
            </p>
            <p className="mt-2">
              We do not currently use third-party tracking cookies or advertising
              networks. If analytics or advertising tools are added in the future, they
              will be disclosed here and you will be given the option to opt out.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Third-Party Services</h2>
            <p>
              The site is hosted on Vercel. Their infrastructure handles request
              routing and may collect standard server logs. You can review{" "}
              <a href="https://vercel.com/legal/privacy-policy" className="text-white/70 underline hover:text-white" target="_blank" rel="noopener noreferrer">
                Vercel&apos;s privacy policy
              </a>{" "}
              for details on how they process data.
            </p>
            <p className="mt-2">
              Race data is fetched from third-party APIs (Jolpica, OpenF1). These
              requests are made server-side, meaning your browser does not communicate
              with those services directly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Data Retention</h2>
            <p>
              Since we do not collect personal data, there is nothing to retain on a
              per-user basis. Hosting-level server logs are automatically rotated and
              deleted according to our hosting provider&apos;s standard retention schedule.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Your Rights</h2>
            <p>
              If you are located in the European Economic Area, United Kingdom, or
              another jurisdiction with data protection laws, you have the right to
              request access to, correction of, or deletion of any personal data we
              hold about you. Given that we do not collect personal data, there is
              unlikely to be anything to disclose — but we are happy to confirm that
              upon request.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Children</h2>
            <p>
              This site is not directed at children under 13. We do not knowingly
              collect information from anyone under the age of 13. If you believe a
              child has provided us with personal data, please contact us and we will
              remove it promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, the
              &ldquo;Last updated&rdquo; date at the top of this page will change. Continued
              use of the site after changes are posted constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Contact</h2>
            <p>
              If you have questions about this policy, you can reach us through the
              contact link in the site footer.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
