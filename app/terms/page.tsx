import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Pole to Paddock.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display mb-2 text-2xl font-bold text-white">Terms of Service</h1>
        <p className="mb-8 text-sm text-white/30">Last updated: February 13, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-white/60">
          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Pole to Paddock (&ldquo;the Site&rdquo;), you agree to be
              bound by these Terms of Service. If you do not agree with any part of
              these terms, please do not use the Site.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">2. What This Site Is</h2>
            <p>
              Pole to Paddock is a free, fan-operated resource that aggregates publicly
              available Formula 1 data including race schedules, standings, telemetry,
              and driver/team information. The Site is intended for informational and
              entertainment purposes only.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">3. Formula 1 Disclaimer</h2>
            <p>
              This website is unofficial and is not associated in any way with the
              Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD
              CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One
              Licensing B.V. All team names, driver names, logos, and associated imagery
              are the property of their respective owners and are used here for
              editorial commentary and fan analysis under fair use principles.
            </p>
            <p className="mt-2">
              Pole to Paddock is not endorsed, sponsored, or affiliated with Formula
              One Management (FOM), the FIA, or any Formula 1 constructor or team.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">4. Accuracy of Information</h2>
            <p>
              While we make reasonable efforts to ensure the data displayed is accurate
              and up to date, we cannot guarantee the completeness or correctness of any
              information on the Site. Live timing feeds may contain gaps, delays, or
              errors. Contract details, salary figures, and transfer rumors are compiled
              from public reporting and may not reflect the most current situation.
            </p>
            <p className="mt-2">
              You should not rely on information from this Site for any decision where
              accuracy is critical. For official results and standings, refer to{" "}
              <a href="https://www.formula1.com" className="text-white/70 underline hover:text-white" target="_blank" rel="noopener noreferrer">
                formula1.com
              </a>{" "}
              or the FIA.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">5. Permitted Use</h2>
            <p>You are welcome to use the Site for personal, non-commercial purposes. This includes:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Browsing race data, standings, and statistics</li>
              <li>Sharing links to pages on the Site</li>
              <li>Using the Site as a reference for fan discussions, blog posts, or social media</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">6. Prohibited Use</h2>
            <p>You may not:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Use automated tools (bots, scrapers, spiders) to extract data from the
                Site in bulk
              </li>
              <li>
                Reproduce, redistribute, or sell the Site&apos;s content or data
                compilations for commercial purposes
              </li>
              <li>
                Attempt to interfere with, disrupt, or overload the Site&apos;s
                infrastructure
              </li>
              <li>
                Misrepresent the Site as an official Formula 1 product or service
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">7. Intellectual Property</h2>
            <p>
              The Site&apos;s design, code, and original written content are owned by Pole
              to Paddock. Formula 1 data displayed on the Site originates from publicly
              available community APIs and is presented for informational purposes. We
              do not claim ownership of any Formula 1 data, trademarks, or media
              belonging to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">8. Third-Party Links and Services</h2>
            <p>
              The Site may contain links to external websites, APIs, or services that we
              do not control. We are not responsible for the content, privacy practices,
              or availability of those third-party resources. Visiting external links is
              at your own discretion.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">9. Disclaimer of Warranties</h2>
            <p>
              The Site is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without
              warranties of any kind, whether express or implied. We do not warrant that
              the Site will be uninterrupted, error-free, or free from harmful
              components. We make no guarantees regarding the accuracy, reliability, or
              timeliness of any data or content.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Pole to Paddock and its operators
              shall not be liable for any indirect, incidental, special, or
              consequential damages arising out of or in connection with your use of the
              Site. This includes, but is not limited to, damages for loss of data,
              revenue, or profits, even if we have been advised of the possibility of
              such damages.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">11. Changes to These Terms</h2>
            <p>
              We may revise these Terms of Service at any time. When we make changes,
              the &ldquo;Last updated&rdquo; date at the top will be revised. Your continued use
              of the Site after any changes indicates your acceptance of the updated
              terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">12. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with applicable
              law. Any disputes arising from these terms or your use of the Site will
              be resolved in the appropriate courts of the jurisdiction in which the
              Site&apos;s operator resides.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">13. Contact</h2>
            <p>
              If you have questions or concerns about these terms, you can reach us
              through the contact link in the site footer.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
