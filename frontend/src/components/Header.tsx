'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Menu, X, Cpu, Sun, Moon, User, LogOut,
  ChevronRight, Globe, BookOpen, Shield, Mail, Newspaper, FileText, Scale,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import WeatherWidget from './WeatherWidget';
import LoginModal from './LoginModal';

const NAV_ITEMS = ['Home', 'India', 'World', 'Business', 'Tech', 'Sports', 'Science', 'Finance', 'Health', 'Entertainment', 'Politics'];

const DRAWER_PAGES = [
  { label: 'About Us', href: '/about', icon: <BookOpen style={{ width: 16, height: 16 }} /> },
  { label: 'Contact', href: '/contact', icon: <Mail style={{ width: 16, height: 16 }} /> },
  { label: 'E-Paper', href: '/e-paper', icon: <Newspaper style={{ width: 16, height: 16 }} /> },
  { label: 'Advertise', href: '/advertise', icon: <Globe style={{ width: 16, height: 16 }} /> },
  { label: 'Ethics Policy', href: '/ethics-policy', icon: <Shield style={{ width: 16, height: 16 }} /> },
  { label: 'Privacy Policy', href: '/privacy-policy', icon: <FileText style={{ width: 16, height: 16 }} /> },
  { label: 'Terms', href: '/terms', icon: <Scale style={{ width: 16, height: 16 }} /> },
  { label: 'Disclaimer', href: '/disclaimer', icon: <FileText style={{ width: 16, height: 16 }} /> },
];

interface HeaderProps {
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  onSearch?: (query: string) => void;
  onIngest?: () => void;
  ingesting?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  showNav?: boolean;
  onDisclaimerClick?: () => void;
}

