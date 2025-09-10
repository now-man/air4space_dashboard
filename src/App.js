import React, { useState, useEffect, useMemo, useRef } from 'react';
// MODIFIED: 빠져있던 ReferenceArea를 import 목록에 추가했습니다.
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { DayPicker } from 'react-day-picker';
import { ko } from 'date-fns/locale';
import { Zap, Settings, ShieldAlert, BotMessageSquare, Plus, Trash2, Save, ArrowLeft, UploadCloud, TestTube2, BrainCircuit, Eraser, Lightbulb, RefreshCw, PlayCircle, MapPin, Edit3, Compass, Activity, Calendar as CalendarIcon, MoreVertical, X, Edit, Home, BarChart3, Target } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'react-day-picker/dist/style.css';

// --- Helper Functions ---
const getErrorColor = (error, threshold = 10.0) => { if (error > threshold) return '#f87171'; if (error > threshold * 0.7) return '#facc15'; return '#4ade80'; };
const getSuccessScoreInfo = (score) => { if (score >= 8) return { label: "성공", color: "text-green-400", dotClass: "bg-green-500" }; if (score >= 4) return { label: "보통", color: "text-yellow-400", dotClass: "bg-yellow-500" }; return { label: "실패", color: "text-red-400", dotClass: "bg-red-500" }; };
const formatDate = (dateString, format = 'full') => { if (!dateString) return 'N/A'; const date = new Date(dateString); const options = { full: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }, time: { hour: '2-digit', minute: '2-digit', hour12: false }, date: { year: 'numeric', month: 'long', day: 'numeric' }}; return date.toLocaleString('ko-KR', options[format]); };
const toLocalISOString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
const getPointOnBezierCurve = (t, p0, p1, p2) => { const [x0, y0] = p0; const [x1, y1] = p1; const [x2, y2] = p2; const u = 1 - t; const tt = t * t; const uu = u * u; const x = uu * x0 + 2 * u * t * x1 + tt * x2; const y = uu * y0 + 2 * u * t * y1 + tt * y2; return [x, y]; };
const formatDateKey = (d) => { if(!d) return null; d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n').filter(line => line);
    const headers = ["time", "gnss_error", "tec"];
    return lines.map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {});
    });
};

// --- Main App Component ---
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [UNIT_DATA] = useState({ "제17전투비행단": { lat: 36.722701, lon: 127.499102 }, "제11전투비행단": { lat: 35.899526, lon: 128.639791 }, "제15특수임무비행단": { lat: 37.434879, lon: 127.105050 }});

  const initialProfile = {
    unitName: "제17전투비행단", unitThresholdMode: 'manual', unitManualThreshold: 10.0,
    location: { method: 'unit', coords: UNIT_DATA["제17전투비행단"] }, timezone: 'KST',
    equipment: [ { id: 1, name: "JDAM", thresholdMode: 'manual', manualThreshold: 10.0, autoThreshold: null, usesGeoData: true }, { id: 2, name: "정찰 드론 (A형)", thresholdMode: 'manual', manualThreshold: 15.0, autoThreshold: null, usesGeoData: true }, { id: 3, name: "전술 데이터링크", thresholdMode: 'manual', manualThreshold: 8.0, autoThreshold: null, usesGeoData: false }, { id: 4, name: "KF-21 비행체", thresholdMode: 'manual', manualThreshold: 9.0, autoThreshold: null, usesGeoData: true } ],
  };
  const [unitProfile, setUnitProfile] = useState(() => { try { const saved = localStorage.getItem('unitProfile'); if (saved) { const parsed = JSON.parse(saved); return { ...initialProfile, ...parsed, location: { ...initialProfile.location, ...(parsed.location || {}) }, equipment: parsed.equipment || initialProfile.equipment }; } return initialProfile; } catch (e) { return initialProfile; }});
  const [missionLogs, setMissionLogs] = useState(() => { try { const s = localStorage.getItem('missionLogs'); return s ? JSON.parse(s) : []; } catch (e) { return []; }});
  const [todoList, setTodoList] = useState(() => { try { const s = localStorage.getItem('todoList'); const todayKey = formatDateKey(new Date()); return s ? JSON.parse(s)[todayKey] || [] : []; } catch (e) { return []; }});
  
  const [allForecastData, setAllForecastData] = useState([]);
  const [forecastStatus, setForecastStatus] = useState({ isLoading: true, error: null });

  useEffect(() => {
    const FETCH_URL = "/api/csv";
    setForecastStatus({ isLoading: true, error: null });
    fetch(FETCH_URL)
        .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.text(); })
        .then(csvText => {
            const parsedData = parseCSV(csvText);
            if (parsedData.length === 0) throw new Error('CSV data is empty or invalid.');
            
            const formattedData = parsedData.map(d => ({
                timestamp: new Date(d.time).getTime(),
                timeLabel: new Date(d.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
                predicted_error: parseFloat(d.gnss_error) || 0,
                tec: parseFloat(d.tec) || 0
            })).sort((a, b) => a.timestamp - b.timestamp);

            setAllForecastData(formattedData);
            setForecastStatus({ isLoading: false, error: null });
        })
        .catch(error => {
            console.error("Failed to fetch or process forecast data:", error);
            setForecastStatus({ isLoading: false, error: `데이터 처리 중 오류: ${error.message}` });
        });
  }, []);
  
  useEffect(() => { localStorage.setItem('unitProfile', JSON.stringify(unitProfile)); }, [unitProfile]);
  useEffect(() => { localStorage.setItem('missionLogs', JSON.stringify(missionLogs)); }, [missionLogs]);
  useEffect(() => { const todayKey = formatDateKey(new Date()); localStorage.setItem('todoList', JSON.stringify({ [todayKey]: todoList })); }, [todoList]);

  const handleFeedbackSubmit = (log) => { const newLogs = [...missionLogs, { ...log, id: Date.now() }]; setMissionLogs(newLogs.sort((a,b) => new Date(b.startTime) - new Date(a.startTime))); setActiveView('dashboard'); };
  const deleteLog = (logId) => { if (window.confirm("피드백 기록을 삭제하시겠습니까?")) { setMissionLogs(missionLogs.filter(log => log.id !== logId)); }};
  const addTodo = (todo) => { setTodoList(prev => [...prev, { ...todo, id: Date.now() }].sort((a,b) => a.time.localeCompare(b.time))); };
  const updateTodo = (updatedTodo) => { setTodoList(prev => prev.map(todo => todo.id === updatedTodo.id ? updatedTodo : todo).sort((a,b) => a.time.localeCompare(b.time))); };
  const deleteTodo = (todoId) => { setTodoList(prev => prev.filter(todo => todo.id !== todoId)); };

  const renderView = () => {
    switch (activeView) {
      case 'settings': return <SettingsView profile={unitProfile} setProfile={setUnitProfile} logs={missionLogs} UNIT_DATA={UNIT_DATA} goBack={() => setActiveView('dashboard')} />;
      case 'feedback': return <FeedbackView equipmentList={unitProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      case 'dev': return <DeveloperTestView setLogs={setMissionLogs} profile={unitProfile} initialProfile={initialProfile} goBack={() => setActiveView('dashboard')} />;
      case 'analysis': return <AnalysisView logs={missionLogs} profile={unitProfile} goBack={() => setActiveView('dashboard')} />;
      default: return <DashboardView profile={unitProfile} allForecastData={allForecastData} forecastStatus={forecastStatus} logs={missionLogs} deleteLog={deleteLog} todoList={todoList} addTodo={addTodo} updateTodo={updateTodo} deleteTodo={deleteTodo} />;
    }
  };
  
  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <Header setActiveView={setActiveView} activeView={activeView} />
      <div className="p-4 md:p-6 lg:p-8"><main>{renderView()}</main></div>
    </div>
  );
}

