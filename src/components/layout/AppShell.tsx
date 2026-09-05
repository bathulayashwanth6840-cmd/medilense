'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Sparkles,
  ClipboardList,
  ScanText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  History,
  Plus,
  UploadCloud,
  Settings,
  HelpCircle,
  Menu,
  X,
  Search,
  Bell,
  Stethoscope,
  ShieldAlert,
  ChevronDown,
  ExternalLink,
  Lock
} from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import DisclaimerModal from './DisclaimerModal';
import DocumentUploader from '@/components/documents/DocumentUploader';
import Breadcrumbs, { BreadcrumbItem } from './Breadcrumbs';

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export default function AppShell({ children, breadcrumbs }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPatientId, setUploadPatientId] = useState<string | null>(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Live Notification / Badge Stats
  const [stats, setStats] = useState<{
    pendingVerification: number;
    activeConflicts: number;
  }>({ pendingVerification: 0, activeConflicts: 0 });

  useEffect(() => {
    // Fetch live summary stats for notification badges
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const json = await res.json();
        if (json.success && json.data) {
          setStats({
            pendingVerification: json.data.pendingVerification || 0,
            activeConflicts: json.data.activeConflicts || 0,
          });
        }
      } catch {}
    };
    fetchStats();
  }, [pathname]);

  // Global search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch('/api/patients');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const q = searchQuery.toLowerCase();
          const matches = json.data.filter(
            (p: any) =>
              p.fullName.toLowerCase().includes(q) ||
              p.identifier.toLowerCase().includes(q) ||
              (p.notes && p.notes.toLowerCase().includes(q))
          );
          setSearchResults(matches);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowSearchResults(false);
  }, [pathname]);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/' || pathname === '/dashboard',
    },
    {
      label: 'Patients',
      href: '/patients',
      icon: Users,
      active: pathname.startsWith('/patients') && !pathname.startsWith('/patients/new'),
    },
    {
      label: 'Medical Documents',
      href: '/documents',
      icon: FileText,
      active: pathname.startsWith('/documents'),
    },
    {
      label: 'AI Extraction',
      href: '/extractions',
      icon: Sparkles,
      active: pathname.startsWith('/extractions'),
    },
    {
      label: 'Structured Records',
      href: '/records',
      icon: ClipboardList,
      active: pathname.startsWith('/records'),
    },
    {
      label: 'Source Evidence',
      href: '/evidence',
      icon: ScanText,
      active: pathname.startsWith('/evidence'),
    },
    {
      label: 'Conflict Detection',
      href: '/conflicts',
      icon: AlertTriangle,
      badge: stats.activeConflicts > 0 ? stats.activeConflicts : undefined,
      badgeColor: 'bg-amber-500 text-white',
      active: pathname.startsWith('/conflicts'),
    },
    {
      label: 'Human Verification',
      href: '/verification',
      icon: CheckCircle2,
      badge: stats.pendingVerification > 0 ? stats.pendingVerification : undefined,
      badgeColor: 'bg-teal-600 text-white',
      active: pathname.startsWith('/verification'),
    },
    {
      label: 'Lab Trends',
      href: '/trends',
      icon: TrendingUp,
      active: pathname.startsWith('/trends'),
    },
    {
      label: 'Audit Trail',
      href: '/audit',
      icon: History,
      active: pathname.startsWith('/audit'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* 1. Global Clinical Safety Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-950 to-indigo-950 text-white text-[11px] px-4 py-1.5 flex items-center justify-between border-b border-teal-900/50 z-50 sticky top-0">
        <div className="flex items-center gap-2 max-w-5xl truncate">
          <span className="inline-flex items-center gap-1 font-bold text-teal-300 uppercase tracking-wider text-[10px] bg-teal-950/90 px-2 py-0.5 rounded border border-teal-700/50 shrink-0">
            <ShieldAlert className="w-3 h-3 text-teal-400" /> Non-Diagnostic System
          </span>
          <span className="text-slate-300 text-xs truncate hidden sm:inline">
            MedLens organizes and explains documented records. It does not diagnose, prescribe, or replace qualified healthcare professionals.
          </span>
        </div>
        <button
          onClick={() => setShowDisclaimer(true)}
          className="text-[11px] text-teal-300 hover:text-white underline underline-offset-2 flex items-center gap-1 cursor-pointer transition shrink-0 ml-2"
        >
          <HelpCircle className="w-3 h-3" /> Safety Standards
        </button>
      </div>

      <div className="flex-1 flex flex-row w-full relative">
        {/* 2. Persistent Left Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 top-[31px] ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Top Brand Header */}
          <div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition">
                  <Stethoscope className="w-4 h-4 text-teal-100" />
                </div>
                <div>
                  <span className="font-bold text-base tracking-tight bg-gradient-to-r from-teal-700 via-slate-800 to-indigo-700 dark:from-teal-400 dark:via-slate-100 dark:to-indigo-300 bg-clip-text text-transparent">
                    MedLens
                  </span>
                  <span className="text-[9px] block font-semibold text-slate-400 uppercase tracking-widest -mt-0.5">
                    Clinical Intelligence
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Navigation List */}
            <div className="px-3 py-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-280px)]">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Navigation
              </span>

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition group ${
                      item.active
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/50 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition ${
                          item.active
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Workspace Action Section */}
              <div className="pt-4 pb-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Workspace
                </span>
                <div className="space-y-1">
                  <Link
                    href="/patients/new"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/15 border border-teal-500/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-teal-600" />
                    <span>New Patient Intake</span>
                  </Link>

                  <button
                    onClick={() => {
                      setUploadPatientId(null);
                      setShowUploadModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-500" />
                    <span>Upload Document</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Settings & Help & User Profile */}
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <Link
                href="/settings"
                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition font-medium"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => setShowDisclaimer(true)}
                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition font-medium cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Help</span>
              </button>
            </div>

            {/* Clinician Profile Strip */}
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                SJ
              </div>
              <div className="truncate flex-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                  Dr. Sarah Jenkins
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Clinician • Verified
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs md:hidden"
          />
        )}

        {/* 3. Main Content Container (Pushed right by sidebar on desktop) */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">
          {/* Top Bar / Global Header */}
          <header className="h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-[31px] z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
            {/* Left: Mobile Toggle & Global Search */}
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Global Search Bar */}
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient, MRN, or analyte..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition"
                />

                {/* Live Search Results Dropdown */}
                {showSearchResults && searchQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 text-xs space-y-1 max-h-72 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-center text-slate-400 text-xs animate-pulse">
                        Searching patient registry...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">
                        No patients match "{searchQuery}"
                      </div>
                    ) : (
                      searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            setSearchQuery('');
                            router.push(`/patients/${p.id}`);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {p.fullName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {p.identifier} • {p.sex} • {p.age ? `Age ${p.age}` : 'Age unavailable'}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                            Open &rarr;
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions & Theme & Status */}
            <div className="flex items-center gap-3">
              {/* Active Guardrails Indicator */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-semibold">Guardrails Active</span>
              </div>

              {/* Notification Bell */}
              <Link
                href="/conflicts"
                title={`${stats.activeConflicts} active conflicts requiring review`}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {stats.activeConflicts > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500"></span>
                )}
              </Link>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* New Patient CTA */}
              <Link
                href="/patients/new"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Patient</span>
              </Link>
            </div>
          </header>

          {/* 4. Main Page View Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
            {children}
          </main>
        </div>
      </div>

      {/* Global Modals */}
      <DisclaimerModal isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} />

      {showUploadModal && (
        <DocumentUploader
          patientId={uploadPatientId || undefined}
          onUploadSuccess={() => {
            setShowUploadModal(false);
            router.refresh();
          }}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}
