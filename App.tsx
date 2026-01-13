
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
  BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { fetchGymData } from './data';
import { DashboardModule, GymRecord, User } from './types';
import { chatWithTitan } from './services/geminiService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- Mock Data Generator (Fallback) ---
const generateDemoData = (): GymRecord[] => {
  const trainers = ["Rahul Mehta", "Sarah Chen", "Mike Ross", "Elena Gomez"];
  const classes = ["Yoga Flow", "HIIT Blast", "Power Lifting", "Zumba Core"];
  const members = ["Amit Shah", "Priya Rai", "Kevin Durant", "Jessica Alba", "Tom Hardy"];
  const data: GymRecord[] = [];
  
  // Generate 250 records distributed over the last 90 days to ensure 2 months of coverage
  const baseDate = new Date(); 
  
  for (let i = 0; i < 250; i++) {
    const isPresent = Math.random() > 0.15;
    const date = new Date(baseDate);
    date.setDate(date.getDate() - (i % 90)); 
    
    const dateStr = date.toISOString().split('T')[0];
    const dayName = DAYS_OF_WEEK[date.getDay() === 0 ? 6 : date.getDay() - 1];
    
    data.push({
      Date: dateStr,
      Day: dayName,
      Day_Type: date.getDay() === 0 || date.getDay() === 6 ? "Weekend" : "Weekday",
      Member_ID: 1000 + (i % 15),
      Member_Name: members[i % members.length],
      Age: 18 + Math.floor(Math.random() * 45),
      Gender: i % 2 === 0 ? "Male" : "Female",
      Membership_Type: i % 4 === 0 ? "Platinum" : i % 3 === 0 ? "Gold" : "Silver",
      Class_ID: 500 + (i % classes.length),
      Class_Name: classes[i % classes.length],
      Trainer_ID: 200 + (i % trainers.length),
      Trainer_Name: trainers[i % trainers.length],
      Scheduled_Start_Time: "08:00 AM",
      Scheduled_End_Time: "09:00 AM",
      Session_Capacity: 20,
      Attendance_Status: isPresent ? "Yes" : "No",
      Late_Flag: Math.random() > 0.8 ? "Yes" : "No",
      Early_Exit_Flag: "No",
      Exit_Reason: "None",
      Stay_Duration: isPresent ? 30 + Math.floor(Math.random() * 90) : 0
    });
  }
  return data.sort((a, b) => a.Date.localeCompare(b.Date));
};

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
  const [rawDebug, setRawDebug] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<DashboardModule>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{ type: 'member' | 'trainer', data: any } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setSyncError(null);
    setRawDebug(null);
    try {
      const result = await fetchGymData();
      if (result.records.length > 0) {
        setRecords(result.records);
        setIsDemoMode(false);
      } else {
        setSyncError(result.raw || "Connection Established, but no data records were found.");
        setRecords([]);
      }
    } catch (err: any) {
      setSyncError(err.message || 'Request Denied: Google Cloud rejected the connection.');
      setRawDebug("A 400 Error usually means the URL is invalid or the sheet has restricted API access.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem('test_gym_user');
    if (user) setCurrentUser(JSON.parse(user));
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const lowerSearch = searchTerm.toLowerCase();
    return records.filter(r => 
      r.Member_Name?.toLowerCase().includes(lowerSearch) ||
      r.Trainer_Name?.toLowerCase().includes(lowerSearch) ||
      r.Class_Name?.toLowerCase().includes(lowerSearch) ||
      r.Membership_Type?.toLowerCase().includes(lowerSearch)
    );
  }, [records, searchTerm]);

  const membersMap = useMemo(() => {
    const map = new Map<number, any>();
    records.forEach(r => {
      const id = r.Member_ID;
      if (!map.has(id)) {
        map.set(id, { id, name: r.Member_Name, age: r.Age, gender: r.Gender, type: r.Membership_Type, attended: 0, totalStay: 0, sessions: [] });
      }
      const m = map.get(id);
      m.sessions.push(r);
      if (r.Attendance_Status === 'Yes') { m.attended++; m.totalStay += (r.Stay_Duration || 0); }
    });
    return map;
  }, [records]);

  const trainersMap = useMemo(() => {
    const map = new Map<string, any>();
    records.forEach(r => {
      const name = r.Trainer_Name;
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, { name, id: r.Trainer_ID, totalAttended: 0, classes: new Set(), sessions: [] });
      }
      const t = map.get(name);
      t.sessions.push(r);
      if (r.Class_Name) t.classes.add(r.Class_Name);
      if (r.Attendance_Status === 'Yes') t.totalAttended++;
    });
    return map;
  }, [records]);

  // Advanced Analytics Data Preparation
  const analyticsData = useMemo(() => {
    const attendanceByDay: Record<string, number> = {};
    const attendanceByClass: Record<string, number> = {};
    const membershipDistribution: Record<string, number> = {};
    const genderDistribution: Record<string, number> = {};

    records.forEach(r => {
      if (r.Attendance_Status === 'Yes') {
        attendanceByDay[r.Day] = (attendanceByDay[r.Day] || 0) + 1;
        attendanceByClass[r.Class_Name] = (attendanceByClass[r.Class_Name] || 0) + 1;
      }
      membershipDistribution[r.Membership_Type] = (membershipDistribution[r.Membership_Type] || 0) + 1;
      genderDistribution[r.Gender] = (genderDistribution[r.Gender] || 0) + 1;
    });

    const dailyData = DAYS_OF_WEEK.map(day => ({ name: day, count: attendanceByDay[day] || 0 }));
    const classData = Object.entries(attendanceByClass).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
    const membershipData = Object.entries(membershipDistribution).map(([name, value]) => ({ name, value }));
    const genderData = Object.entries(genderDistribution).map(([name, value]) => ({ name, value }));

    return { dailyData, classData, membershipData, genderData };
  }, [records]);

  // Session Trend Logic for "Last 2 Months" - Replaces Intensity Flux
  const sessionTrendData = useMemo(() => {
    if (records.length === 0) return [];
    
    // Find the latest date in the data
    const latestDateStr = records.reduce((max, r) => (r.Date > max ? r.Date : max), records[0].Date);
    const latestDate = new Date(latestDateStr);
    
    // Go back 60 days
    const twoMonthsAgo = new Date(latestDate);
    twoMonthsAgo.setDate(latestDate.getDate() - 60);
    
    // Group records by day and count sessions
    const dailySessions: Record<string, number> = {};
    
    records.forEach(r => {
      const d = new Date(r.Date);
      if (d >= twoMonthsAgo && d <= latestDate && r.Attendance_Status === 'Yes') {
        dailySessions[r.Date] = (dailySessions[r.Date] || 0) + 1;
      }
    });
    
    return Object.entries(dailySessions)
      .map(([date, count]) => ({
        name: date,
        count: count
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const metrics = useMemo(() => {
    const total = records.length || 1;
    const attended = records.filter(r => r.Attendance_Status === 'Yes').length;
    // Mocking revenue in Rupees (approx 80x USD scale for demo visibility)
    return {
      members: membersMap.size,
      rate: ((attended / total) * 100).toFixed(1),
      avgStay: (records.reduce((acc, r) => acc + (r.Stay_Duration || 0), 0) / (attended || 1)).toFixed(0),
      count: records.length,
      revenueProjection: Array.from(membersMap.values()).reduce((acc, m) => acc + (m.type === 'Platinum' ? 15000 : m.type === 'Gold' ? 8000 : 4000), 0)
    };
  }, [records, membersMap]);

  if (!currentUser) return <Auth onLogin={setCurrentUser} />;

  return (
    <div className="flex h-screen bg-[#020617] text-white font-sans overflow-hidden">
      {/* Sidebar */}
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
          <NavItem icon={<History size={20} />} label="Attendance" active={activeModule === 'attendance'} onClick={() => setActiveModule('attendance')} />
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
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5"><Layers size={12} /> Live Sync</div>
              ) : (
                <div className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5"><CloudOff size={12} /> Offline</div>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1 font-medium">{isDemoMode ? 'Demo Data Simulation Active' : 'Test Gym Aggregated Intelligence Hub'}</p>
          </div>
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="text" placeholder="Global filter..." className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={loadData} disabled={isLoading} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all flex-shrink-0">
              <RefreshCw size={18} className={`text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {isLoading && records.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
            <RefreshCw size={64} className="text-blue-600 animate-spin" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Mapping Cloud Endpoints...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in duration-700">
             <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-[3rem]">
                <ShieldAlert size={56} className="text-rose-500 mx-auto mb-6" />
                <h3 className="text-2xl font-black uppercase mb-4">Cloud Handshake Failed</h3>
                <p className="text-slate-400 mb-8">{syncError}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={() => { setRecords(generateDemoData()); setIsDemoMode(true); }} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Zap size={18} /> Load Demo</button>
                  <button onClick={loadData} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><RefreshCw size={18} /> Retry Sync</button>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-500">
            {activeModule === 'overview' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Total Hub Members" value={metrics.members} icon={<Users className="text-blue-500" />} />
                  <StatCard label="Presence Coefficient" value={`${metrics.rate}%`} icon={<CheckCircle2 className="text-emerald-500" />} />
                  <StatCard label="Intensity Index" value={`${metrics.avgStay}m`} icon={<Clock className="text-amber-500" />} />
                  <StatCard label="Projected Rev (INR)" value={`₹${metrics.revenueProjection.toLocaleString('en-IN')}`} icon={<TrendingUp className="text-indigo-500" />} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] h-[400px]">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">Session Volume (Last 2 Months)</h3>
                    <ResponsiveContainer width="100%" height="80%">
                      <AreaChart data={sessionTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#colorIntensity)" strokeWidth={4} />
                        <defs>
                          <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] h-[400px] flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">Membership Tier Distribution</h3>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.membershipData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
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
                  </div>
                </div>
              </>
            )}

            {activeModule === 'analytics' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800 p-10 rounded-[2.5rem] h-[450px]">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">Class Popularity Ingest</h3>
                      <ResponsiveContainer width="100%" height="90%">
                         <BarChart data={analyticsData.classData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} cursor={{fill: '#1e293b'}} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                   
                   <div className="bg-slate-900/30 border border-slate-800 p-10 rounded-[2.5rem] h-[450px] flex flex-col">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">Demographic Breakdown</h3>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={analyticsData.genderData}
                                 cx="50%"
                                 cy="50%"
                                 outerRadius={80}
                                 fill="#8884d8"
                                 dataKey="value"
                                 label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                 {analyticsData.genderData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                           </PieChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900/30 border border-slate-800 p-10 rounded-[2.5rem] h-[400px]">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">Weekly Peak Analysis</h3>
                   <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={analyticsData.dailyData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                         <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                         <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                         <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} cursor={{fill: '#1e293b'}} />
                         <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} barSize={60} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {activeModule === 'members' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from(membersMap.values()).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => setSelectedDetail({ type: 'member', data: m })}
                    className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/50 transition-all cursor-pointer group hover:bg-slate-900/60"
                  >
                    <div className="flex justify-between items-start mb-4">
                       <div>
                         <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{m.name}</h3>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID {m.id} • {m.type}</p>
                       </div>
                       <div className="p-2 bg-slate-950 rounded-lg group-hover:bg-blue-600 transition-colors"><UserIcon size={14} className="text-slate-500 group-hover:text-white" /></div>
                    </div>
                    <div className="mt-6 flex justify-between pt-4 border-t border-slate-800">
                      <div><p className="text-[10px] text-slate-500 uppercase font-bold">Logs</p><p className="font-black text-lg">{m.attended}</p></div>
                      <div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-bold">Avg Min</p><p className="font-black text-lg text-blue-500">{(m.totalStay / (m.attended || 1)).toFixed(0)}m</p></div>
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
                      <div><p className="text-[10px] text-slate-500 font-bold uppercase">Classes</p><p className="text-lg font-black">{t.classes.size}</p></div>
                      <div><p className="text-[10px] text-slate-500 font-bold uppercase">Impact</p><p className="text-lg font-black text-emerald-500">{t.totalAttended}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeModule === 'attendance' && (
               <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                  <div className="p-8 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-tighter text-lg">Hub Ingestion stream</h3>
                    <span className="text-[10px] text-slate-500 font-black uppercase">{filteredRecords.length} records active</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="py-4 px-8 font-black text-slate-500 uppercase text-[10px] tracking-widest">Date</th>
                          <th className="py-4 px-8 font-black text-slate-500 uppercase text-[10px] tracking-widest">Member</th>
                          <th className="py-4 px-8 font-black text-slate-500 uppercase text-[10px] tracking-widest">Class</th>
                          <th className="py-4 px-8 font-black text-slate-500 uppercase text-[10px] tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.slice(-50).reverse().map((r, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                            <td className="py-4 px-8 text-slate-400 font-medium">{r.Date}</td>
                            <td className="py-4 px-8 font-bold">{r.Member_Name}</td>
                            <td className="py-4 px-8 text-slate-400">{r.Class_Name}</td>
                            <td className="py-4 px-8">
                               <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${r.Attendance_Status === 'Yes' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                 {r.Attendance_Status === 'Yes' ? 'Present' : 'Missed'}
                               </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            )}
            
            {activeModule === 'ai-assistant' && <AIChatInterface records={records} />}
          </div>
        )}
      </main>

      {/* Detail Overlay Side Panel */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedDetail(null)}></div>
           <div className="w-full max-w-xl bg-slate-900 h-full border-l border-slate-800 shadow-2xl relative flex flex-col animate-in slide-in-from-right duration-500">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/10 rounded-2xl"><Layers size={20} className="text-blue-500" /></div>
                    <div>
                       <h3 className="font-black uppercase tracking-tighter text-lg">{selectedDetail.type === 'member' ? 'Member Profile' : 'Trainer Profile'}</h3>
                       <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Global Hub Active</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedDetail(null)} className="p-3 hover:bg-slate-800 rounded-2xl transition-all"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scroll">
                 <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-slate-800 rounded-[2.5rem] flex items-center justify-center border-4 border-slate-800 shadow-xl overflow-hidden">
                       {selectedDetail.type === 'member' ? <UserIcon size={48} className="text-blue-500" /> : <Dumbbell size={48} className="text-indigo-500" />}
                    </div>
                    <div className="flex-1">
                       <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedDetail.data.name}</h2>
                       <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] font-black uppercase tracking-widest text-slate-400">ID: {selectedDetail.data.id || 'N/A'}</span>
                          {selectedDetail.type === 'member' && <span className="px-2 py-0.5 bg-blue-500/10 rounded text-[9px] font-black uppercase tracking-widest text-blue-500">{selectedDetail.data.type}</span>}
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-[2rem]">
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{selectedDetail.type === 'member' ? 'Total Visits' : 'Impact Logs'}</p>
                       <p className="text-2xl font-black">{selectedDetail.type === 'member' ? selectedDetail.data.attended : selectedDetail.data.totalAttended}</p>
                    </div>
                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-[2rem]">
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{selectedDetail.type === 'member' ? 'Avg Intensity' : 'Specialties'}</p>
                       <p className="text-2xl font-black text-blue-500">{selectedDetail.type === 'member' ? `${(selectedDetail.data.totalStay / (selectedDetail.data.attended || 1)).toFixed(0)}m` : selectedDetail.data.classes.size}</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="font-black uppercase tracking-widest text-xs text-slate-500 flex items-center gap-2"><History size={14} /> Historical Intelligence</h4>
                    </div>
                    <div className="space-y-3">
                       {selectedDetail.data.sessions.slice(-15).reverse().map((s: any, idx: number) => (
                          <div key={idx} className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between group/row hover:border-slate-700 transition-all">
                             <div>
                                <p className="font-bold text-slate-200 text-sm">{s.Class_Name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{s.Date} • {selectedDetail.type === 'member' ? `Coach: ${s.Trainer_Name}` : `Client: ${s.Member_Name}`}</p>
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
                 <button className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2">
                    <Zap size={14} /> Pulse Sync
                 </button>
              </div>
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
