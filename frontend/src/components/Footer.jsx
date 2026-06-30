import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 text-white mb-4">
              <span className="text-xl">🦸</span>
              <span className="text-lg font-bold">Community Hero</span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              AI-powered civic issue reporting platform where citizens collaborate to resolve neighborhood infrastructure and environmental problems.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform Info</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-slate-400">Status Timeline: Reported ➔ Verified ➔ Assigned ➔ In Progress ➔ Resolved</span>
              </li>
              <li>
                <span className="text-slate-400 font-semibold text-primary-400">Dual-Mode SDK Architecture</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Google Cloud Hackathon</h4>
            <p className="text-sm">
              Built using React, Node.js + Express, Google Gemini 1.5 Flash API, Google Maps API, and Firebase. Deployable on Google Cloud Run.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              © {new Date().getFullYear()} Community Hero Project. Open Source.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
