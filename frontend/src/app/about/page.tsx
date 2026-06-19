'use client';

import React from 'react';
import Layout from '../../components/Layout';
import ScrollReveal from '../../components/ScrollReveal';
import { Cpu, Globe, Database, Zap, Newspaper, Shield, Users, Target } from 'lucide-react';

const PIPELINE_STEPS = [
  { icon: <Globe style={{ width: 24, height: 24 }} />, title: 'Discover', desc: 'We continuously scan Google News RSS feeds across 10+ categories to discover breaking stories from India and the world.' },
  { icon: <Cpu style={{ width: 24, height: 24 }} />, title: 'Extract', desc: 'Firecrawl scrapes full article text from source publications, extracting clean content, images, and metadata.' },
  { icon: <Zap style={{ width: 24, height: 24 }} />, title: 'Synthesize', desc: 'Google Gemini 1.5 Flash analyzes each article, generating structured summaries, key facts, sentiment analysis, and editorial sections.' },
  { icon: <Database style={{ width: 24, height: 24 }} />, title: 'Publish', desc: 'Enriched stories are stored in Supabase (PostgreSQL) and cached via Upstash Redis, then delivered instantly to your screen.' },
];

const TECH_STACK = [
  { name: 'Gemini 1.5 Flash', role: 'AI Synthesis', color: '#4285f4' },
  { name: 'Firecrawl', role: 'Web Scraping', color: '#e65100' },
  { name: 'Supabase', role: 'Database', color: '#3ecf8e' },
  { name: 'Upstash Redis', role: 'Caching', color: '#00e9a3' },
  { name: 'Next.js', role: 'Frontend', color: '#000000' },
  { name: 'Express.js', role: 'Backend API', color: '#333333' },
];

export default function AboutPage() {
  return (
    <Layout showNav={false}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
        color: '#fff',
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginBottom: 20 }}>
            {['I', 'R'].map((l, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 48, height: 48, background: '#fff', color: '#111',
                fontWeight: 900, fontSize: 24, fontFamily: 'Georgia, serif',
              }}>{l}</span>
            ))}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 16,
            letterSpacing: '-0.02em',
          }}>
            About India Reports
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', maxWidth: 560, margin: '0 auto' }}>
            India&apos;s first fully autonomous AI-powered news intelligence platform,
            delivering real-time synthesized coverage across every major category.
          </p>
        </div>
      </div>

      <div className="static-page">
        {/* Mission */}
        <ScrollReveal>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 56 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Target style={{ width: 20, height: 20, color: 'var(--ir-crimson)' }} />
                <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, marginTop: 0 }}>Our Mission</h2>
              </div>
              <p>
                To democratize access to comprehensive, AI-synthesized news intelligence that cuts through noise
                and delivers the essential facts from hundreds of trusted sources — updated every 15 minutes,
                completely autonomously.
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Shield style={{ width: 20, height: 20, color: 'var(--ir-crimson)' }} />
                <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, marginTop: 0 }}>Our Vision</h2>
              </div>
              <p>
                To build the most trusted, transparent, and technologically advanced news platform in India — where
                AI augments journalism rather than replacing it, and every citizen has access to clear, unbiased
                reporting.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* How It Works */}
        <ScrollReveal>
          <h2>How It Works</h2>
          <div className="divider-accent" />
          <p style={{ marginBottom: 32 }}>
            Our fully automated pipeline transforms raw news into structured intelligence reports in under 60 seconds:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 56 }}>
            {PIPELINE_STEPS.map((step, i) => (
              <div key={i} style={{
                padding: 24,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-secondary)',
                borderTop: '3px solid var(--ir-crimson)',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--ir-crimson-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px', color: 'var(--ir-crimson)',
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ir-crimson)', marginBottom: 6 }}>
                  Step {i + 1}
                </div>
                <h3 style={{ fontSize: 17, marginBottom: 8, marginTop: 0 }}>{step.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-ink-muted)', margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Tech Stack */}
        <ScrollReveal>
          <h2>Technology Stack</h2>
          <div className="divider-accent" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 56 }}>
            {TECH_STACK.map((tech, i) => (
              <div key={i} style={{
                padding: '20px 24px',
                border: '1px solid var(--border-secondary)',
                borderLeft: `4px solid ${tech.color}`,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: `${tech.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 900, color: tech.color,
                  fontFamily: 'var(--font-sans)',
                }}>
                  {tech.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>{tech.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>{tech.role}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Team */}
        <ScrollReveal>
          <h2>Editorial Team</h2>
          <div className="divider-accent" />
          <div style={{
            padding: 32,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-secondary)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--color-ink)', color: 'var(--bg-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 900, fontFamily: 'Georgia, serif',
              margin: '0 auto 16px',
            }}>
              IR
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 6, marginTop: 0 }}>India Reports AI Editorial Desk</h3>
            <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
              Our editorial content is autonomously generated by advanced AI models, with human oversight
              for accuracy and quality assurance. Every article is fact-checked against multiple trusted sources.
            </p>
          </div>
        </ScrollReveal>
      </div>

    </Layout>
  );
}
