// components/LoadingScreen.tsx — branded animated loader (logo pulse + orbit ring + gradient sweep)
import React from 'react'

export default function LoadingScreen({ fading }: { fading?: boolean }) {
  return (
    <div className={`sq-loader-root ${fading ? 'sq-fade' : ''}`}>
      <div className="sq-loader-stage">
        {/* orbit ring */}
        <svg className="sq-orbit" width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="sqOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f5ff" />
              <stop offset="100%" stopColor="#7b2fff" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="72" fill="none" stroke="#ffffff10" strokeWidth="3" />
          <circle cx="80" cy="80" r="72" fill="none" stroke="url(#sqOrbitGrad)" strokeWidth="3"
            strokeLinecap="round" strokeDasharray="120 360" className="sq-orbit-arc" />
        </svg>

        {/* logo with sweep shine */}
        <div className="sq-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-icon-cyan.png" alt="SRankIQ" className="sq-logo-img" />
          <div className="sq-sweep" />
        </div>
      </div>

      <div className="sq-loader-word">
        SRank<span>IQ</span>
      </div>
      <div className="sq-loader-sub">Social Media Ranking IQ</div>

      <style jsx>{`
        .sq-loader-root {
          position: fixed; inset: 0; z-index: 99999;
          background: radial-gradient(circle at 50% 40%, #0a0a1e 0%, #030309 70%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0; transition: opacity .5s ease, visibility .5s ease;
        }
        .sq-loader-root.sq-fade { opacity: 0; visibility: hidden; pointer-events: none; }
        .sq-loader-stage { position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; }
        .sq-orbit { position: absolute; inset: 0; animation: sq-spin 1.4s linear infinite; }
        .sq-orbit-arc { filter: drop-shadow(0 0 6px #00f5ff88); }
        @keyframes sq-spin { to { transform: rotate(360deg); } }

        .sq-logo-wrap {
          position: relative; width: 92px; height: 92px; border-radius: 22px; overflow: hidden;
          animation: sq-pulse 1.8s ease-in-out infinite;
          box-shadow: 0 0 40px rgba(0,180,255,0.25);
        }
        .sq-logo-img { width: 100%; height: 100%; object-fit: contain; display: block; }
        @keyframes sq-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.07); filter: brightness(1.25); }
        }
        .sq-sweep {
          position: absolute; top: 0; left: -120%; width: 60%; height: 100%;
          background: linear-gradient(110deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: skewX(-18deg); animation: sq-sweep 1.8s ease-in-out infinite;
        }
        @keyframes sq-sweep { 0% { left: -120%; } 55%, 100% { left: 160%; } }

        .sq-loader-word {
          margin-top: 26px; font-size: 26px; font-weight: 800; letter-spacing: 1px; color: #fff;
          font-family: 'Outfit', -apple-system, sans-serif;
        }
        .sq-loader-word span { background: linear-gradient(135deg,#00f5ff,#7b2fff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .sq-loader-sub {
          margin-top: 6px; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #6a6a8a;
          animation: sq-fadein 1.6s ease-in-out infinite alternate;
        }
        @keyframes sq-fadein { from { opacity: .4; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
