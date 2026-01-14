
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  Activity,
  Calendar,
  Search,
  CheckCircle2,
  Clock3,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  Bell,
  ChevronDown,
  ArrowUpRight,
  Filter,
  X,
  ChevronRight,
  Target,
  Trophy,
  RefreshCw,
  Zap,
  Info,
  AlertTriangle,
  History,
  PlusCircle,
  BookmarkCheck,
  Database,
  CloudCheck,
  CloudOff,
  TableProperties,
  LayoutTemplate,
  ExternalLink,
  ShieldAlert,
  Terminal,
  FileJson,
  Layers,
  Award,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  Timer,
  Flame,
  ZapOff
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { fetchGymData } from './data';
import { DashboardModule, GymRecord, User, MemberSummary, TrainerSummary } from './types';
import { chatWithTitan } from './services/geminiService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Auth = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockUser: User = { id: 'usr_1', email, name: email.split('@')[0], gymBranch: 'Main', role: 'Admin' };
    localStorage.setItem('test_gym_user', JSON.stringify(mockUser));
    onLogin(mockUser);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-6">
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-3xl border border-slate-800 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-blue-600/10 rounded-3xl mb-6"><Zap className="text-blue-500" size={42} /></div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">TEST GYM CRM</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Next-Gen Facility Intelligence</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" placeholder="Admin Email" className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all">Enter Workspace</button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [records, setRecords] = useState<GymRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<DashboardModule>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<{ type: 'member' | 'trainer', data: MemberSummary | TrainerSummary } | null>(null);

  const loadData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setSyncError(null);
    try {
      const result = await fetchGymData();
      if (result.records.length > 0) {
        setRecords(result.records);
      } else {
        setSyncError(result.raw || "No valid session records found in spreadsheet.");
      }
    } catch (err: any) {
      setSyncError(err.message || 'Connection Error: Cloud endpoint is currently unreachable.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem('test_gym_user');
    if (user) setCurrentUser(JSON.parse(user));
    loadData();
    const interval = setInterval(() => loadData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const lowerSearch = searchTerm.toLowerCase();
    return records.filter(r => 
      r.Member_Name?.toString().toLowerCase().includes(lowerSearch) ||
      r.Trainer_Name?.toString().toLowerCase().includes(lowerSearch) ||
      r.Class_Name?.toString().toLowerCase().includes(lowerSearch) ||
      r.Membership_Type?.toString().toLowerCase().includes(lowerSearch)
    );
  }, [records, searchTerm]);

  const membersMap = useMemo(() => {
    const map = new Map<string, MemberSummary>();
    records.forEach(r => {
      const memberName = r.Member_Name?.toString().trim() || 'Unknown';
      const idKey = (r.Member_ID && r.Member_ID > 0) ? `id-${r.Member_ID}` : `name-${memberName}`;
      if (!map.has(idKey)) {
        map.set(idKey, { id: r.Member_ID || 0, name: memberName, age: r.Age || 0, gender: r.Gender || 'N/A', type: r.Membership_Type || 'N/A', attended: 0, totalStay: 0, sessions: [] });
      }
      const m = map.get(idKey)!;
      m.sessions.push(r);
      if (r.Attendance_Status === 'Yes') { m.attended++; m.totalStay += (r.Stay_Duration || 0); }
      if (r.Membership_Type && r.Membership_Type !== 'N/A') m.type = r.Membership_Type;
    });
    return map;
  }, [records]);

  const trainersMap = useMemo(() => {
    const map = new Map<string, TrainerSummary>();
    records.forEach(r => {
      const name = r.Trainer_Name?.toString().trim();
      if (!name || name === 'None' || name === '') return;
      if (!map.has(name)) {
        map.set(name, { name, id: r.Trainer_ID, totalAttended: 0, classes: new Set(), sessions: [] });
      }
      const t = map.get(name)!;
      t.sessions.push(r);
      if (r.Class_Name) t.classes.add(r.Class_Name.toString());
      if (r.Attendance_Status === 'Yes') t.totalAttended++;
    });
    return map;
  }, [records]);

  const attendanceIntelligence = useMemo(() => {
    const hourStats: Record<number, number> = {};
    const consistencyRank: MemberSummary[] = Array.from(membersMap.values()).sort((a,b) => b.attended - a.attended).slice(0, 10);
    
    records.forEach(r => {
      if (r.Attendance_Status === 'Yes' && r.Scheduled_Start_Time) {
        // Extract hour from "08:00 AM" or "14:30"
        const timeStr = r.Scheduled_Start_Time.toString();
        let hour = parseInt(timeStr.split(':')[0]);
        if (timeStr.toLowerCase().includes('pm') && hour < 12) hour += 12;
        if (timeStr.toLowerCase().includes('am') && hour === 12) hour = 0;
        hourStats[hour] = (hourStats[hour] || 0) + 1;
      }
    });

    const hourlyData = Array.from({ length: 24 }).map((_, i) => ({
      hour: `${i % 12 || 12}${i >= 12 ? 'PM' : 'AM'}`,
      count: hourStats[i] || 0
    }));

    return { hourlyData, consistencyRank };
  }, [records, membersMap]);

  const analyticsData = useMemo(() => {
    const attendanceByDay: Record<string, number> = {};
    const attendanceByClass: Record<string, number> = {};
    const attendanceByTrainer: Record<string, number> = {};
    const membershipDistribution: Record<string, number> = {};
    const earlyExitReasons: Record<string, number> = {};

    records.forEach(r => {
      if (r.Attendance_Status === 'Yes') {
        const day = r.Day || 'Unknown';
        const cls = r.Class_Name || 'Unknown';
        const trainer = r.Trainer_Name || 'Unknown';
        attendanceByDay[day] = (attendanceByDay[day] || 0) + 1;
        attendanceByClass[cls] = (attendanceByClass[cls] || 0) + 1;
        attendanceByTrainer[trainer] = (attendanceByTrainer[trainer] || 0) + 1;
        if (r.Early_Exit_Flag === 'Yes' && r.Exit_Reason && r.Exit_Reason !== 'None') {
          earlyExitReasons[r.Exit_Reason] = (earlyExitReasons[r.Exit_Reason] || 0) + 1;
        }
      }
    });

    membersMap.forEach(m => {
      const type = m.type || 'Unknown';
      membershipDistribution[type] = (membershipDistribution[type] || 0) + 1;
    });

    const dailyData = DAYS_OF_WEEK.map(day => ({ name: day, count: attendanceByDay[day] || 0 }));
    const classData = Object.entries(attendanceByClass).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);
    const trainerData = Object.entries(attendanceByTrainer).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);
    const membershipData = Object.entries(membershipDistribution).map(([name, value]) => ({ name, value }));
    const exitReasonData = Object.entries(earlyExitReasons).map(([name, value]) => ({ name, value }));

    return { dailyData, classData, trainerData, membershipData, exitReasonData };
  }, [records, membersMap]);

  const metrics = useMemo(() => {
    const total = records.length || 1;
    const attended = records.filter(r => r.Attendance_Status === 'Yes').length;
    const annualCount = Array.from(membersMap.values()).filter(m => m.type.toLowerCase().includes('annual')).length;
    return {
      members: membersMap.size,
      annualCount,
      rate: ((attended / total) * 100).toFixed(1),
      avgStay: (records.reduce((acc, r) => acc + (r.Stay_Duration || 0), 0) / (attended || 1)).toFixed(0),
      revenueProjection: Array.from(membersMap.values()).reduce<number>((acc, m) => acc + (m.type.toLowerCase().includes('annual') ? 12000 : 2500), 0)
    };
  }, [records, membersMap]);

  if (!currentUser) return <Auth onLogin={setCurrentUser} />;

  return (
    <div className="flex h-screen bg-[#020617] text-white font-sans overflow-hidden">
      <aside className="w-20 lg:w-72 bg-slate-900/20 backdrop-blur-3xl border-r border-slate-800 flex flex-col p-6">
        <div className="flex items-center gap-3 px-2 mb-12">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30"><Zap size={24} /></div>
          <span className="hidden lg:block text-xl font-black uppercase tracking-tighter">TEST GYM</span>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Summary" active={activeModule === 'overview'} onClick={() => setActiveModule('overview')} />
          <NavItem icon={<TrendingUp size={20} />} label="Analytics" active={activeModule === 'analytics'} onClick={() => setActiveModule('analytics')} />
          <NavItem icon={<Users size={20} />} label="Members" active={activeModule === 'members'} onClick={() => setActiveModule('members')} />
          <NavItem icon={<Activity size={20} />} label="Trainers" active={activeModule === 'trainers'} onClick={() => setActiveModule('trainers')} />
          <NavItem icon={<Timer size={20} />} label="Attendance Flow" active={activeModule === 'attendance'} onClick={() => setActiveModule('attendance')} />
          <NavItem icon={<MessageSquare size={20} />} label="Titan AI" active={activeModule === 'ai-assistant'} onClick={() => setActiveModule('ai-assistant')} />
        </nav>
        <button onClick={() => { localStorage.removeItem('test_gym_user'); window.location.reload(); }} className="flex items-center gap-4 px-5 py-3.5 text-slate-500 hover:text-rose-500 transition-colors">
          <LogOut size={20} />
          <span className="hidden lg:block text-sm font-bold uppercase tracking-tighter text-left">Sign Out</span>
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative bg-gradient-to-br from-slate-950 via-slate-950 to-blue-950/10">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black uppercase tracking-tight">{activeModule.replace('-', ' ')}</h1>
              {records.length > 0 ? (
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5"><Layers size={12} /> Live Pulse</div>
              ) : (
                <div className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5"><CloudOff size={12} /> Sync Pending</div>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1 font-medium">Facility Presence & Flow Ingestion</p>
          </div>
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="text" placeholder="Global identification..." className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => loadData()} disabled={isLoading} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all flex-shrink-0">
              <RefreshCw size={18} className={`text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
            <RefreshCw size={64} className="text-blue-600 animate-spin" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Synchronizing Intelligence Nodes...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in duration-700">
             <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-[3rem]">
                <ShieldAlert size={56} className="text-rose-500 mx-auto mb-6" />
                <h3 className="text-2xl font-black uppercase mb-4">Empty Data Stream</h3>
                <p className="text-slate-400 mb-8">{syncError || "Linked spreadsheet contains no recognized session logs."}</p>
                <button onClick={() => loadData()} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><RefreshCw size={18} /> Forced Handshake</button>
             </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-500">
            {activeModule === 'overview' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Unique Members" value={metrics.members} icon={<Users className="text-blue-500" />} />
                  <StatCard label="Annual Enrolled" value={metrics.annualCount} icon={<Award className="text-amber-500" />} />
                  <StatCard label="Attendance Index" value={`${metrics.rate}%`} icon={<CheckCircle2 className="text-emerald-500" />} />
                  <StatCard label="Rev Outlook" value={`₹${metrics.revenueProjection.toLocaleString('en-IN')}`} icon={<TrendingUp className="text-indigo-500" />} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] h-[400px]">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 text-center">Membership Segmentation</h3>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                          <Pie
                            data={analyticsData.membershipData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            label={({name, value}) => `${name}: ${value}`}
                          >
                            {analyticsData.membershipData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] h-[400px] flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 text-center">Daily Peak Ingestion</h3>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="90%">
                         <BarChart data={analyticsData.dailyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} cursor={{fill: '#1e293b'}} />
                            <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                         </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeModule === 'analytics' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="bg-slate-900/30 border border-slate-800 p-10 rounded-[2.5rem] h-[450px]">
                      <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-2 text-center">Top classes by Attendance</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-8 text-center">Live Weekly Ranking</p>
                      <ResponsiveContainer width="100%" height="80%">
                         <BarChart data={analyticsData.classData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                            <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} width={100} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} cursor={{fill: '#1e293b'}} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                   
                   <div className="bg-slate-900/30 border border-slate-800 p-10 rounded-[2.5rem] h-[450px]">
                      <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-2 text-center">Top Trainer Engagement</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-8 text-center">Facility Load Impact</p>
                      <ResponsiveContainer width="100%" height="80%">
                         <BarChart data={analyticsData.trainerData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                            <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} width={100} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} cursor={{fill: '#1e293b'}} />
                            <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="bg-slate-900/30 border border-slate-800 p-10 rounded-[2.5rem] h-[450px] flex flex-col">
                      <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-8 text-center">Plan Distribution Breakdown</h3>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={analyticsData.membershipData}
                                 cx="50%"
                                 cy="50%"
                                 outerRadius={100}
                                 dataKey="value"
                                 label={({name, value}) => `${name}: ${value}`}
                              >
                                 {analyticsData.membershipData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                           </PieChart>
                        </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="bg-slate-900/30 border border-slate-800 p-10 rounded-[2.5rem] h-[450px] flex flex-col">
                      <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-2 text-center">Early Exit Attribution</h3>
                      <p className="text-sm text-slate-500 mb-8 text-center font-bold">Churn Risk Analysis</p>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={analyticsData.exitReasonData}
                                 cx="50%"
                                 cy="50%"
                                 outerRadius={100}
                                 dataKey="value"
                              >
                                 {analyticsData.exitReasonData.map((entry, index) => (
                                    <Cell key={`cell-exit-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                              <Legend verticalAlign="bottom" align="center" />
                           </PieChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                </div>
              </div>
            )}
            
            {activeModule === 'members' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from(membersMap.values()).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                  <div 
                    key={`${m.name}-${m.id}`} 
                    onClick={() => setSelectedDetail({ type: 'member', data: m })}
                    className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/50 transition-all cursor-pointer group hover:bg-slate-900/60"
                  >
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex-1 overflow-hidden">
                         <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors truncate">{m.name}</h3>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">ID {m.id || 'N/A'} • {m.type}</p>
                       </div>
                       <div className="p-2 bg-slate-950 rounded-lg group-hover:bg-blue-600 transition-colors ml-3"><UserIcon size={14} className="text-slate-500 group-hover:text-white" /></div>
                    </div>
                    <div className="mt-6 flex justify-between pt-4 border-t border-slate-800">
                      <div><p className="text-[10px] text-slate-500 uppercase font-bold">Visits</p><p className="font-black text-lg">{m.attended}</p></div>
                      <div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-bold">Avg Session</p><p className="font-black text-lg text-blue-500">{(m.totalStay / (m.attended || 1)).toFixed(0)}m</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeModule === 'trainers' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from(trainersMap.values()).filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                  <div 
                    key={t.name} 
                    onClick={() => setSelectedDetail({ type: 'trainer', data: t })}
                    className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] text-center hover:bg-slate-900/60 transition-all group cursor-pointer"
                  >
                    <div className="w-20 h-20 bg-slate-800 rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center ring-4 ring-slate-900 group-hover:ring-blue-500/20 transition-all">
                      <Dumbbell className="text-blue-500 group-hover:scale-110 transition-transform" size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-1 tracking-tight group-hover:text-blue-400">{t.name}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Staff Performance Expert</p>
                    <div className="pt-6 border-t border-slate-800 flex justify-center gap-10">
                      <div><p className="text-[10px] text-slate-500 font-bold uppercase">Load</p><p className="text-lg font-black">{t.classes.size} Classes</p></div>
                      <div><p className="text-[10px] text-slate-500 font-bold uppercase">Impact</p><p className="text-lg font-black text-emerald-500">{t.totalAttended}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeModule === 'attendance' && (
               <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-10 rounded-[2.5rem] h-[500px]">
                        <div className="flex justify-between items-center mb-8">
                           <div>
                              <h3 className="text-xl font-bold uppercase tracking-tight">24h Facility Density</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Hourly Entry Flow Distribution</p>
                           </div>
                           <Clock className="text-blue-500" size={24} />
                        </div>
                        <ResponsiveContainer width="100%" height="80%">
                           <AreaChart data={attendanceIntelligence.hourlyData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                              <XAxis dataKey="hour" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#colorHour)" strokeWidth={4} />
                              <defs>
                                <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>

                     <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[2.5rem]">
                        <div className="flex justify-between items-center mb-8">
                           <h3 className="text-xl font-bold uppercase tracking-tight">Consistency Rank</h3>
                           <Trophy className="text-amber-500" size={24} />
                        </div>
                        <div className="space-y-4">
                           {attendanceIntelligence.consistencyRank.map((m, idx) => (
                              <div key={m.name} className="flex items-center gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-2xl">
                                 <span className="text-slate-500 font-black text-xs w-6">{idx + 1}</span>
                                 <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-200">{m.name}</p>
                                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{m.type}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-sm font-black text-blue-500">{m.attended}</p>
                                    <p className="text-[8px] text-slate-500 uppercase font-black">Visits</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                     <div className="p-8 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <Activity className="text-emerald-500" size={20} />
                           <h3 className="font-black uppercase tracking-tighter text-lg">Live Activity Pulse</h3>
                        </div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{records.length} total entries</span>
                     </div>
                     <div className="p-4 overflow-x-auto">
                        <div className="flex gap-4 pb-4 px-4 min-w-max">
                           {records.slice(-15).reverse().map((r, i) => (
                              <div key={i} className="w-64 p-5 bg-slate-950 border border-slate-800 rounded-3xl shrink-0 hover:border-blue-500/50 transition-all">
                                 <div className="flex justify-between items-start mb-4">
                                    <div className="px-2.5 py-1 bg-slate-900 rounded-lg text-[8px] font-black uppercase text-slate-400">{r.Date}</div>
                                    {r.Attendance_Status === 'Yes' ? <Flame size={14} className="text-orange-500" /> : <ZapOff size={14} className="text-slate-600" />}
                                 </div>
                                 <h4 className="font-bold text-white mb-1 truncate">{r.Member_Name}</h4>
                                 <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{r.Class_Name}</p>
                                 <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                                    <span className={`text-[9px] font-black uppercase ${r.Attendance_Status === 'Yes' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                       {r.Attendance_Status === 'Yes' ? 'Present' : 'Missed'}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-600">{r.Scheduled_Start_Time}</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            )}
            
            {activeModule === 'ai-assistant' && <AIChatInterface records={records} />}
          </div>
        )}
      </main>

      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedDetail(null)}></div>
           <div className="w-full max-w-xl bg-slate-900 h-full border-l border-slate-800 shadow-2xl relative flex flex-col animate-in slide-in-from-right duration-500">
              {(() => {
                const detail = selectedDetail!;
                const isMember = detail.type === 'member';
                const mData = detail.data as MemberSummary;
                const tData = detail.data as TrainerSummary;
                return (
                  <>
                    <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600/10 rounded-2xl"><Layers size={20} className="text-blue-500" /></div>
                          <div>
                             <h3 className="font-black uppercase tracking-tighter text-lg">{isMember ? 'Member Profile' : 'Trainer Profile'}</h3>
                             <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Global Profile Active</p>
                          </div>
                       </div>
                       <button onClick={() => setSelectedDetail(null)} className="p-3 hover:bg-slate-800 rounded-2xl transition-all"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scroll">
                       <div className="flex items-center gap-6">
                          <div className="w-24 h-24 bg-slate-800 rounded-[2.5rem] flex items-center justify-center border-4 border-slate-800 shadow-xl overflow-hidden">
                             {isMember ? <UserIcon size={48} className="text-blue-500" /> : <Dumbbell size={48} className="text-indigo-500" />}
                          </div>
                          <div className="flex-1">
                             <h2 className="text-3xl font-black uppercase tracking-tighter">{detail.data.name}</h2>
                             <div className="flex gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] font-black uppercase tracking-widest text-slate-400">ID: {detail.data.id || 'N/A'}</span>
                                {isMember && <span className="px-2 py-0.5 bg-blue-500/10 rounded text-[9px] font-black uppercase tracking-widest text-blue-500">{mData.type}</span>}
                             </div>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-slate-950 border border-slate-800 rounded-[2rem]">
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{isMember ? 'Total Visits' : 'Impact Logs'}</p>
                             <p className="text-2xl font-black">{isMember ? mData.attended : tData.totalAttended}</p>
                          </div>
                          <div className="p-6 bg-slate-950 border border-slate-800 rounded-[2rem]">
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{isMember ? 'Avg Duration' : 'Specialties'}</p>
                             <p className="text-2xl font-black text-blue-500">{isMember ? `${(mData.totalStay / (mData.attended || 1)).toFixed(0)}m` : tData.classes.size}</p>
                          </div>
                       </div>
                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                             <h4 className="font-black uppercase tracking-widest text-xs text-slate-500 flex items-center gap-2"><History size={14} /> Historical Intelligence</h4>
                          </div>
                          <div className="space-y-3">
                             {detail.data.sessions.slice(-15).reverse().map((s: any, idx: number) => (
                                <div key={idx} className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between group/row hover:border-slate-700 transition-all">
                                   <div>
                                      <p className="font-bold text-slate-200 text-sm">{s.Class_Name}</p>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{s.Date} • {isMember ? `Coach: ${s.Trainer_Name}` : `Client: ${s.Member_Name}`}</p>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase ${s.Attendance_Status === 'Yes' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                         {s.Attendance_Status === 'Yes' ? (s.Stay_Duration > 0 ? `${s.Stay_Duration}m` : 'Present') : 'Missed'}
                                      </span>
                                      <ArrowRight size={14} className="text-slate-700 group-hover/row:text-white transition-colors" />
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                    <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex gap-4">
                       <button className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Export Segment</button>
                       <button onClick={() => loadData(true)} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2">
                          <Zap size={14} /> Pulse Refresh
                       </button>
                    </div>
                  </>
                );
              })()}
           </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:bg-slate-800'}`}>
      <span className={`${active ? 'text-white' : 'group-hover:text-blue-400 transition-colors'}`}>{icon}</span>
      <span className="hidden lg:block text-sm font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] group hover:border-slate-700 transition-all cursor-default">
      <div className="p-2.5 bg-slate-950 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform group-hover:bg-blue-600/10">{icon}</div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-2xl font-black text-white tracking-tight">{value}</h4>
    </div>
  );
}

function AIChatInterface({ records }: { records: GymRecord[] }) {
  const [messages, setMessages] = useState([{ role: 'bot', text: "Titan Online. Analytical core linked. How can I assist with your gym intelligence today?" }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsTyping(true);
    const response = await chatWithTitan(msg, records);
    setMessages(prev => [...prev, { role: 'bot', text: response }]);
    setIsTyping(false);
  };
  return (
    <div className="max-w-4xl mx-auto h-[600px] flex flex-col bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex items-center gap-4">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><MessageSquare size={18} /></div>
        <div>
           <h3 className="font-black text-base uppercase tracking-tighter">TITAN INTELLIGENCE</h3>
           <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Neural Link Active</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-slate-950/20 scrollbar-hide">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-6 py-4 rounded-3xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-[10px] font-black text-blue-500 animate-pulse uppercase tracking-widest">Querying Intelligence Core...</div>}
      </div>
      <div className="p-8 border-t border-slate-800 bg-slate-900">
        <div className="flex gap-3 p-1.5 bg-slate-950 border border-slate-800 rounded-3xl focus-within:ring-2 focus-within:ring-blue-600 transition-all">
          <input type="text" placeholder="Query analytical core..." className="flex-1 bg-transparent px-4 outline-none text-sm font-medium" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
          <button onClick={handleSend} disabled={isTyping} className="bg-blue-600 p-3 rounded-2xl hover:bg-blue-500 transition-colors shadow-lg active:scale-90 transition-transform"><ArrowUpRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}
