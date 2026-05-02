'use client'

import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
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

        <h2 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h2>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 2026-05-01</p>

        <div className="space-y-6 text-foreground">
          <section>
            <h3 className="text-lg font-semibold mb-2">1. Information We Collect</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you create an account, we collect your full name, email address, and
              a cryptographic representation of your password. These are stored locally
              in your browser using localStorage. We do not transmit account information
              to any external server.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">2. Network Data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Network connection records that you upload for analysis are sent to the
              local Sentinel backend service for prediction and stored in a local SQLite
              database. We do not share this data with any third party. Predictions and
              their associated metadata are retained until you clear the local database.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">3. Cookies and Local Storage</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sentinel uses browser localStorage to maintain your session and
              authentication state. No third-party tracking cookies are used.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">4. Data Retention</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Account data persists in your browser until you explicitly clear it.
              Prediction history persists in the backend SQLite database until you
              delete the database file.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">5. Your Rights</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Because all data is stored locally on your machine, you have full control.
              You may delete your account by clearing browser storage, and you may
              delete prediction history by removing the backend database file.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">6. Production Roadmap</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This prototype stores credentials in browser localStorage with a
              non-cryptographic hash, which is suitable for demonstration only.
              A production deployment would use server-side authentication with bcrypt
              and a hardened session management layer.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">7. Contact</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about this policy, refer to the project repository on
              GitHub.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