export default function Header({
  activeNav = 'Home',
  onNavChange,
  onSearch,
  onIngest,
  ingesting = false,
  searchQuery = '',
  onSearchQueryChange,
  showNav = true,
  onDisclaimerClick,
}: HeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, isLoggedIn, logout } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [now] = useState(new Date());

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  }, [searchQuery, onSearch]);

  const clearSearch = useCallback(() => {
    onSearchQueryChange?.('');
    setSearchOpen(false);
  }, [onSearchQueryChange]);

  const handleNavClick = useCallback((item: string) => {
    if (onNavChange) {
      onNavChange(item);
    } else {
      router.push('/');
    }
    setDrawerOpen(false);
  }, [onNavChange, router]);

  return (
    <>
      {/* ── Main Header Bar (Utility Top bar removed) ── */}
      <header className={`ir-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="ir-container" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 76, position: 'relative',
        }}>
          
          {/* Left: Sidebar Icon + Date/Time Info Inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 280 }}>
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 10px', borderRadius: 4, display: 'flex',
                alignItems: 'center', color: 'var(--color-ink)',
              }}
              title="Menu"
            >
              {drawerOpen ? <X style={{ width: 24, height: 24 }} /> : <Menu style={{ width: 24, height: 24 }} />}
            </button>

            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.01em', color: 'var(--color-ink-muted)', whiteSpace: 'nowrap' }}>
              {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            
            <span style={{ width: 1, height: 16, background: 'var(--border-secondary)' }} />
            
            <WeatherWidget />
          </div>

          {/* Center: Logo */}
          <a href="/" style={{
            textDecoration: 'none',
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {['I', 'R'].map((l, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, background: 'var(--color-ink)', color: 'var(--bg-primary)',
                  fontWeight: 900, fontSize: 18, fontFamily: 'Georgia, serif',
                  letterSpacing: '-0.02em',
                }}>{l}</span>
              ))}
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em',
                color: 'var(--color-ink)', marginLeft: 8,
              }}>
                INDIA REPORTS
              </span>
            </div>
          </a>

          {/* Right: Search, Ingestion, Theme, Login */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 280, justifyContent: 'flex-end' }}>
            
            {/* Search Input inline left of update feed */}
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              {searchOpen ? (
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => onSearchQueryChange?.(e.target.value)}
                    placeholder="Search..."
                    className="ir-input"
                    style={{
                      width: 160, padding: '6px 12px', fontSize: 13, borderRadius: 6,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={ingesting || !searchQuery.trim()}
                    style={{
                      border: '1px solid var(--color-ink)', background: 'var(--color-ink)',
                      color: 'var(--bg-primary)', borderRadius: 6, padding: '6px 10px',
                      fontSize: 12, fontWeight: 700,
                      cursor: ingesting || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                      opacity: ingesting || !searchQuery.trim() ? 0.5 : 1,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Go
                  </button>
                </form>
              ) : null}
              
              <button
                onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) clearSearch(); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 8, color: 'var(--color-ink)', display: 'flex',
                }}
                title="Search"
              >
                {searchOpen ? <X style={{ width: 20, height: 20 }} /> : <Search style={{ width: 20, height: 20 }} />}
              </button>
            </div>

            {/* Update Feed Ingestion Button */}
            {onIngest && (
              <button
                onClick={onIngest} disabled={ingesting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: '2px solid var(--color-ink)',
                  background: ingesting ? 'var(--bg-secondary)' : 'var(--color-ink)',
                  color: ingesting ? 'var(--color-ink-faint)' : 'var(--bg-primary)',
                  borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700,
                  cursor: ingesting ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
                  transition: 'all 0.2s', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)',
                }}
              >
                <Cpu style={{ width: 14, height: 14 }} />
                {ingesting ? 'Updating…' : 'Update Feed'}
              </button>
            )}

            {/* Theme Toggle in between update feed and login */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              style={{
                color: 'var(--color-ink)', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 8, transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'rotate(15deg)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}
            >
              {isDark ? <Sun style={{ width: 20, height: 20 }} /> : <Moon style={{ width: 20, height: 20 }} />}
            </button>

            {/* Login / Profile dropdown */}
            {isLoggedIn && user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-ink)', fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--ir-crimson)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {user.avatarInitial}
                  </span>
                  <span className="hide-mobile">{user.displayName}</span>
                </button>
                
                {userMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                    borderRadius: 8, padding: 8, minWidth: 160,
                    boxShadow: 'var(--shadow-lg)', zIndex: 100,
                  }}>
                    <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-ink-muted)', borderBottom: '1px solid var(--border-secondary)', marginBottom: 4 }}>
                      {user.email}
                    </div>
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '8px 12px', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 12, color: 'var(--ir-crimson)',
                        fontWeight: 600, borderRadius: 4, fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <LogOut style={{ width: 14, height: 14 }} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: '1.5px solid var(--border-primary)',
                  background: 'var(--bg-primary)',
                  color: 'var(--color-ink)',
                  borderRadius: 24, padding: '8px 18px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.borderColor = 'var(--color-ink-muted)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                }}
              >
                <User style={{ width: 15, height: 15 }} />
                Login
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar */}
        {showNav && (
          <div className="ir-nav-desktop" style={{ borderTop: '1px solid var(--border-faint)' }}>
            <div className="ir-container" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0,
            }}>
              {NAV_ITEMS.map(item => (
                <button
                  key={item}
                  onClick={() => handleNavClick(item)}
                  className={`ir-nav-item ${item === activeNav ? 'active' : ''}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile Drawer Overlay ────────────────────────────────────────────── */}
      <div
        className={`ir-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Mobile Drawer ────────────────────────────────────────────────────── */}
      <nav className={`ir-drawer ${drawerOpen ? 'open' : ''}`}>
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {['I', 'R'].map((l, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, background: 'var(--color-ink)', color: 'var(--bg-primary)',
                fontWeight: 900, fontSize: 13, fontFamily: 'Georgia, serif',
              }}>{l}</span>
            ))}
            <span style={{
              fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 900,
              color: 'var(--color-ink)', marginLeft: 6,
            }}>
              INDIA REPORTS
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)', padding: 4 }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Category Links */}
        <div style={{ padding: '8px 0' }}>
          <div style={{
            padding: '8px 24px', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--color-ink-faint)',
          }}>
            Sections
          </div>
          {NAV_ITEMS.map(item => (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
              className={`ir-drawer-link ${item === activeNav ? 'active' : ''}`}
            >
              <ChevronRight style={{ width: 14, height: 14, opacity: 0.4 }} />
              {item}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-secondary)', margin: '8px 24px' }} />

        {/* Page Links */}
        <div style={{ padding: '8px 0' }}>
          <div style={{
            padding: '8px 24px', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--color-ink-faint)',
          }}>
            Pages
          </div>
          {DRAWER_PAGES.map(page => {
            if (page.label === 'Disclaimer') {
              return (
                <button
                  key={page.label}
                  className="ir-drawer-link"
                  onClick={() => {
                    setDrawerOpen(false);
                    onDisclaimerClick?.();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {page.icon}
                  {page.label}
                </button>
              );
            }
            return (
              <a
                key={page.href}
                href={page.href}
                className="ir-drawer-link"
                onClick={() => setDrawerOpen(false)}
              >
                {page.icon}
                {page.label}
              </a>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-secondary)', margin: '8px 24px' }} />

        {/* Dark mode in drawer */}
        <div style={{ padding: '12px 24px' }}>
          <button
            onClick={toggleTheme}
            className="ir-drawer-link"
            style={{ border: 'none', padding: '10px 0', borderBottom: 'none' }}
          >
            {isDark ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* Login in drawer */}
        {!isLoggedIn && (
          <div style={{ padding: '12px 24px' }}>
            <button
              onClick={() => { setLoginOpen(true); setDrawerOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%',
                border: '1.5px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--color-ink)',
                borderRadius: 24, padding: '10px 18px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-ink-muted)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-primary)';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
              }}
            >
              <User style={{ width: 15, height: 15 }} />
              Login
            </button>
          </div>
        )}
      </nav>

      {/* Login Modal */}
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
