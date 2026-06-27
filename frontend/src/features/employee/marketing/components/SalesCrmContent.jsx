import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mail, MessageSquare, Plus, ChevronRight, TrendingUp, Users, BookOpen, Zap, MoreHorizontal, Paperclip, RefreshCw, CheckSquare, X, Calendar, RefreshCcw } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import CustomSelect from '../../../../components/CustomSelect';

// ─── Responsive breakpoint hook ────────────────────────────────────────────────
function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
  };
}

const getUniqueCourses = (leads) => {
  const courses = leads.map(l => l.course).filter(Boolean);
  return [...new Set(courses)];
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#003F87','#1565C0','#1976D2','#2196F3','#0288D1','#00796B','#388E3C','#F57C00','#7B1FA2'];
const avatarColor = (initials) => AVATAR_COLORS[(initials || 'A').charCodeAt(0) % AVATAR_COLORS.length];

function Avatar({ initials, size = 32 }) {
  return (
    <div 
      className="rounded-full text-white flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, background: avatarColor(initials), fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

// ─── Insight cards ────────────────────────────────────────────────────────────
function InsightCard({ title, icon, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EEF7', padding: '18px 20px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color: '#003F87' }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#555F6B' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function StatBadge({ label, value, delta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 26, fontWeight: 800, color: '#003F87', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{label}</span>
      {delta && <span style={{ fontSize: 10, color: '#27AE60', fontWeight: 700, marginTop: 1 }}>{delta}</span>}
    </div>
  );
}

function BarRow({ label, value, max, color = '#003F87' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#555', width: 90, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={label}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#EEF2F8', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <span className="text-[11px] font-bold text-[#003F87] w-5 text-right">{value}</span>
    </div>
  );
}

function SalespersonChip({ initials, name, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F7FC', borderRadius: 10, padding: '8px 14px', flex: 1, minWidth: 120 }}>
      <Avatar initials={initials} size={30} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2B4A' }}>{name}</div>
        <div style={{ fontSize: 11, color: '#777' }}>{count} leads</div>
      </div>
    </div>
  );
}

function InsightsHeader({ isMobile, isTablet, performance, leads = [] }) {
  const now = new Date();
  let daily = 0, weekly = 0, monthly = 0;
  let enrolled = 0, lost = 0;
  const courseCounts = {};

  leads.forEach(l => {
    let diffDays = Infinity;
    if (l.raw_created_at) {
      const created = new Date(l.raw_created_at);
      diffDays = (now - created) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) daily++;
      if (diffDays <= 7) weekly++;
      if (diffDays <= 30) monthly++;
    }

    if (diffDays <= 30) {
      if (l.stage === 'ADMISSION') enrolled++;
      if (l.stage === 'NOT CONNECTED') lost++;
    }

    if (l.course) {
      courseCounts[l.course] = (courseCounts[l.course] || 0) + 1;
    }
  });

  const totalClosed = Math.max(enrolled + lost, 1);
  const enrolledPct = enrolled > 0 ? Math.round((enrolled / totalClosed) * 100) : 0;
  const lostPct = lost > 0 ? Math.round((lost / totalClosed) * 100) : 0;

  const sortedCourses = Object.entries(courseCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxCourseCount = Math.max(...sortedCourses.map(c => c[1]), 1);
  const courseColors = ['#003F87', '#1976D2', '#0288D1'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Row 1: 3 stat cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <InsightCard title="New Lead Inflow" icon={<Users size={15} />}>
          <div className="flex justify-around">
            <StatBadge label="Daily" value={daily} />
            <StatBadge label="Weekly" value={weekly} />
            <StatBadge label="Monthly" value={monthly} />
          </div>
        </InsightCard>

        <InsightCard title="Closed Leads" icon={<CheckSquare size={15} />}>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#003F87] shrink-0" />
              <div className={`flex-1 h-2 rounded-full bg-[#EEF2F8] overflow-hidden`}>
                <div style={{ width: `${enrolledPct}%`, height: '100%', background: '#003F87', borderRadius: 4 }} />
              </div>
              <span className="text-[18px] font-extrabold text-[#003F87] min-w-[28px]">{enrolled}</span>
              <span className="text-xs text-slate-500">Admission</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E53935', flexShrink: 0 }} />
              <div className={`flex-1 h-2 rounded-full bg-[#EEF2F8] overflow-hidden`}>
                <div style={{ width: `${lostPct}%`, height: '100%', background: '#E53935', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#E53935', minWidth: 28 }}>{lost}</span>
              <span style={{ fontSize: 13, color: '#555' }}>Not Connected</span>
            </div>
          </div>
        </InsightCard>

        <InsightCard title="Top Course Interest" icon={<BookOpen size={15} />}>
          {sortedCourses.length > 0 ? (
            sortedCourses.map(([course, count], idx) => (
              <BarRow key={course} label={course} value={count} max={maxCourseCount} color={courseColors[idx]} />
            ))
          ) : (
            <div className="text-xs text-slate-400 italic text-center mt-4">No course data</div>
          )}
        </InsightCard>
      </div>

      {/* Row 2: Performance by salesperson */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EEF7', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <TrendingUp size={15} color="#003F87" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#555F6B' }}>Performance by Salesperson</span>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          {performance && performance.length > 0 ? (
            performance.map(p => (
              <SalespersonChip key={p.name} initials={p.initials} name={p.name} count={p.count} />
            ))
          ) : (
            <div className="text-xs text-slate-400 italic">No lead data available to show salesperson performance.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ lead, onOpenDetails }) {
  return (
    <div
      style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8EEF7', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'box-shadow .15s, border-color .15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,63,135,.10)'; e.currentTarget.style.borderColor = '#A8C0E8'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E8EEF7'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#003F87' }}>{lead.name}</span>
        <span style={{ fontSize: 10, color: '#999' }}>{lead.created_at}</span>
      </div>

      {lead.course && (
        <div className="text-[11px] text-slate-600">
          <span className="font-bold text-slate-800 text-[10px] uppercase tracking-wide">Course: </span>
          {lead.course}
        </div>
      )}

      {/* Note or badge */}
      {lead.note ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#666' }}>
          <Paperclip size={11} color="#999" /> {lead.note}
        </div>
      ) : lead.hot ? (
        <div className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-md px-2 py-0.5 w-fit">
          <Zap size={10} /> Hot Lead
        </div>
      ) : null}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F0F4FA', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar initials={lead.assigneeName ? lead.assigneeName.charAt(0) : 'U'} size={24} />
          <span style={{ fontSize: 11, color: '#666' }}>{lead.assigneeName}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onOpenDetails(lead, 'messages'); }}
            className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-[#003F87] hover:bg-slate-100 transition-colors"
            title="Message"
          >
            <MessageSquare size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onOpenDetails(lead, 'overview'); }}
            className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-[#003F87] hover:bg-slate-100 transition-colors"
            title="Details"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, getSourceName, onOpenDetails }) {
  const count = leads.filter(l => l.stage === stage).length;
  return (
    <div style={{ minWidth: 260, width: 260, display: 'flex', flexDirection: 'column', background: '#F7F9FC', borderRadius: 14, border: '1px solid #E8EEF7', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E8EEF7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EEF2F8', borderRadius: '14px 14px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1A2B4A' }}>{stage}</span>
          <span style={{ background: '#fff', color: '#555', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '1px 7px', border: '1px solid #D8E0EC' }}>{count}</span>
        </div>
        <MoreHorizontal size={15} className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {leads.filter(l => l.stage === stage).map(lead => (
          <LeadCard key={lead.id} lead={lead} getSourceName={getSourceName} onOpenDetails={onOpenDetails} />
        ))}
        {count === 0 && (
          <div className="text-center text-slate-400 text-xs mt-5">No leads</div>
        )}
      </div>
    </div>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 };
const fieldStyle = { width: '100%', padding: '9px 12px', border: '1px solid #D8E0EC', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

function AddLeadModal({ isOpen, onClose, onSave, sources, stages, teamMembers, coursesList }) {
  const { isMobile } = useBreakpoint();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    source_name: '',
    stage: stages[0],
    course_id: '',
    note: '',
    assigned_sales_id: '',
    owner: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    setForm({
      name: '',
      phone: '',
      email: '',
      source_name: '',
      stage: stages[0],
      course_id: '',
      note: '',
      assigned_sales_id: '',
      owner: ''
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,50,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: isMobile ? '100%' : 440, boxShadow: '0 16px 48px rgba(0,63,135,.18)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #EEF2F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F7F9FC' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1A2B4A' }}>Add New Lead</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>
          {[['Name', 'name', 'text', 'John Doe'], ['Phone', 'phone', 'text', '+91 98765 43210'], ['Email', 'email', 'email', 'john@example.com']].map(([label, key, type, ph]) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input type={type} required={key !== 'course'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={fieldStyle} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Source</label>
              <input type="text" value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} placeholder="e.g. Meta Ads" style={fieldStyle} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Stage</label>
              <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} style={{ ...fieldStyle, background: '#fff' }}>
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Course</label>
            <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} style={{ ...fieldStyle, background: '#fff' }}>
              <option value="">Select Course</option>
              {coursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Sales Lead</label>
              <select value={form.assigned_sales_id} onChange={e => setForm({ ...form, assigned_sales_id: e.target.value })} style={{ ...fieldStyle, background: '#fff' }}>
                <option value="">Select Employee</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Owner</label>
              <input type="text" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="Owner name" style={fieldStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Note</label>
            <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Optional note..." style={fieldStyle} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', border: '1px solid #D8E0EC', borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 700, color: '#555', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 18px', background: '#003F87', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Save Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Details Modal ────────────────────────────────────────────────────────────
function DetailsModal({ lead, initialTab = 'overview', onClose, onUpdateStage, stages, messages, onSendMessage }) {
  const { isMobile } = useBreakpoint();
  const [tab, setTab] = useState(initialTab);
  const [msg, setMsg] = useState('');

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  if (!lead) return null;

  const currentIndex = stages.indexOf(lead.stage);

  const handleSend = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    onSendMessage(lead.id, msg);
    setMsg('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,50,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: isMobile ? '100%' : 440, boxShadow: '0 16px 48px rgba(0,63,135,.18)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #EEF2F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F7F9FC' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1A2B4A' }}>Lead Details</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EEF2F8', background: '#F7F9FC', padding: '0 24px' }}>
          {['overview', 'messages'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 0', marginRight: 24, fontSize: 14, fontWeight: 700, color: tab === t ? '#003F87' : '#999', background: 'none', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: tab === t ? '#003F87' : 'transparent', cursor: 'pointer', textTransform: 'capitalize' }}>{t === 'messages' ? 'Messages & Notes' : 'Overview'}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 300, maxHeight: 500 }}>
          {tab === 'overview' && (
            <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: '1px solid #EEF2F8' }}>
                <Avatar initials={lead.name.charAt(0)} size={48} />
                <div>
                  <div className="text-[17px] font-extrabold text-slate-800">{lead.name}</div>
                  {lead.course && <div className="text-xs text-slate-500 mt-0.5">{lead.course}</div>}
                </div>
              </div>

              {/* Contact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ icon: <Phone size={15} />, val: lead.phone, href: `tel:${lead.phone}` }, { icon: <Mail size={15} />, val: lead.email, href: `mailto:${lead.email}` }].map(({ icon, val, href }) => (
                  <a key={href} href={href} className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700 p-2.5 bg-slate-50/50 rounded-[9px] border border-slate-100 hover:bg-slate-50 transition-colors decoration-transparent">
                    <span className="text-[#003F87]">{icon}</span> {val}
                  </a>
                ))}
              </div>

              {/* Sales Lead / Owner */}
              {(lead.foundByName || lead.owner) && (
                <div className="flex flex-col gap-1.5 -mt-1.5">
                  {lead.foundByName && (
                    <div className="flex items-center gap-2.5 text-[13px] text-slate-600">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">Sales Lead:</span>
                      <span>{lead.foundByName}</span>
                    </div>
                  )}
                  {lead.owner && (
                    <div className="flex items-center gap-2.5 text-[13px] text-slate-600">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">Owner:</span>
                      <span>{lead.owner}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">Update Stage</div>
                <div className="flex flex-wrap gap-2">
                  {stages.map((s, i) => {
                    const isActive = s === lead.stage;
                    const isException = s === 'NOT CONNECTED';
                    const isDisabled = !isException && i < currentIndex;
                    return (
                      <button
                        key={s}
                        onClick={() => { if (!isDisabled) onUpdateStage(lead.id, s); }}
                        disabled={isDisabled}
                        style={{
                          padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: isDisabled ? 'not-allowed' : 'pointer', border: '1px solid',
                          background: isActive ? '#003F87' : isDisabled ? '#F4F7FC' : '#fff',
                          color: isActive ? '#fff' : isDisabled ? '#bbb' : '#555',
                          borderColor: isActive ? '#003F87' : '#D8E0EC',
                          opacity: isDisabled ? .6 : 1,
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'messages' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F7F9FC', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(messages[lead.id] || []).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 pt-10">
                    <MessageSquare size={32} className="opacity-40 mb-2" />
                    <span className="text-[13px]">No messages yet.</span>
                  </div>
                ) : (
                  (messages[lead.id] || []).map(m => (
                    <div key={m.id} className="self-end bg-[#003F87] text-white rounded-[12px] rounded-br-[2px] p-2.5 max-w-[85%]">
                      <p className="m-0 text-[13px]">{m.text}</p>
                      <span className="text-[10px] opacity-70 mt-1 block text-right">{m.time}</span>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid #E8EEF7', background: '#fff', display: 'flex', gap: 8 }}>
                <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type a note..." style={{ flex: 1, border: '1px solid #D8E0EC', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
                <button type="submit" disabled={!msg.trim()} style={{ background: '#003F87', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: msg.trim() ? 'pointer' : 'not-allowed', opacity: msg.trim() ? 1 : .5 }}>Send</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const SalesCrmContent = () => {
  const { isMobile, isTablet } = useBreakpoint();

  const [leads, setLeads] = useState([]);
  const [sources, setSources] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [performance, setPerformance] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState({});

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedCourse, setSelectedCourse] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const datePickerRef = useRef(null);

  const stages = ['NEW', 'CONTACTED', 'FOLLOWUP', 'INTERESTED', 'ADMISSION', 'NOT CONNECTED'];

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
      const headers = userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};

      const [leadsRes, sourcesRes, empRes, coursesRes, perfRes] = await Promise.all([
        fetch('/api/v1/leads', { headers }).catch(() => null),
        fetch('/api/v1/leads/sources', { headers }).catch(() => null),
        fetch('/api/v1/employees', { headers }).catch(() => null),
        fetch('/api/v1/courses', { headers }).catch(() => null),
        fetch('/api/v1/leads/performance', { headers }).catch(() => null),
      ]);

      const lData = leadsRes?.ok ? await leadsRes.json() : null;
      const sData = sourcesRes?.ok ? await sourcesRes.json() : null;
      const eData = empRes?.ok ? await empRes.json() : null;
      const cData = coursesRes?.ok ? await coursesRes.json() : null;
      const pData = perfRes?.ok ? await perfRes.json() : null;

      setLeads(lData?.data || []);
      setSources(sData?.data || []);
      setEmployees(eData?.data || []);
      setCoursesList(cData?.data || []);
      setPerformance(pData?.data || []);
    } catch {
      console.error("Failed to fetch CRM data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const getSourceName = (sourceId) => sources.find(s => s.id === sourceId)?.source_name || 'Unknown';

  const filteredLeads = leads.filter(lead => {
    const matchesCourse = !selectedCourse || lead.course === selectedCourse;
    
    let matchesDate = true;
    if (startDate || endDate) {
      if (lead.raw_created_at) {
        const leadDate = new Date(lead.raw_created_at);
        leadDate.setHours(0,0,0,0);
        
        if (startDate && endDate) {
           matchesDate = leadDate >= startDate && leadDate <= endDate;
        } else if (startDate) {
           matchesDate = leadDate >= startDate;
        } else if (endDate) {
           matchesDate = leadDate <= endDate;
        }
      } else {
        matchesDate = false;
      }
    }
    return matchesCourse && matchesDate;
  });

  const handleAddLead = async (form) => {
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {})
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        await fetchLeads(); // refresh all to get correct relationships and counts
        setIsAddOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStage = async (id, newStage) => {
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
      const res = await fetch(`/api/v1/leads/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {})
        },
        body: JSON.stringify({ stage: newStage })
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l));
        setActiveLead(prev => prev?.id === id ? { ...prev, stage: newStage } : prev);
        // refresh performance if stage changes count (if performance filters by stage in future)
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessagesForLead = async (leadId) => {
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
      const res = await fetch(`/api/v1/leads/${leadId}/activities`, {
        headers: userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => ({ ...prev, [leadId]: data.data || [] }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (leadId, text) => {
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
      const res = await fetch(`/api/v1/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {})
        },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        await fetchMessagesForLead(leadId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenDetails = (lead, tab) => {
    setActiveLead(lead);
    setActiveTab(tab);
    if (tab === 'messages') {
      fetchMessagesForLead(lead.id);
    }
  };

  const uniqueCourses = getUniqueCourses(leads);
  const padding = isMobile ? 12 : 24;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#003F87', fontSize: 14, fontWeight: 600 }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', boxSizing: 'border-box', background: 'transparent', minHeight: '100vh' }}>

      {/* ── Main content area ── */}
      <div style={{ padding, display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

        {/* Page header */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-h-[52px]">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Lead Insights</h1>
            <p className="text-slate-500 mt-1">Manage leads and track your sales pipeline.</p>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-4 items-center justify-between w-full relative z-[60]">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            {/* Course Select */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 hover:border-[#003F87]/30 transition-colors w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-3 shrink-0">Course</span>
              <CustomSelect
                value={selectedCourse}
                onChange={setSelectedCourse}
                options={[
                  { value: '', label: 'All Courses' },
                  ...uniqueCourses.map(c => ({ value: c, label: c }))
                ]}
                className="w-full sm:w-[200px]"
                selectClassName="w-full bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer relative"
              />
            </div>

            {/* Date Filters (From and To) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 hover:border-[#003F87]/30 transition-colors">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">From</span>
                <div className="flex items-center gap-1">
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setDateRange([date, endDate])}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    isClearable={true}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select Date"
                    showMonthDropdown
                    showYearDropdown
                    scrollableYearDropdown
                    dropdownMode="scroll"
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-[140px] pr-7"
                  />
                  <Calendar size={14} className="text-slate-400 shrink-0 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 hover:border-[#003F87]/30 transition-colors">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">To</span>
                <div className="flex items-center gap-1">
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setDateRange([startDate, date])}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    isClearable={true}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select Date"
                    showMonthDropdown
                    showYearDropdown
                    scrollableYearDropdown
                    dropdownMode="scroll"
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-[140px] pr-7"
                  />
                  <Calendar size={14} className="text-slate-400 shrink-0 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 mt-4 sm:mt-0">
            <button 
              onClick={fetchLeads}
              className="bg-white border border-slate-200 hover:bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 transition-colors"
              title="Refresh Data"
            >
              <RefreshCcw size={16} />
            </button>
            <button onClick={() => setIsAddOpen(true)} style={{ background: '#003F87', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Plus size={15} /> Add Lead
            </button>
          </div>
        </div>

        {/* Insights */}
        <InsightsHeader isMobile={isMobile} isTablet={isTablet} performance={performance} leads={leads} />

        {/* Active filter indicator */}
        {selectedCourse && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555F6B', flexWrap: 'wrap' }}>
            <span>Showing <strong style={{ color: '#003F87' }}>{filteredLeads.length}</strong> of {leads.length} leads</span>
            <span style={{ background: '#E8EEF7', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Course: {selectedCourse}
              <button onClick={() => setSelectedCourse('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0, display: 'flex', alignItems: 'center' }}><X size={10} /></button>
            </span>
          </div>
        )}

        {/* Kanban */}
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, flex: 1 }}>
          {stages.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={filteredLeads}
              getSourceName={getSourceName}
              onOpenDetails={handleOpenDetails}
            />
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setIsAddOpen(true)}
        style={{ position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: '50%', background: '#003F87', color: '#fff', border: 'none', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,63,135,.35)', zIndex: 50 }}
        title="Add Lead"
      >
        <Plus size={22} />
      </button>

      <AddLeadModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSave={handleAddLead} 
        sources={sources} 
        stages={stages} 
        teamMembers={employees.filter(e => {
          const roleName = (e.employee_roles?.role_name || e.department || '').toUpperCase();
          const sysRole = (e.users?.role || '').toUpperCase();
          const allowedRoles = ['ADMIN', 'SUPER-ADMIN', 'SALES', 'ACCOUNTANT', 'ACCOUNTS', 'HR'];
          return allowedRoles.includes(roleName) || allowedRoles.includes(sysRole);
        })} 
        coursesList={coursesList} 
      />
      <DetailsModal
        lead={activeLead}
        initialTab={activeTab}
        onClose={() => setActiveLead(null)}
        onUpdateStage={handleUpdateStage}
        stages={stages}
        messages={messages}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default SalesCrmContent;
