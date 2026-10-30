import { useState, useEffect } from 'react';
import {
  Server,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Link2,
  Cpu,
  ShieldCheck,
  Loader2,
  Info
} from 'lucide-react';
import { SonarrConfig, DiskSpace, SystemStatus, HealthCheck } from '../types/sonarr';
import { sonarrApi } from '../services/sonarrApi';
import { formatBytes } from '../utils/formatters';

interface SystemScreenProps {
  config: SonarrConfig;
  onConfigUpdated: (newConfig: Partial<SonarrConfig>) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function SystemScreen({ config, onConfigUpdated, onShowToast }: SystemScreenProps) {
  const [hostUrl, setHostUrl] = useState(config.hostUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [useProxy, setUseProxy] = useState(config.useProxy);
  const [demoMode, setDemoMode] = useState(config.demoMode);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const [diskSpace, setDiskSpace] = useState<DiskSpace[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isLoadingSystem, setIsLoadingSystem] = useState(true);

  useEffect(() => {
    async function loadSystemInfo() {
      setIsLoadingSystem(true);
      try {
        const [disks, status, health] = await Promise.all([
          sonarrApi.getDiskSpace(),
          sonarrApi.getSystemStatus(),
          sonarrApi.getHealth()
        ]);
        setDiskSpace(disks);
        setSystemStatus(status);
        setHealthChecks(health);
      } catch (e) {
        console.error('Failed to load system info', e);
      } finally {
        setIsLoadingSystem(false);
      }
    }
    loadSystemInfo();
  }, [config]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await sonarrApi.testConnection(hostUrl, apiKey, useProxy);
      setTestResult(result);
      if (result.success) {
        onShowToast('success', result.message);
      } else {
        onShowToast('error', `Connection failed: ${result.message}`);
      }
    } catch (e: unknown) {
      const error = e as Error;
      setTestResult({ success: false, message: error.message || 'Connection failed' });
      onShowToast('error', 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnection = () => {
    onConfigUpdated({
      hostUrl: hostUrl.trim(),
      apiKey: apiKey.trim(),
      useProxy,
      demoMode
    });
    onShowToast('success', 'Sonarr connection settings saved');
  };

  const handleToggleDemoMode = (enabled: boolean) => {
    setDemoMode(enabled);
    onConfigUpdated({ demoMode: enabled });
    onShowToast('info', enabled ? 'Switched to Demo Simulation Mode' : 'Switched to Live Sonarr Server Mode');
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset all demo series, episodes, and downloads back to initial sample state?')) {
      sonarrApi.resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full pb-24 space-y-6">
      {/* SECTION 1: API CONNECTION SETTINGS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Sonarr API Connection</h2>
              <p className="text-xs text-slate-400">Connect to your local or remote Sonarr v3/v4 server</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden xs:inline">Mode:</span>
            <button
              onClick={() => handleToggleDemoMode(!demoMode)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                demoMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {demoMode ? 'Demo / Simulator' : 'Live Server'}
            </button>
          </div>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Host URL input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Sonarr Server Host URL
            </label>
            <input
              type="url"
              value={hostUrl}
              onChange={(e) => setHostUrl(e.target.value)}
              placeholder="http://192.168.1.50:8989 or https://sonarr.yourdomain.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default local port for Sonarr is usually <code className="text-slate-400 font-mono">:8989</code>.
            </span>
          </div>

          {/* API Key input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Sonarr API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter 32-character API key from Sonarr Settings > General"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Proxy switch */}
          <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div>
              <span className="font-semibold text-slate-200 block">Use Backend Proxy (CORS Bypass)</span>
              <span className="text-[11px] text-slate-400">
                Recommended when connecting from a web browser to an internal IP to prevent browser cross-origin blocks.
              </span>
            </div>
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => setUseProxy(e.target.checked)}
              className="w-5 h-5 rounded text-sky-500 focus:ring-sky-500 bg-slate-800 border-slate-700 shrink-0"
            />
          </div>

          {/* Test results banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-mono text-[11px]">{testResult.message}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
            <button
              onClick={handleResetDemoData}
              type="button"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> : <Activity className="w-4 h-4" />}
                <span>Test Connection</span>
              </button>
              <button
                type="button"
                onClick={handleSaveConnection}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 text-xs font-bold transition-transform shadow-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DISK SPACE & STORAGE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Disk Space</h2>
            <p className="text-xs text-slate-400">Storage pools configured in Sonarr</p>
          </div>
        </div>

        <div className="space-y-4">
          {diskSpace.map((disk) => {
            const usedSpace = disk.totalSpace - disk.freeSpace;
            const percentUsed = Math.round((usedSpace / disk.totalSpace) * 100);

            return (
              <div key={disk.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-200 block">
                      {disk.path}
                    </span>
                    <span className="text-[11px] text-slate-400">{disk.label}</span>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-300 shrink-0">
                    <span className="text-emerald-400 font-semibold">{formatBytes(disk.freeSpace)}</span> free of {formatBytes(disk.totalSpace)}
                  </div>
                </div>

                {/* Bar meter */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      percentUsed > 85 ? 'bg-rose-500' : percentUsed > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-mono text-right">
                  {percentUsed}% space used
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: SYSTEM HEALTH & ENVIRONMENT */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">System Information</h2>
            <p className="text-xs text-slate-400">Sonarr core engine status & runtime</p>
          </div>
        </div>

        {systemStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 block">Version</span>
              <span className="text-slate-200 font-bold">{systemStatus.version}</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 block">Package Branch</span>
              <span className="text-sky-400 font-bold">{systemStatus.branch}</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 block">Operating System</span>
              <span className="text-slate-200 font-bold truncate block">{systemStatus.osName}</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 block">.NET Runtime</span>
              <span className="text-slate-200 font-bold">{systemStatus.runtimeVersion || '8.0'}</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 block">Database</span>
              <span className="text-slate-200 font-bold">SQLite {systemStatus.sqliteVersion}</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 block">App Data Directory</span>
              <span className="text-slate-200 font-bold truncate block">{systemStatus.appData}</span>
            </div>
          </div>
        )}

        {/* Health checks */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Health Checks
          </span>
          {healthChecks.map((h) => (
            <div
              key={h.id}
              className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center gap-2.5 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 flex-1">{h.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