// --- Header Component ---
const Header = ({setActiveView, activeView}) => {
    return (<header className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3"><ShieldAlert className="w-8 h-8 text-cyan-400 flex-shrink-0" /><div><h1 className="text-lg md:text-xl font-bold text-white leading-tight">우주기상 작전 지원 대시보드</h1></div></div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setActiveView('dashboard')} className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${activeView === 'dashboard' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}><Home size={16}/> 홈</button>
            <button onClick={() => setActiveView('analysis')} className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${activeView === 'analysis' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}><BarChart3 size={16}/> 피드백 및 분석</button>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setActiveView('feedback')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2 rounded-lg flex items-center transition-colors" title="피드백 입력"><Plus className="w-5 h-5" /></button>
            <button onClick={() => setActiveView('settings')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold p-2 rounded-lg flex items-center transition-colors" title="설정"><Settings className="w-5 h-5" /></button>
            <button onClick={() => setActiveView('dev')} className={`font-semibold p-2 rounded-lg flex items-center transition-colors ${activeView === 'dev' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} title="개발자 테스트"><TestTube2 className="w-5 h-5" /></button>
        </div>
    </header>);
};

// --- Dashboard Sub-components ---
const ForecastGraph = ({ allForecastData, forecastStatus, activeUnitThreshold }) => {
    const [timeRange, setTimeRange] = useState(48); // in hours
    const [visibleData, setVisibleData] = useState({ gnss: true, tec: true });

    const displayData = useMemo(() => {
        if (!allForecastData || allForecastData.length === 0) return [];
        const now = new Date().getTime();
        const rangeMs = timeRange * 60 * 60 * 1000;
        
        let closestPoint = allForecastData.reduce((prev, curr) => 
            Math.abs(curr.timestamp - now) < Math.abs(prev.timestamp - now) ? curr : prev
        );
        const centerTime = closestPoint.timestamp;

        const startTime = centerTime - (rangeMs / 2);
        const endTime = centerTime + (rangeMs / 2);

        return allForecastData.filter(d => d.timestamp >= startTime && d.timestamp <= endTime);
    }, [allForecastData, timeRange]);
    
    const nowTimestamp = new Date().getTime();

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-white">GNSS 오차 및 TEC 예측</h2>
            <div style={{width: '100%', height: 250}}>
                {forecastStatus.isLoading ? (<div className="flex items-center justify-center h-full text-gray-400">데이터 로딩 중...</div>)
                 : forecastStatus.error ? (<div className="flex items-center justify-center h-full text-red-400">{forecastStatus.error}</div>)
                 : (<ResponsiveContainer width="100%" height="100%">
                     <LineChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis dataKey="timestamp" stroke="#A0AEC0" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(unixTime) => formatDate(unixTime, 'time')} />
                        <YAxis yAxisId="left" label={{ value: 'GNSS 오차(m)', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} stroke="#F56565" />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'TEC (TECU)', angle: 90, position: 'insideRight', fill: '#A0AEC0' }} stroke="#4299E1" />
                        <Tooltip contentStyle={{ backgroundColor: '#1A202C' }} labelFormatter={(unixTime) => formatDate(unixTime)} />
                        <Legend />
                        {visibleData.gnss && <Line yAxisId="left" dataKey="predicted_error" name="GNSS 오차" stroke="#F56565" dot={false} />}
                        {visibleData.tec && <Line yAxisId="right" dataKey="tec" name="TEC" stroke="#4299E1" dot={false} />}
                        <ReferenceLine yAxisId="left" y={activeUnitThreshold} label={{ value: "부대 임계값", fill: "#4FD1C5" }} stroke="#4FD1C5" strokeDasharray="4 4" />
                        {/* MODIFIED: Conditionally render the ReferenceLine for "now" */}
                        {displayData && displayData.length > 0 && <ReferenceLine x={nowTimestamp} stroke="#fbbf24" strokeWidth={2} label={{ value: '현재', position: 'insideTop', fill: '#fbbf24' }} />}
                    </LineChart>
                  </ResponsiveContainer>)}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-400">표시 데이터:</span>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300"><input type="checkbox" checked={visibleData.gnss} onChange={e => setVisibleData(v => ({...v, gnss: e.target.checked}))} className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-red-500 focus:ring-red-500" /> GNSS 오차</label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300"><input type="checkbox" checked={visibleData.tec} onChange={e => setVisibleData(v => ({...v, tec: e.target.checked}))} className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500" /> TEC</label>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">시간 범위:</span>
                    {[12, 24, 48].map(h => <button key={h} onClick={() => setTimeRange(h)} className={`px-3 py-1 text-xs font-semibold rounded-md ${timeRange === h ? 'bg-cyan-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>{h}시간</button>)}
                </div>
            </div>
        </div>
    );
};
const LiveMap = ({threshold, center}) => {
    const [aircrafts, setAircrafts] = useState(() => [ { type: 'curve', p0: [36.8, 127.0], p1: [36.4, 127.5], p2: [36.2, 128.0] }, { type: 'curve', p0: [37.0, 127.8], p1: [36.7, 127.2], p2: [36.5, 127.2] }, { type: 'loop', center: [36.7, 127.6], rx: 0.2, ry: 0.3 } ].map((p, i) => ({ id: i, ...p, progress: Math.random(), speed: 0.005 + Math.random() * 0.005, error: 5 + Math.random() * 5 })));
    useEffect(() => { const timer = setInterval(() => setAircrafts(prev => prev.map(ac => ({ ...ac, progress: (ac.progress + ac.speed) % 1, error: Math.max(3.0, ac.error + (Math.random() - 0.5) * 2) }))), 2000); return () => clearInterval(timer); }, [center]);
    return (<div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700 h-96"><h2 className="text-lg font-semibold mb-4 text-white">실시간 항적</h2><MapContainer key={center.lat+center.lon} center={[center.lat, center.lon]} zoom={9} style={{ height: "calc(100% - 40px)", width: "100%", borderRadius: "0.75rem", backgroundColor: "#333" }}> <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' /> {aircrafts.map(ac => { let pos; if(ac.type === 'loop') { pos = [ac.center[0] + ac.rx * Math.cos(2*Math.PI*ac.progress), ac.center[1] + ac.ry * Math.sin(2*Math.PI*ac.progress)]; } else { pos = getPointOnBezierCurve(ac.progress, ac.p0, ac.p1, ac.p2); } return (<CircleMarker key={ac.id} center={pos} radius={6} pathOptions={{ color: getErrorColor(ac.error, threshold), fillColor: getErrorColor(ac.error, threshold), fillOpacity: 0.8 }}><LeafletTooltip>✈️ ID: {ac.id}<br />GNSS 오차: {ac.error.toFixed(2)}m</LeafletTooltip></CircleMarker>); })} </MapContainer> </div>);
};
const AutoFitBounds = ({ bounds }) => { const map = useMap(); useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [20, 20] }); }, [bounds, map]); return null; };
const FeedbackChart = ({ data, equipment }) => { const activeThreshold = equipment.thresholdMode === 'auto' && equipment.autoThreshold ? equipment.autoThreshold : equipment.manualThreshold; const segments = useMemo(() => { const segs = []; let cur = null; data.forEach(d => { if (d.error_rate > activeThreshold) { if (!cur) cur = { x1: d.date, x2: d.date }; else cur.x2 = d.date; } else { if (cur) { segs.push(cur); cur = null; } } }); if (cur) segs.push(cur); return segs; }, [data, activeThreshold]); return (<div className="mt-4 h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="date" stroke="#A0AEC0" tick={{ fontSize: 10 }} tickFormatter={(tick) => formatDate(tick, 'time')} /> <YAxis stroke="#A0AEC0" tick={{ fontSize: 10 }} domain={[0, 'dataMax + 2']} tickFormatter={(tick) => tick.toFixed(1)} /> <Tooltip contentStyle={{ backgroundColor: '#1A202C' }} labelFormatter={(label) => formatDate(label)} /> <Line type="monotone" dataKey="error_rate" name="GNSS 오차(m)" stroke="#F56565" strokeWidth={2} dot={false} /> {segments.map((seg, i) => <ReferenceArea key={i} x1={seg.x1} x2={seg.x2} stroke="none" fill="#f56565" fillOpacity={0.3} />)} <ReferenceLine y={activeThreshold} label={{ value: "임계값", position: 'insideTopLeft', fill: '#4FD1C5', fontSize: 10 }} stroke="#4FD1C5" strokeDasharray="3 3" /> </LineChart></ResponsiveContainer></div>); };
const FeedbackMap = ({ data, equipment, isAnimating, animationProgress }) => { const activeThreshold = equipment.thresholdMode === 'auto' && equipment.autoThreshold ? equipment.autoThreshold : equipment.manualThreshold; const bounds = useMemo(() => data.length > 0 ? L.latLngBounds(data.map(p => [p.lat, p.lon])) : null, [data]); const animatedPosition = useMemo(() => { if(!isAnimating || data.length < 2) return null; const totalPoints = data.length - 1; const currentIndex = Math.min(Math.floor(animationProgress * totalPoints), totalPoints - 1); const nextIndex = Math.min(currentIndex + 1, totalPoints); const segmentProgress = (animationProgress * totalPoints) - currentIndex; const p1 = data[currentIndex]; const p2 = data[nextIndex]; return { lat: p1.lat + (p2.lat - p1.lat) * segmentProgress, lon: p1.lon + (p2.lon - p1.lon) * segmentProgress, error: p1.error_rate }; }, [isAnimating, animationProgress, data]); return (<div className="mt-2 h-56 rounded-lg overflow-hidden relative"><MapContainer center={data[0] ? [data[0].lat, data[0].lon] : [36.6, 127.4]} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}> <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' /> {isAnimating ? (<Polyline positions={data.map(p => [p.lat, p.lon])} color="#6b7280" weight={3} dashArray="5, 10" />) : (data.slice(1).map((p, i) => (<Polyline key={i} positions={[[data[i].lat, data[i].lon], [p.lat, p.lon]]} color={getErrorColor(data[i].error_rate, activeThreshold)} weight={5} />)))} {animatedPosition && <CircleMarker center={animatedPosition} radius={7} pathOptions={{ color: '#fff', fillColor: getErrorColor(animatedPosition.error, activeThreshold), weight: 2, fillOpacity: 1 }} />} <AutoFitBounds bounds={bounds} /> </MapContainer></div>); };
const XaiModal = ({ equipment, logs, onClose }) => { const analysis = useMemo(() => { const relLogs = logs.filter(log => log.equipment === equipment.name); if (relLogs.length === 0) return { total: 0 }; const failed = relLogs.filter(l => l.successScore < 4).length; const mediocre = relLogs.filter(l => l.successScore >= 4 && l.successScore < 8).length; const errRates = relLogs.filter(l => l.successScore < 8 && l.gnssErrorData).flatMap(l => l.gnssErrorData.map(d => d.error_rate)); const avgErr = errRates.length > 0 ? errRates.reduce((a, b) => a + b, 0) / errRates.length : null; return { total: relLogs.length, failed, mediocre, avgErrorOnFailure: avgErr }; }, [logs, equipment]); return (<div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}><div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-full max-w-lg max-h-full overflow-y-auto" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-white">{equipment.name} 분석</h2><button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button></div><div className="space-y-4"><div><h3 className="font-semibold text-cyan-400">작전 요약</h3><p>총 {analysis.total}회 피드백 중 <span className="text-red-400 font-bold">{analysis.failed}회 실패</span>, <span className="text-yellow-400 font-bold">{analysis.mediocre}회 보통</span>으로 평가되었습니다.</p></div><div><h3 className="font-semibold text-cyan-400">자동 임계값 (XAI)</h3>{equipment.autoThreshold ? (<><p className="mb-2">자동 설정된 임계값은 <strong className="text-white">{equipment.autoThreshold}m</strong> 입니다.</p><p className="text-sm text-gray-400"><Lightbulb className="inline w-4 h-4 mr-1 text-yellow-300" />이 값은 작전 성공도가 '보통' 이하({analysis.failed + analysis.mediocre}회)였던 임무들의 GNSS 오차 데이터를 분석하여 설정되었습니다. 해당 임무들에서 평균적으로 <strong className="text-white">{analysis.avgErrorOnFailure?.toFixed(2) ?? 'N/A'}m</strong> 이상의 오차가 관측되었습니다.</p></>) : (<p className="text-sm text-gray-400">자동 임계값을 계산하기에 데이터가 부족합니다 (최소 3회 이상의 '보통' 이하 피드백 필요).</p>)}</div></div></div></div>); };
const MissionAdvisory = ({ status, maxError, threshold }) => (<div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700"><h2 className="text-lg font-semibold mb-4 text-white flex items-center"><Lightbulb size={20} className="mr-2 text-yellow-300" />금일 임무 권고 (XAI)</h2><div className="flex items-start gap-3"><Zap size={24} className={`mt-1 ${status.color}`} /><p className="text-sm text-gray-300"><strong>분석:</strong> 24시간 내 최대 GNSS 오차는 <strong>{maxError.toFixed(2)}m</strong>로 예측됩니다. 이는 부대 임계값 {threshold.toFixed(2)}m 대비 <strong>{status.label}</strong> 수준입니다.<br /><strong>권고:</strong> {status.label === "위험" ? "정밀 타격 및 GNSS 의존도가 높은 임무 수행 시 각별한 주의가 필요합니다." : status.label === "주의" ? "GNSS 민감 장비 운용 시 주의가 필요하며, 대체 항법 수단을 숙지하십시오." : "모든 임무 정상 수행 가능합니다."}</p></div></div>);
const TodoList = ({ todoList, addTodo, updateTodo, deleteTodo }) => {
    const [editingTodo, setEditingTodo] = useState(null);
    const [menuTodo, setMenuTodo] = useState(null);
    const handleAdd = () => { const time = document.getElementById('todoTime').value; const text = document.getElementById('todoText').value; if(text) { addTodo({time, text, tag: 'Briefing'}); document.getElementById('todoText').value = ''; } };
    const handleSave = (id) => { const time = document.getElementById(`edit-time-${id}`).value; const text = document.getElementById(`edit-text-${id}`).value; updateTodo({ ...editingTodo, time, text }); setEditingTodo(null); };
    const handleEditClick = () => { setEditingTodo(menuTodo); setMenuTodo(null); };
    const handleDeleteClick = () => { deleteTodo(menuTodo.id); setMenuTodo(null); };
    return (<> {menuTodo && (<div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={() => setMenuTodo(null)}><div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-xs space-y-4" onClick={e => e.stopPropagation()}><p className="text-lg font-semibold text-white text-center">"{menuTodo.text}"</p><div className="flex flex-col space-y-3"><button onClick={handleEditClick} className="w-full text-left px-4 py-2.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-3 transition-colors"><Edit size={16}/> 수정하기</button><button onClick={handleDeleteClick} className="w-full text-left px-4 py-2.5 text-sm text-red-400 bg-red-900/50 hover:bg-red-900/80 rounded-md flex items-center gap-3 transition-colors"><Trash2 size={16}/> 삭제하기</button></div></div></div>)} <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700"><h2 className="text-lg font-semibold mb-4 text-white flex items-center"><Activity size={20} className="mr-2" />금일 주요 활동</h2><div className="space-y-2 max-h-56 overflow-y-auto pr-2">{todoList.map(item => (<div key={item.id} className="flex items-center gap-3 text-sm group"> {editingTodo?.id === item.id ? (<><input type="time" id={`edit-time-${item.id}`} defaultValue={item.time} className="bg-gray-900 border border-gray-600 rounded p-1 text-sm w-auto" /><input type="text" id={`edit-text-${item.id}`} defaultValue={item.text} className="bg-gray-900 border border-gray-600 rounded p-1 text-sm flex-grow" /><button onClick={() => handleSave(item.id)} className="p-1 text-green-400 hover:text-green-300"><Save size={16}/></button><button onClick={() => setEditingTodo(null)} className="p-1 text-gray-400 hover:text-white"><X size={16}/></button></>) : (<><span className="font-semibold text-cyan-400">{item.time}</span><span className="flex-grow">{item.text}</span><span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{item.tag}</span><button onClick={() => setMenuTodo(item)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"><MoreVertical size={16}/></button></>)}</div>))}</div><div className="flex gap-2 mt-2"><input type="time" defaultValue="12:00" className="bg-gray-900 border border-gray-600 rounded p-1 text-sm w-auto" id="todoTime" /><input type="text" placeholder="활동 내용" className="bg-gray-900 border border-gray-600 rounded p-1 text-sm flex-grow" id="todoText" /><button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 rounded p-2"><Plus size={16} /></button></div></div></>); 
};

// --- Dashboard View ---
const DashboardView = ({ profile, allForecastData, forecastStatus, logs, deleteLog, todoList, addTodo, updateTodo, deleteTodo }) => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [animatingLogId, setAnimatingLogId] = useState(null); const [animationProgress, setAnimationProgress] = useState(0); const animationRef = useRef();
    const [xaiModalEquipment, setXaiModalEquipment] = useState(null);
    const unitAutoThreshold = useMemo(() => profile.equipment.length > 0 ? Math.min(...profile.equipment.map(eq => eq.thresholdMode === 'auto' && eq.autoThreshold ? eq.autoThreshold : eq.manualThreshold)) : 10.0, [profile.equipment]);
    const activeUnitThreshold = profile.unitThresholdMode === 'auto' ? unitAutoThreshold : profile.unitManualThreshold;
    const maxError = useMemo(() => {
        if (!allForecastData || allForecastData.length === 0) return 0;
        const now = new Date().getTime();
        const next24h = now + 24 * 60 * 60 * 1000;
        const relevantData = allForecastData.filter(d => d.timestamp >= now && d.timestamp <= next24h);
        return relevantData.length > 0 ? Math.max(...relevantData.map(d => d.predicted_error)) : 0;
    }, [allForecastData]);
    const overallStatus = useMemo(() => { if (maxError > activeUnitThreshold) return { label: "위험", color: "text-red-400", bgColor: "bg-red-900/50" }; if (maxError > activeUnitThreshold * 0.7) return { label: "주의", color: "text-yellow-400", bgColor: "bg-yellow-900/50" }; return { label: "정상", color: "text-green-400", bgColor: "bg-green-900/50" }; }, [maxError, activeUnitThreshold]);
    const logsByDate = useMemo(() => { const grouped = {}; logs.forEach(log => { const key = formatDateKey(log.startTime); if (!grouped[key]) grouped[key] = []; grouped[key].push(log); }); return grouped; }, [logs]);
    const filteredLogs = useMemo(() => selectedDate ? logsByDate[formatDateKey(selectedDate)] || [] : logs.slice(0, 15), [selectedDate, logs, logsByDate]);
    const handlePlayAnimation = (logId, e) => { e.stopPropagation(); cancelAnimationFrame(animationRef.current); if(animatingLogId === logId) { setAnimatingLogId(null); return; } setAnimatingLogId(logId); let startTime; const duration = 5000; const animate = (timestamp) => { if (!startTime) startTime = timestamp; const progress = Math.min((timestamp - startTime) / duration, 1); setAnimationProgress(progress); if (progress < 1) { animationRef.current = requestAnimationFrame(animate); } else { setAnimatingLogId(null); } }; animationRef.current = requestAnimationFrame(animate); };
    const DayContentWithDots = (props) => {
        const key = formatDateKey(props.date);
        const dayLogs = logsByDate[key];
        let dots = [];
        if (dayLogs) { const worstScores = dayLogs.map(l => l.successScore).sort((a, b) => a - b).slice(0, 3); dots = worstScores.map(score => getSuccessScoreInfo(score).dotClass); }
        return (<div className="relative w-full h-full flex justify-center items-center"><span className="z-10">{props.date.getDate()}</span><div className="absolute bottom-1 flex space-x-0.5">{dots.map((dotClass, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></div>))}</div></div>);
    };

    return (<>
        <style>{`.rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #0ea5e9 !important; color: white !important; } .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #374151 !important; } .rdp-day_today:not(.rdp-day_selected) { border: 1px solid #0ea5e9; color: #0ea5e9 !important; } .rdp { color: #d1d5db; --rdp-cell-size: 48px; } .rdp-nav_button { color: #0ea5e9 !important; }`}</style>
        {xaiModalEquipment && <XaiModal equipment={xaiModalEquipment} logs={logs} onClose={() => setXaiModalEquipment(null)} />}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className={`p-4 md:p-6 rounded-xl flex items-center gap-4 ${overallStatus.bgColor} border border-gray-700`}>
                    <div className="flex items-center gap-4"><div><p className="text-gray-400 text-sm">향후 24시간 종합 위험도</p><p className={`text-3xl font-bold ${overallStatus.color}`}>{overallStatus.label}</p></div></div>
                    <div className="w-full flex justify-around pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-600"><div><p className="text-gray-400 text-sm">최대 예상 오차</p><p className="text-3xl font-bold text-white">{maxError.toFixed(2)} m</p></div><div><p className="text-gray-400 text-sm">부대 임계값</p><p className="text-3xl font-bold text-cyan-400">{activeUnitThreshold.toFixed(2)} m</p></div></div>
                </div>
                <ForecastGraph allForecastData={allForecastData} forecastStatus={forecastStatus} activeUnitThreshold={activeUnitThreshold} />
                <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold text-white flex items-center"><CalendarIcon size={20} className="inline-block mr-2" />작전 캘린더 & 피드백 로그</h2>{selectedDate && <button onClick={() => setSelectedDate(null)} className="text-sm bg-cyan-600 hover:bg-cyan-700 px-3 py-1 rounded-md">전체 로그 보기</button>}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex justify-center"><DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ko} components={{ DayContent: DayContentWithDots }} /></div>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2"><h3 className="font-semibold text-gray-300">{selectedDate ? formatDate(selectedDate, 'date') : '최근'} 피드백 <span className="text-cyan-400">({filteredLogs.length}건)</span></h3>{filteredLogs.length > 0 ? filteredLogs.map(log => { const equipment = profile.equipment.find(e => e.name === log.equipment); const hasGeoData = log.gnssErrorData && log.gnssErrorData[0]?.lat !== undefined; return (<div key={log.id} className="text-sm bg-gray-900/70 rounded-lg p-3 cursor-pointer" onClick={() => setExpandedLogId(prev => prev === log.id ? null : log.id)}>
                            <div className="flex justify-between items-start"><div><p className="font-semibold text-gray-300">{log.equipment}</p><p className="text-xs text-gray-400">{formatDate(log.startTime)}</p></div><div className="flex items-center"><span className={`font-bold mr-2 ${getSuccessScoreInfo(log.successScore).color}`}>{log.successScore}점({getSuccessScoreInfo(log.successScore).label})</span><button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="ml-1 text-red-400 hover:text-red-300 p-1"><Trash2 size={16} /></button></div></div>
                            {expandedLogId === log.id && (<> {log.gnssErrorData && <FeedbackChart data={log.gnssErrorData} equipment={equipment} />} {hasGeoData && (<div className="relative"><FeedbackMap data={log.gnssErrorData} equipment={equipment} isAnimating={animatingLogId === log.id} animationProgress={animationProgress} /><button onClick={(e) => handlePlayAnimation(log.id, e)} className="absolute top-2 right-2 z-[1000] bg-sky-500 text-white p-2 rounded-full hover:bg-sky-400 shadow-lg transition-transform hover:scale-110"><PlayCircle size={20} className={animatingLogId === log.id ? 'animate-pulse' : ''} /></button></div>)} </>)}
                        </div>);}) : <p className="text-gray-500 text-sm mt-4">{selectedDate ? '선택된 날짜에 기록된 피드백이 없습니다.' : '피드백 기록이 없습니다.'}</p>}</div>
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <MissionAdvisory status={overallStatus} maxError={maxError} threshold={activeUnitThreshold} />
                <TodoList todoList={todoList} addTodo={addTodo} updateTodo={updateTodo} deleteTodo={deleteTodo} />
                <LiveMap threshold={activeUnitThreshold} center={profile.location.coords} />
            </div>
        </div>
    </>);
};

// --- (NEW) Analysis View and its sub-components ---
const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-gray-800 p-4 rounded-xl flex items-center gap-4 border border-gray-700">
        <div className={`p-3 rounded-lg bg-${color}-500/20 text-${color}-400`}>{icon}</div>
        <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);
const AnalysisView = ({ logs, profile }) => {
    const analysisData = useMemo(() => {
        if (logs.length === 0) return null;
        const totalLogs = logs.length;
        const avgScore = logs.reduce((acc, log) => acc + log.successScore, 0) / totalLogs;
        const equipmentData = profile.equipment.map(eq => {
            const eqLogs = logs.filter(l => l.equipment === eq.name);
            if (eqLogs.length === 0) return { name: eq.name, success: 0, normal: 0, fail: 0, avgScore: 0, count: 0 };
            const success = eqLogs.filter(l => l.successScore >= 8).length;
            const normal = eqLogs.filter(l => l.successScore >= 4 && l.successScore < 8).length;
            const fail = eqLogs.filter(l => l.successScore < 4).length;
            const avg = eqLogs.reduce((acc, l) => acc + l.successScore, 0) / eqLogs.length;
            return { name: eq.name, success, normal, fail, avgScore: parseFloat(avg.toFixed(1)), count: eqLogs.length };
        }).sort((a,b) => b.avgScore - a.avgScore);
        
        const highErrorLogs = logs.filter(l => l.gnssErrorData && l.gnssErrorData[0]?.lat && Math.max(...l.gnssErrorData.map(d=>d.error_rate)) > profile.unitManualThreshold);

        return { totalLogs, avgScore: avgScore.toFixed(1), equipmentData, highErrorLogs };
    }, [logs, profile]);

    if (!analysisData) {
        return <div className="text-center text-gray-400">분석할 피드백 데이터가 없습니다.</div>;
    }

    const { totalLogs, avgScore, equipmentData, highErrorLogs } = analysisData;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">피드백 종합 분석</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="총 피드백 수" value={`${totalLogs} 건`} icon={<BarChart3 size={24}/>} color="cyan" />
                <StatCard title="평균 작전 성공 점수" value={`${avgScore} 점`} icon={<Target size={24}/>} color="green" />
                <StatCard title="오차 다발 작전 수" value={`${highErrorLogs.length} 건`} icon={<ShieldAlert size={24}/>} color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">장비별 작전 성공률</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={equipmentData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis type="number" stroke="#A0AEC0" />
                            <YAxis type="category" dataKey="name" stroke="#A0AEC0" width={100} tick={{fontSize: 12}} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A202C' }} />
                            <Legend />
                            <Bar dataKey="success" stackId="a" fill="#4ade80" name="성공" />
                            <Bar dataKey="normal" stackId="a" fill="#facc15" name="보통" />
                            <Bar dataKey="fail" stackId="a" fill="#f87171" name="실패" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                     <h2 className="text-lg font-semibold text-white mb-4">GNSS 오차 다발 지역</h2>
                     <MapContainer center={[profile.location.coords.lat, profile.location.coords.lon]} zoom={8} style={{ height: "300px", width: "100%", borderRadius: "0.75rem" }}>
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                        {highErrorLogs.map(log => {
                            const pos = log.gnssErrorData[0];
                            const maxError = Math.max(...log.gnssErrorData.map(d => d.error_rate));
                            return <CircleMarker key={log.id} center={[pos.lat, pos.lon]} radius={6} pathOptions={{ color: '#f87171', fillColor: '#f87171', fillOpacity: 0.7 }}>
                                <LeafletTooltip>장비: {log.equipment}<br/>최대 오차: {maxError.toFixed(1)}m</LeafletTooltip>
                            </CircleMarker>
                        })}
                     </MapContainer>
                </div>
            </div>
        </div>
    );
};


// --- Other Components ---
const FeedbackView = ({ equipmentList, onSubmit, goBack }) => {
    const [log, setLog] = useState({ startTime: toLocalISOString(new Date(new Date().getTime() - 60*60*1000)), endTime: toLocalISOString(new Date()), equipment: equipmentList.length > 0 ? equipmentList[0].name : '', successScore: 10, gnssErrorData: null });
    const [fileName, setFileName] = useState("");
    const handleFileChange = (e) => { const file = e.target.files[0]; if (!file) { setLog({ ...log, gnssErrorData: null }); setFileName(""); return; } setFileName(file.name); const reader = new FileReader(); reader.onload = (event) => { try { const text = event.target.result; const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== ''); if (lines.length < 2) throw new Error("CSV에 데이터가 없습니다."); const header = lines[0].trim().split(',').map(h => h.trim()); const hasGeo = header.includes('lat') && header.includes('lon'); if (header[0] !== 'date' || header[1] !== 'error_rate') throw new Error("헤더는 'date,error_rate'로 시작해야 합니다."); const data = lines.slice(1).map((line, i) => { const vals = line.split(','); if ((hasGeo && vals.length !== 4) || (!hasGeo && vals.length !== 2)) throw new Error(`${i+2}번째 줄 형식이 잘못되었습니다.`); const err = parseFloat(vals[1]); if (isNaN(err)) throw new Error(`${i+2}번째 줄 error_rate가 숫자가 아닙니다.`); const entry = { date: vals[0].trim(), error_rate: err }; if (hasGeo) { entry.lat = parseFloat(vals[2]); entry.lon = parseFloat(vals[3]); if (isNaN(entry.lat) || isNaN(entry.lon)) throw new Error(`${i+2}번째 줄 lat/lon이 숫자가 아닙니다.`); } return entry; }); setLog(prev => ({ ...prev, gnssErrorData: data })); } catch (error) { alert(`CSV 파싱 오류: ${error.message}`); setLog(prev => ({...prev, gnssErrorData: null})); setFileName(""); e.target.value = null; } }; reader.readAsText(file); };
    const handleSubmit = (e) => { e.preventDefault(); if (!log.equipment) { alert("장비를 선택해주세요."); return; } if (!log.startTime || !log.endTime) { alert("시작/종료 시간을 입력해주세요."); return; } onSubmit(log); };
    return (<div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto"><div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">작전 피드백 입력</h2></div><form onSubmit={handleSubmit} className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-400 mb-2">작전 시작 시간</label><input type="datetime-local" value={log.startTime} onChange={e => setLog({ ...log, startTime: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div><div><label className="block text-sm font-medium text-gray-400 mb-2">작전 종료 시간</label><input type="datetime-local" value={log.endTime} onChange={e => setLog({ ...log, endTime: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div></div><div><label className="block text-sm font-medium text-gray-400 mb-2">운용 장비</label><select value={log.equipment} onChange={e => setLog({ ...log, equipment: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white"><option value="" disabled>장비를 선택하세요</option>{equipmentList.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-400 mb-2">GNSS 기반 작전 성공도</label><div className="flex items-center gap-4 bg-gray-900 p-3 rounded-lg"><input type="range" min="1" max="10" value={log.successScore} onChange={e => setLog({ ...log, successScore: parseInt(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg" /><span className={`font-bold text-lg w-32 shrink-0 text-center ${getSuccessScoreInfo(log.successScore).color}`}>{log.successScore}점 ({getSuccessScoreInfo(log.successScore).label})</span></div></div><div><label className="block text-sm font-medium text-gray-400 mb-2">GNSS 오차 데이터 (선택)</label><label htmlFor="csv-upload" className="w-full bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 cursor-pointer"><UploadCloud className="w-5 h-5" /><span>{fileName || "CSV (date,error_rate[,lat,lon])"}</span></label><input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" /></div><div className="pt-4 flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"><BotMessageSquare className="w-5 h-5" /><span>피드백 제출</span></button></div></form></div>);
};
const SettingsView = ({ profile, setProfile, logs, UNIT_DATA, goBack }) => {
  const [localProfile, setLocalProfile] = useState(JSON.parse(JSON.stringify(profile)));
  useEffect(() => { const unitAuto = localProfile.equipment.length > 0 ? Math.min(...localProfile.equipment.map(eq => eq.thresholdMode === 'auto' && eq.autoThreshold ? eq.autoThreshold : eq.manualThreshold)) : 10.0; setLocalProfile(p => ({...p, unitAutoThreshold: parseFloat(unitAuto.toFixed(2))}))}, [localProfile.equipment]);
  const handleSave = () => { setProfile(localProfile); goBack(); };
  const handleEquipmentChange = (id, field, value) => setLocalProfile({ ...localProfile, equipment: localProfile.equipment.map(eq => eq.id === id ? { ...eq, [field]: value } : eq) });
  const addEquipment = () => setLocalProfile({ ...localProfile, equipment: [...localProfile.equipment, { id: Date.now(), name: "신규 장비", thresholdMode: 'manual', manualThreshold: 10.0, autoThreshold: null, usesGeoData: false }] });
  const removeEquipment = (id) => setLocalProfile({ ...localProfile, equipment: localProfile.equipment.filter(eq => eq.id !== id) });
  const runAutoTuneForAll = () => { const tunedEquipment = localProfile.equipment.map(eq => { const relLogs = logs.filter(l => l.equipment === eq.name && l.successScore < 8 && l.gnssErrorData); if (relLogs.length < 3) return { ...eq, autoThreshold: null }; const errRates = relLogs.flatMap(l => l.gnssErrorData.map(d => d.error_rate)); const p75 = [...errRates].sort((a,b) => a-b)[Math.floor(errRates.length * 0.75)]; return { ...eq, autoThreshold: parseFloat(p75.toFixed(2)) }; }); setLocalProfile({ ...localProfile, equipment: tunedEquipment }); alert("모든 장비의 자동 임계값 재계산이 완료되었습니다."); };
  const handleLocationMethodChange = (method) => { if (method === 'unit') { const coords = UNIT_DATA[localProfile.unitName] || { lat: null, lon: null }; setLocalProfile(p => ({ ...p, location: { method, coords }})); } else { setLocalProfile(p => ({ ...p, location: { ...p.location, method }})); } };
  return (<div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-3xl mx-auto"><div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">부대 프로필 설정</h2></div><div className="space-y-6"><div><label className="block text-sm font-medium text-gray-400 mb-2">부대명</label><select className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" value={localProfile.unitName} onChange={e => setLocalProfile(p => ({...p, unitName: e.target.value}))}>{Object.keys(UNIT_DATA).map(name => <option key={name} value={name}>{name}</option>)}</select></div>
        <div className="bg-gray-700/50 p-4 rounded-lg space-y-3"><h3 className="text-lg font-semibold text-white">위치 및 시간 설정</h3><div className="form-group"><label className="block text-sm font-medium text-gray-400 mb-2">위치 설정 방식</label><div className="flex items-center space-x-2">{[{id:'unit',label:'부대 위치',icon:Compass},{id:'manual',label:'직접 입력',icon:Edit3},{id:'current',label:'현재 위치',icon:MapPin}].map(m=>(<button key={m.id} onClick={()=>handleLocationMethodChange(m.id)} className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md ${localProfile.location.method === m.id ? 'bg-blue-600 text-white':'bg-gray-600'}`}>{React.createElement(m.icon,{size:16})}<span>{m.label}</span></button>))}</div></div>{localProfile.location.method === 'manual' && (<div className="flex gap-4"><div className="w-1/2"><label className="block text-sm font-medium text-gray-400 mb-2">위도</label><input type="number" step="any" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" value={localProfile.location.coords.lat || ''} onChange={e => setLocalProfile(p => ({...p, location: {...p.location, coords: {...p.location.coords, lat: parseFloat(e.target.value) || null}} }))}/></div><div className="w-1/2"><label className="block text-sm font-medium text-gray-400 mb-2">경도</label><input type="number" step="any" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" value={localProfile.location.coords.lon || ''} onChange={e => setLocalProfile(p => ({...p, location: {...p.location, coords: {...p.location.coords, lon: parseFloat(e.target.value) || null}} }))}/></div></div>)}
        <div className="form-group"><label className="block text-sm font-medium text-gray-400 mb-2">표준 시간</label><div className="flex items-center space-x-2">{[{id:'KST',label:'KST'},{id:'UTC',label:'UTC'},{id:'BOTH',label:'KST/UTC'}].map(t=>(<button key={t.id} onClick={()=>setLocalProfile(p=>({...p,timezone:t.id}))} className={`px-3 py-2 text-sm rounded-md ${localProfile.timezone===t.id ? 'bg-blue-600 text-white':'bg-gray-600'}`}>{t.label}</button>))}</div></div></div>
        <div className="bg-gray-700/50 p-4 rounded-lg"><h3 className="text-lg font-semibold text-white mb-3">부대 종합 임계값</h3><div className="flex items-center justify-between"><div className="flex items-center space-x-2 cursor-pointer"><span className={`px-2 py-1 text-xs rounded-md ${localProfile.unitThresholdMode === 'manual' ? 'bg-blue-600':'bg-gray-600'}`} onClick={() => setLocalProfile({...localProfile, unitThresholdMode: 'manual'})}>수동</span><span className={`px-2 py-1 text-xs rounded-md ${localProfile.unitThresholdMode === 'auto' ? 'bg-blue-600':'bg-gray-600'}`} onClick={() => setLocalProfile({...localProfile, unitThresholdMode: 'auto'})}>자동</span></div></div>{localProfile.unitThresholdMode === 'manual' ? (<div className="flex items-center space-x-2 mt-2"><label className="text-sm">수동 설정:</label><input type="range" min="1" max="30" step="0.5" value={localProfile.unitManualThreshold} onChange={e => setLocalProfile({...localProfile, unitManualThreshold: parseFloat(e.target.value)})} className="w-full" /><span className="text-cyan-400 font-mono w-16 text-center">{localProfile.unitManualThreshold.toFixed(1)}m</span></div>) : (<div className="text-center bg-gray-800 p-2 rounded-md mt-2"><span className="text-gray-400">자동 계산된 임계값 (장비 최소값): </span><span className="font-bold text-white">{localProfile.unitAutoThreshold ? `${localProfile.unitAutoThreshold.toFixed(2)}m` : 'N/A'}</span></div>)}</div>
        <div><h3 className="text-lg font-semibold text-white mb-3">주요 장비 설정</h3><div className="space-y-4">{localProfile.equipment.map(eq => (<div key={eq.id} className="bg-gray-700/50 p-4 rounded-lg space-y-4"><div className="flex justify-between items-center"><input type="text" value={eq.name} onChange={e => handleEquipmentChange(eq.id, 'name', e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="장비명" /><button onClick={() => removeEquipment(eq.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 className="w-5 h-5" /></button></div><div className="flex items-center justify-between"><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={eq.usesGeoData} onChange={e => handleEquipmentChange(eq.id, 'usesGeoData', e.target.checked)} className="h-4 w-4 rounded bg-gray-900 border-gray-600 text-cyan-500 focus:ring-cyan-500" /><span>위치 정보 사용</span></label><div className="flex items-center space-x-2 cursor-pointer"><span className={`px-2 py-1 text-xs rounded-md ${eq.thresholdMode === 'manual' ? 'bg-blue-600':'bg-gray-600'}`} onClick={() => handleEquipmentChange(eq.id, 'thresholdMode', 'manual')}>수동</span><span className={`px-2 py-1 text-xs rounded-md ${eq.thresholdMode === 'auto' ? 'bg-blue-600':'bg-gray-600'}`} onClick={() => handleEquipmentChange(eq.id, 'thresholdMode', 'auto')}>자동</span></div></div><div>{eq.thresholdMode === 'manual' ? (<div className="flex items-center space-x-2"><input type="range" min="1" max="30" step="0.5" value={eq.manualThreshold} onChange={e => handleEquipmentChange(eq.id, 'manualThreshold', parseFloat(e.target.value))} className="w-full" /><span className="text-cyan-400 font-mono w-16 text-center">{eq.manualThreshold.toFixed(1)}m</span></div>) : (<div className="text-center bg-gray-800 p-2 rounded-md"><span className="text-gray-400">자동 임계값: </span><span className="font-bold text-white">{eq.autoThreshold ? `${eq.autoThreshold.toFixed(2)}m` : '데이터 부족'}</span></div>)}</div></div>))}</div><div className="flex space-x-4 mt-4"><button onClick={addEquipment} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Plus className="w-5 h-5" /><span>장비 추가</span></button><button onClick={runAutoTuneForAll} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><BrainCircuit size={20}/><span>자동 임계값 전체 재계산</span></button></div></div>
      </div><div className="mt-8 flex justify-end"><button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"><Save className="w-5 h-5" /><span>저장</span></button></div></div>);
};
const DeveloperTestView = ({ setLogs, profile, initialProfile, goBack }) => {
    const generateMockLogs = () => { if (!window.confirm("기존 피드백을 삭제하고, 90일간의 테스트 데이터를 대량 생성합니까?")) return; const newLogs = []; const today = new Date(); for (let i = 0; i < 90; i++) { const date = new Date(today); date.setDate(today.getDate() - i); const logCount = Math.floor(Math.random() * 4) + 5; for (let j = 0; j < logCount; j++) { const eq = profile.equipment[Math.floor(Math.random() * profile.equipment.length)]; const isBadWeather = Math.random() < 0.15; const baseError = isBadWeather ? (eq.manualThreshold * 0.7 + Math.random() * 5) : (2 + Math.random() * 3); const successScore = baseError > eq.manualThreshold * 0.9 ? Math.floor(1 + Math.random() * 5) : (baseError > eq.manualThreshold * 0.6 ? Math.floor(6 + Math.random() * 3) : Math.floor(8 + Math.random() * 3)); const startTime = new Date(date); startTime.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 60)); const endTime = new Date(startTime.getTime() + (30 + Math.floor(Math.random() * 90)) * 60000); const data = []; let curTime = new Date(startTime); const p0 = [36.5+Math.random()*0.5, 127.2+Math.random()*0.5]; const p1 = [36.5+Math.random()*0.5, 127.2+Math.random()*0.5]; const p2 = Math.random() < 0.5 ? p0 : [36.5+Math.random()*0.5, 127.2+Math.random()*0.5]; let step = 0; while (curTime <= endTime) { const err = Math.max(1.0, baseError + (Math.random() - 0.5) * 4); const entry = { date: curTime.toISOString(), error_rate: parseFloat(err.toFixed(2))}; if (eq.usesGeoData) { const progress = step / ((endTime - startTime) / 60000); const pos = getPointOnBezierCurve(progress, p0, p1, p2); entry.lat = pos[0]; entry.lon = pos[1]; } data.push(entry); curTime.setMinutes(curTime.getMinutes() + 1); step++; } newLogs.push({ id: Date.now() + i * 100 + j, startTime: startTime.toISOString(), endTime: endTime.toISOString(), equipment: eq.name, successScore, gnssErrorData: data }); } } setLogs(newLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))); alert(`${newLogs.length}개의 테스트 피드백이 생성되었습니다.`); };
    const clearLogs = () => { if (window.confirm("모든 피드백 데이터를 삭제하시겠습니까?")) { setLogs([]); alert("모든 피드백이 삭제되었습니다."); }};
    const resetAppState = () => { if (window.confirm("앱의 모든 로컬 데이터(프로필, 피드백 로그)를 삭제하고 초기 상태로 되돌리시겠습니까?")) { localStorage.clear(); alert("앱 상태가 초기화되었습니다. 페이지를 새로고침합니다."); window.location.reload(); }};
    return (<div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto"><div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">개발자 테스트 도구</h2></div><div className="space-y-6"><div><h3 className="text-lg font-semibold text-white mb-3">피드백 데이터 관리</h3><div className="flex space-x-4"><button onClick={generateMockLogs} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><TestTube2 size={20} /><span>테스트 데이터 생성</span></button><button onClick={clearLogs} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Eraser size={20} /><span>모든 데이터 삭제</span></button></div></div><div><h3 className="text-lg font-semibold text-white mb-3 text-red-400">위험 영역</h3><div className="flex space-x-4"><button onClick={resetAppState} className="w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><RefreshCw size={20} /><span>앱 상태 전체 초기화</span></button></div></div></div></div>);
};

