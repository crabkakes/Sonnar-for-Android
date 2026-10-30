import { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  ExternalLink,
  CheckCircle2,
  Terminal,
  Layers,
  ArrowRight,
  ShieldCheck,
  Github
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  onClose: () => void;
}

export function InstallModal({ onClose }: InstallModalProps) {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Install Sonarr on Android</h2>
              <p className="text-xs text-slate-400">Testing on mobile devices & APK generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Option Selector */}
        <div className="px-4 pt-3 flex items-center gap-2 border-b border-slate-800/80 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'pwa'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Direct PWA Install (Zero Build)</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'apk'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Build .APK / GitHub Workflow</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'pwa' ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-sky-500/10 border border-sky-500/25 rounded-xl text-sky-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-sky-200">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" /> Instant Testing Without Compiling
                </span>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  You can install this app directly onto your Android phone right now. It creates a dedicated launcher icon, runs full-screen without a browser URL bar, and functions identically to a native APK.
                </p>
              </div>

              {isInstalled ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Sonarr is already installed on this device in standalone mode.</span>
                </div>
              ) : isInstallable ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-98 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-transform shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App to Home Screen</span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  <span className="font-semibold text-slate-200 block">How to install via Android browser:</span>
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">1</span>
                      <span className="text-slate-300">Open this app's URL on your Android device in <strong>Chrome</strong>, <strong>Brave</strong>, or <strong>Samsung Internet</strong>.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">2</span>
                      <span className="text-slate-300">Tap the browser menu (<strong>⋮</strong> three dots in top-right or bottom-right).</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">3</span>
                      <span className="text-slate-300">Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Benefits of the PWA install on Android:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  <li>Zero sideloading or "unknown sources" permission warnings</li>
                  <li>Auto-updates whenever you push changes or deploy</li>
                  <li>Native window chrome and Android gesture navigation integration</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Direct APK Download Card */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Download className="w-5 h-5" />
                  <span>Download Test .APK</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  A standalone signed Android APK (<code className="text-emerald-300 font-mono">sonarr-android.apk</code>) has been built for this app. You can download and install it directly on your Android device:
                </p>
                <a
                  href="/sonarr-android.apk"
                  download="sonarr-android.apk"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-transform shadow-md text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Download sonarr-android.apk</span>
                </a>
                <span className="text-[10px] text-slate-400 block text-center">
                  Signed debug package · Android 5.0+ (API 21+) compatible
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-slate-400" /> Automated APK Releases on GitHub
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  We have included a pre-configured GitHub Actions workflow at <code className="text-sky-400 font-mono">.github/workflows/build-apk.yml</code>. When you push this project to your GitHub repository, GitHub Actions automatically compiles an Android <code className="text-sky-300 font-mono">.apk</code> artifact and attaches it to Releases!
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" /> Building the APK locally (CLI):
                </span>
                <p className="text-[11px] text-slate-400">
                  You can package this app as an Android APK locally in 2 minutes using Google's official <strong className="text-slate-300">Bubblewrap</strong> (Trusted Web Activity) CLI:
                </p>
                <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-sky-300 border border-slate-800 space-y-1 overflow-x-auto">
                  <div>npm install -g @bubblewrap/cli</div>
                  <div>bubblewrap init --manifest=https://&lt;your-app-url&gt;/manifest.json</div>
                  <div>bubblewrap build</div>
                </div>
                <p className="text-[10px] text-slate-500">
                  This generates a signed <code className="text-slate-300 font-mono">app-release-signed.apk</code> ready to install on any Android phone with <code className="text-slate-300 font-mono">adb install</code>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
