export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'TBA';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHours = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHours / 24);

    if (Math.abs(diffDays) >= 2) {
      return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
    }
    if (Math.abs(diffHours) >= 1) {
      return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
    }
    if (Math.abs(diffMin) >= 1) {
      return diffMin > 0 ? `in ${diffMin}m` : `${Math.abs(diffMin)}m ago`;
    }
    return 'just now';
  } catch {
    return '';
  }
}

export function getQualityBadgeColor(qualityName?: string): string {
  if (!qualityName) return 'bg-slate-800 text-slate-300';
  const q = qualityName.toLowerCase();
  if (q.includes('2160') || q.includes('4k') || q.includes('uhd')) {
    return 'bg-purple-950/80 text-purple-300 border border-purple-800/50';
  }
  if (q.includes('1080')) {
    return 'bg-sky-950/80 text-sky-300 border border-sky-800/50';
  }
  if (q.includes('720')) {
    return 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50';
  }
  return 'bg-slate-800 text-slate-300 border border-slate-700';
}
