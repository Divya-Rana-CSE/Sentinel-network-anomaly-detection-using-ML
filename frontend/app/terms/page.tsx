'use client'

import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
            <Shield className="w-6 h-6 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold glow-neon-blue">SENTINEL</h1>
        </div>

        <Link
          href="/signup"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign Up
        </Link>

        <h2 className="text-3xl font-bold text-foreground mb-2">Terms and Conditions</h2>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 2026-05-01</p>

        <div className="space-y-6 text-foreground">
          <section>
            <h3 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By creating an account, you agree to be bound by these Terms and Conditions.
              Sentinel is provided as an academic prototype for network anomaly detection
              research and demonstration purposes.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">2. Use of Service</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may upload network connection records in the supported NSL-KDD feature
              format for analysis. You are responsible for ensuring you have the right to
              process any data you upload. Do not upload data containing personally
              identifiable information or sensitive credentials.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">3. No Warranty</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sentinel is a research prototype. Predictions are produced by a machine
              learning model trained on the NSL-KDD benchmark dataset and should not be
              relied on as the sole basis for security decisions in production
              environments. The service is provided "as is" without warranty of any kind.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">4. Account Security</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account
              credentials. The current authentication system uses local browser storage
              and is intended for demonstration only.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">5. Limitation of Liability</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The authors and contributors of Sentinel shall not be liable for any
              damages arising from the use or inability to use this software, including
              but not limited to missed detections, false positives, or downstream
              security incidents.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">6. Changes to Terms</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These terms may be updated as the project evolves. Continued use of the
              service after changes constitutes acceptance of the revised terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
