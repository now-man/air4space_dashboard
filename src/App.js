import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, BarChart, Bar, ScatterChart, Scatter, Cell, Label } from 'recharts';
import { DayPicker } from 'react-day-picker';
import { ko } from 'date-fns/locale';
import { Zap, Settings, ShieldAlert, BotMessageSquare, Plus, Trash2, Save, ArrowLeft, UploadCloud, TestTube2, BrainCircuit, Eraser, Lightbulb, RefreshCw, PlayCircle, MapPin, Edit3, Compass, Activity, Calendar as CalendarIcon, MoreVertical, X, Edit, Home, BarChart3, Target, PlusCircle, Pencil, Square, Circle, Triangle, Star, Diamond, Hexagon, Aperture, Search, ChevronDown, Sun, Wind, Cloud, Thermometer } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'react-day-picker/dist/style.css';

// --- Helper Functions ---
const formatNumber = (num, places = 2) => num !== null && num !== undefined ? num.toFixed(places) : 'N/A';
const getErrorColor = (error, threshold = 10.0) => { if (error > threshold) return '#f87171'; if (error > threshold * 0.7) return '#facc15'; return '#4ade80'; };
const getSuccessScoreInfo = (score) => { if (score >= 8) return { label: "성공", color: "text-green-400", dotClass: "bg-green-500" }; if (score >= 4 && score < 8) return { label: "보통", color: "text-yellow-400", dotClass: "bg-yellow-500" }; return { label: "실패", color: "text-red-400", dotClass: "bg-red-500" }; };
const formatDate = (dateString, format = 'full') => { if (!dateString) return 'N/A'; const date = new Date(dateString); const options = { full: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }, time: { hour: '2-digit', minute: '2-digit', hour12: false }, date: { year: 'numeric', month: '2-digit', day: '2-digit' }}; return new Intl.DateTimeFormat('ko-KR', options[format]).format(date); };
const toLocalISOString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
const getPointOnBezierCurve = (t, p0, p1, p2) => { const [x0, y0] = p0; const [x1, y1] = p1; const [x2, y2] = p2; const u = 1 - t; const tt = t * t; const uu = u * u; const x = uu * x0 + 2 * u * t * x1 + tt * x2; const y = uu * y0 + 2 * u * t * y1 + tt * y2; return [x, y]; };
const formatDateKey = (d) => { if(!d) return null; d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const parseStyledText = (text) => {
    const keywordStyles = { "위험": "text-red-400 font-bold", "주의": "text-yellow-400 font-bold", "안정": "text-green-400 font-bold" };
    const parts = text.split(/(\*\*.*?\*\*|\b위험\b|\b주의\b|\b안정\b)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (keywordStyles[part]) return <span key={index} className={keywordStyles[part]}>{part}</span>;
        return part;
    });
};

const generateNiceTicks = (startTime, endTime) => {
    if (!startTime || !endTime) return [];
    const duration = endTime - startTime;
    const ticks = [startTime];
    let interval;
    const startPoint = new Date(startTime);

    if (duration <= 2 * 24 * 3600 * 1000) {
        interval = 6 * 3600 * 1000;
        startPoint.setMinutes(0, 0, 0);
        startPoint.setHours(Math.ceil(startPoint.getHours() / 6) * 6);
    } else if (duration <= 10 * 24 * 3600 * 1000) {
        interval = 24 * 3600 * 1000;
        startPoint.setHours(0, 0, 0, 0);
    } else {
        interval = 5 * 24 * 3600 * 1000;
        startPoint.setHours(0, 0, 0, 0);
    }

    let currentTick = startPoint.getTime();
    while (currentTick <= endTime) {
        if (currentTick >= startTime) ticks.push(currentTick);
        currentTick += interval;
    }
    ticks.push(endTime);
    return Array.from(new Set(ticks)).sort((a, b) => a - b);
};

const DEFAULT_PROFILES_DATA = [
    { name: "제3훈련비행단", lat: 35.093849, lon: 128.086558 }, { name: "제5공중기동비행단", lat: 35.172992, lon: 128.947130 },
    { name: "제17전투비행단", lat: 36.722071, lon: 127.495873 }, { name: "제15특수임무비행단", lat: 37.448781, lon: 127.105046 },
    { name: "제19전투비행단", lat: 37.038455, lon: 127.895066 }, { name: "제1전투비행단", lat: 35.140006, lon: 126.810903 },
    { name: "제8전투비행단", lat: 37.441973, lon: 127.966283 }, { name: "제10전투비행단", lat: 37.240132, lon: 127.006510 },
    { name: "제11전투비행단", lat: 35.899110, lon: 128.639127 }, { name: "제16전투비행단", lat: 36.629042, lon: 128.357680 },
    { name: "제18전투비행단", lat: 37.761001, lon: 128.956414 }, { name: "제20전투비행단", lat: 36.698670, lon: 126.503526 },
    { name: "제38전투비행전대", lat: 35.926051, lon: 126.615725 }
];

// ####################################################################
// ## ALL COMPONENT DEFINITIONS (DECLARED BEFORE `App`)
// ####################################################################

// --- Sub-Components ---
const AutoFitBounds = ({ bounds }) => { const map = useMap(); useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [20, 20] }); }, [bounds, map]); return null; };
const StatCard = ({ title, value, icon, color }) => (<div className="bg-gray-800 p-4 rounded-xl flex items-center gap-4 border border-gray-700"><div className={`p-3 rounded-lg bg-${color}-500/20 text-${color}-400`}>{icon}</div><div><p className="text-gray-400 text-sm">{title}</p><p className="text-2xl font-bold text-white">{value}</p></div></div>);
const ShapeIcon = ({ shape, color = "white" }) => {
    const props = { size: 14, className: `text-${color} stroke-current`, strokeWidth: 2 };
    switch(shape) {
        case 'circle': return <Circle {...props} fill={color} />; case 'triangle': return <Triangle {...props} fill={color} />;
        case 'square': return <Square {...props} fill={color} />; case 'diamond': return <Diamond {...props} fill={color} />;
        case 'star': return <Star {...props} fill={color} />; case 'cross': return <Plus {...props} />;
        case 'hexagon': return <Hexagon {...props} fill={color} />; case 'aperture': return <Aperture {...props} />;
        default: return <Circle {...props} fill={color} />;
    }
};
const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const duration = data.startTime && data.endTime ? Math.round((new Date(data.endTime) - new Date(data.startTime)) / 60000) : null;
        return (
            <div className="bg-gray-900/80 border border-gray-600 p-3 rounded-lg text-sm text-gray-200 backdrop-blur-sm">
                <p><strong>장비:</strong> {data.equipment}</p>
                <p><strong>성공점수:</strong> {data.successScore}점</p>
                {data.startTime && <p><strong>작전 날짜:</strong> {formatDate(data.startTime, 'date')}</p>}
                {duration != null && <p><strong>진행 시간:</strong> {duration}분</p>}
                {data.maxError != null && <p><strong>최대 오차:</strong> {formatNumber(data.maxError)}m</p>}
            </div>
        );
    }
    return null;
};

// --- View-Specific Components ---
const PredictionAccuracyAnalysis = ({ logs, allForecastData }) => {
    const [selectedLogId, setSelectedLogId] = useState('');
    
    useEffect(() => {
        if (logs && logs.length > 0) {
            const validLogs = logs.filter(l => l.gnssErrorData && l.gnssErrorData.length > 0);
            if(validLogs.length > 0) {
                setSelectedLogId(validLogs[0].id);
            }
        }
    }, [logs]);

    const analysisResult = useMemo(() => {
        if (!selectedLogId || !logs || !allForecastData) return null;
        const log = logs.find(l => l.id === Number(selectedLogId));
        if (!log || !log.gnssErrorData || log.gnssErrorData.length === 0) return null;
        
        const startTime = new Date(log.startTime).getTime();
        const endTime = new Date(log.endTime).getTime();
        const forecastInRange = allForecastData.filter(d => d.timestamp >= startTime && d.timestamp <= endTime);
        if(forecastInRange.length === 0) return { chartData: [], mae: 'N/A' };
        
        let totalError = 0;
        let comparisonCount = 0;
        const chartData = log.gnssErrorData.map(realDataPoint => {
            const realTimestamp = new Date(realDataPoint.date).getTime();
            const closestForecast = forecastInRange.reduce((prev, curr) => 
                Math.abs(curr.timestamp - realTimestamp) < Math.abs(prev.timestamp - realTimestamp) ? curr : prev
            );
            const predictedError = closestForecast.fore_gnss;
            if (predictedError !== undefined) {
                totalError += Math.abs(predictedError - realDataPoint.error_rate);
                comparisonCount++;
            }
            return {
                timestamp: realTimestamp,
                real_gnss: realDataPoint.error_rate,
                fore_gnss: predictedError,
            };
        });
        const mae = comparisonCount > 0 ? formatNumber(totalError / comparisonCount) : 'N/A';
        return { chartData, mae };
    }, [selectedLogId, logs, allForecastData]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">예측-실측 정확도 분석</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <select 
                    value={selectedLogId} 
                    onChange={e => setSelectedLogId(e.target.value)}
                    className="bg-gray-900 border-gray-600 rounded-md px-3 py-2 text-sm w-full"
                >
                    <option value="">분석할 작전 로그 선택</option>
                    {logs.filter(l => l.gnssErrorData).map(log => (
                        <option key={log.id} value={log.id}>
                            {`${formatDate(log.startTime, 'full')} - ${log.equipment}`}
                        </option>
                    ))}
                </select>
                {analysisResult && <div className="bg-gray-900/50 p-2 rounded-md text-center shrink-0">
                    <span className="text-sm text-gray-400">평균 절대 오차 (MAE): </span>
                    <span className="text-lg font-bold text-cyan-400">{analysisResult.mae} m</span>
                </div>}
            </div>
            {analysisResult && analysisResult.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analysisResult.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis 
                            dataKey="timestamp" 
                            type="number" 
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(unixTime) => formatDate(unixTime, 'time')} 
                            stroke="#A0AEC0"
                        />
                        <YAxis stroke="#A0AEC0" label={{ value: 'GNSS 오차(m)', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1A202C' }} 
                            labelFormatter={(unixTime) => formatDate(unixTime, 'full')}
                            formatter={(value) => formatNumber(value)}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="real_gnss" name="실제 오차" stroke="#fca5a5" dot={false} />
                        <Line type="monotone" dataKey="fore_gnss" name="예측 오차" stroke="#f87171" strokeDasharray="5 5" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex justify-center items-center h-72 text-gray-500">
                    {selectedLogId ? '데이터를 불러오는 중이거나 표시할 데이터가 없습니다.' : '분석할 작전 로그를 선택해주세요.'}
                </div>
            )}
        </div>
    );
};
const ForecastGraph = ({ allForecastData, forecastStatus, activeUnitThreshold, recommendedRange }) => {
    const dataKeys = {
        fore_gnss: { name: '예측 GNSS', color: '#f87171', axis: 'left' },
        real_gnss: { name: '실제 GNSS', color: '#fca5a5', axis: 'left' },
        tec_value: { name: 'TEC', color: '#60a5fa', axis: 'right' },
        xrsb:      { name: 'XRSB', color: '#a78bfa', axis: 'right' },
        kp:        { name: 'Kp', color: '#facc15', axis: 'right' },
        dst:       { name: 'Dst', color: '#4ade80', axis: 'right' },
    };
    const [visibleData, setVisibleData] = useState({ fore_gnss: true, real_gnss: false, tec_value: true, xrsb: false, kp: false, dst: false });
    const [timeRange, setTimeRange] = useState({ start: null, end: null });

    useEffect(() => {
        if (allForecastData && allForecastData.length > 0) {
            const now = new Date().getTime();
            const defaultStart = now - 12 * 3600 * 1000;
            const defaultEnd = now + 24 * 3600 * 1000;
            const dataMin = allForecastData[0].timestamp;
            const dataMax = allForecastData[allForecastData.length - 1].timestamp;
            setTimeRange({ start: Math.max(defaultStart, dataMin), end: Math.min(defaultEnd, dataMax) });
        }
    }, [allForecastData]);

    const dataForChart = useMemo(() => {
        if (!allForecastData || !timeRange.start) return [];
        const cutoffDate = new Date();
        cutoffDate.setMinutes(cutoffDate.getMinutes() - 10);
        cutoffDate.setMinutes(0, 0, 0);
        const cutoffTimestamp = cutoffDate.getTime();
        return allForecastData
            .filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
            .map(d => ({
                ...d,
                real_gnss: d.timestamp > cutoffTimestamp ? null : d.real_gnss
            }));
    }, [allForecastData, timeRange]);

    const nowTimestamp = new Date().getTime();
    const isNowInRange = nowTimestamp >= (timeRange.start || 0) && nowTimestamp <= (timeRange.end || Infinity);
    const niceTicks = useMemo(() => {
        if (!timeRange.start) return [];
        return generateNiceTicks(timeRange.start, timeRange.end);
    }, [timeRange]);
    const formatXAxis = (tick) => {
        if (!timeRange.start) return '';
        const duration = timeRange.end - timeRange.start;
        return duration <= 2 * 24 * 3600 * 1000 ? formatDate(tick, 'time') : formatDate(tick, 'date');
    };

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-white">GNSS 오차 및 우주기상 예측</h2>
            <div style={{width: '100%', height: 250}}>
                {forecastStatus.isLoading ? <div className="flex items-center justify-center h-full text-gray-400">데이터 로딩 중...</div>
                 : forecastStatus.error ? <div className="flex items-center justify-center h-full text-red-400">{forecastStatus.error}</div>
                 : dataForChart.length < 2 ? <div className="flex items-center justify-center h-full text-gray-400">표시할 데이터가 없습니다.</div>
                 : (<ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataForChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis dataKey="timestamp" stroke="#A0AEC0" type="number" domain={[timeRange.start, timeRange.end]} ticks={niceTicks} tickFormatter={formatXAxis} />
                        <YAxis yAxisId="left" label={{ value: 'GNSS 오차(m)', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} stroke="#F56565" />
                        <YAxis yAxisId="right" orientation="right" label={{ value: '우주기상 지수', angle: 90, position: 'insideRight', fill: '#A0AEC0' }} stroke="#A0AEC0" />
                        <Tooltip contentStyle={{ backgroundColor: '#1A202C' }} labelFormatter={(unixTime) => formatDate(unixTime, 'full')} formatter={(value) => formatNumber(value)}/>
                        <Legend wrapperStyle={{fontSize: "12px"}}/>
                        {Object.entries(dataKeys).map(([key, { name, color, axis }]) => (
                            visibleData[key] && <Line key={key} yAxisId={axis} type="monotone" dataKey={key} name={name} stroke={color} dot={false} connectNulls />
                        ))}
                        {visibleData['fore_gnss'] && <ReferenceLine yAxisId="left" y={activeUnitThreshold} label={{ value: "부대 임계값", fill: "#4FD1C5" }} stroke="#4FD1C5" strokeDasharray="4 4" />}
                        {isNowInRange && <ReferenceLine yAxisId="left" x={nowTimestamp} stroke="#fbbf24" strokeWidth={2} label={{ value: '현재', position: 'insideTop', fill: '#fbbf24' }} />}
                        {recommendedRange && <ReferenceArea yAxisId="left" x1={recommendedRange.start} x2={recommendedRange.end} stroke="#4ade80" strokeOpacity={0.6} fill="#4ade80" fillOpacity={0.2} label={{ value: "추천 시간", position: "insideTop", fill: "#4ade80" }}/>}
                    </LineChart>
                </ResponsiveContainer>)}
            </div>
            <div className="flex flex-col xl:flex-row justify-between items-center mt-4 pt-4 border-t border-gray-700 gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-2 w-full">
                    {Object.entries(dataKeys).map(([key, {name}]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                            <input type="checkbox" checked={visibleData[key]} onChange={e => setVisibleData(v => ({...v, [key]: e.target.checked}))} className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500 rounded" />
                            {name}
                        </label>
                    ))}
                </div>
                {timeRange.start && <div className="flex items-center gap-2 w-full xl:w-auto pt-4 xl:pt-0 border-t border-gray-700 xl:border-none">
                    <input type="datetime-local" value={toLocalISOString(new Date(timeRange.start))} onChange={e => setTimeRange(r => ({...r, start: new Date(e.target.value).getTime()}))} className="bg-gray-900 border border-gray-600 rounded p-1 text-sm w-full"/>
                    <span className="text-gray-400">-</span>
                    <input type="datetime-local" value={toLocalISOString(new Date(timeRange.end))} onChange={e => setTimeRange(r => ({...r, end: new Date(e.target.value).getTime()}))} className="bg-gray-900 border border-gray-600 rounded p-1 text-sm w-full"/>
                </div>}
            </div>
        </div>
    );
};
const LiveMap = ({threshold, center}) => {
    const [showClouds, setShowClouds] = useState(true);
    const koreaBounds = { minLat: 33.0, maxLat: 38.5, minLon: 125.0, maxLon: 130.0 };
    // ❗ OpenWeatherMap에서 발급받은 무료 API 키를 여기에 입력하세요.
    const OWM_API_KEY = "5e51e99c2fa4d10dbca840c7c1e1781e";
    const [aircrafts, setAircrafts] = useState(() => Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        p0: [ koreaBounds.minLat + Math.random() * (koreaBounds.maxLat - koreaBounds.minLat), koreaBounds.minLon + Math.random() * (koreaBounds.maxLon - koreaBounds.minLon) ],
        p1: [ koreaBounds.minLat + Math.random() * (koreaBounds.maxLat - koreaBounds.minLat), koreaBounds.minLon + Math.random() * (koreaBounds.maxLon - koreaBounds.minLon) ],
        p2: [ koreaBounds.minLat + Math.random() * (koreaBounds.maxLat - koreaBounds.minLat), koreaBounds.minLon + Math.random() * (koreaBounds.maxLon - koreaBounds.minLon) ],
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        error: 5 + Math.random() * 5
    })));

    useEffect(() => { const timer = setInterval(() => setAircrafts(prev => prev.map(ac => ({ ...ac, progress: (ac.progress + ac.speed) % 1, error: Math.max(3.0, ac.error + (Math.random() - 0.5) * 2) }))), 2000); return () => clearInterval(timer); }, []);

    return (<div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700 h-96 flex flex-col"><h2 className="text-lg font-semibold mb-4 text-white">실시간 항적 및 기상</h2><div className="flex-grow relative"><MapContainer key={center.lat + "-" + center.lon} center={[center.lat, center.lon]} zoom={9} style={{ height: "100%", width: "100%", borderRadius: "0.75rem", backgroundColor: "#333" }}> <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' /> {showClouds && OWM_API_KEY !== "5e51e99c2fa4d10dbca840c7c1e1781e" && <TileLayer url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`} attribution='&copy; OpenWeatherMap' zIndex={2} opacity={0.7}/>} {aircrafts.map(ac => { let pos = getPointOnBezierCurve(ac.progress, ac.p0, ac.p1, ac.p2); return (<CircleMarker key={ac.id} center={pos} radius={6} pathOptions={{ color: getErrorColor(ac.error, threshold), fillColor: getErrorColor(ac.error, threshold), fillOpacity: 0.8 }}><LeafletTooltip>✈️ ID: {ac.id}<br />GNSS 오차: {formatNumber(ac.error)}m</LeafletTooltip></CircleMarker>); })} </MapContainer></div><div className="pt-2 mt-2 border-t border-gray-700"><label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300"><input type="checkbox" checked={showClouds} onChange={e => setShowClouds(e.target.checked)} className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500 rounded" />기상 오버레이 표시</label></div> </div>);
};
const XAIAnalysisReport = ({ allForecastData, threshold }) => {
    const analysis = useMemo(() => {
        if (!allForecastData || allForecastData.length === 0) return null;
        const now = new Date().getTime();
        const next24h = now + 24 * 3600 * 1000;
        const relevantData = allForecastData.filter(d => d.timestamp >= now && d.timestamp <= next24h);
        if (relevantData.length === 0) return { conclusion: "예측 데이터가 없습니다.", recommendation: "", factors: [] };

        const maxErrorPoint = relevantData.reduce((max, p) => p.fore_gnss > max.fore_gnss ? p : max, { fore_gnss: 0 });
        const maxError = maxErrorPoint.fore_gnss;
        
        const factors = [];
        if (maxErrorPoint.kp >= 6) factors.push({ severity: "높음", name: "Kp 지수", value: formatNumber(maxErrorPoint.kp, 1), cause: "지자기 폭풍", icon: <Wind size={16} className="text-yellow-400"/> });
        if (maxErrorPoint.xrsb > 1e-5) factors.push({ severity: "높음", name: "X선 플럭스", value: maxErrorPoint.xrsb.toExponential(1), cause: "태양 플레어", icon: <Sun size={16} className="text-red-400"/> });
        if (maxErrorPoint.tec_value > 50) factors.push({ severity: "높음", name: "총 전자 함유량(TEC)", value: formatNumber(maxErrorPoint.tec_value, 1), cause: "전리층 불안정", icon: <Zap size={16} className="text-blue-400"/>});

        let conclusion = `24시간 내 최대 GNSS 오차는 **${formatNumber(maxError)}m**로 예측됩니다. 이는 부대 임계값 ${formatNumber(threshold)}m 대비 `;
        let recommendation;

        if (maxError > threshold) {
            conclusion += "위험 수준입니다.";
            recommendation = "정밀 타격 및 GNSS 의존도가 높은 임무 수행 시 각별한 주의가 필요하며, 대체 항법 수단 사용을 적극 고려해야 합니다.";
        } else if (maxError > threshold * 0.7) {
            conclusion += "주의 수준입니다.";
            recommendation = "GNSS 민감 장비 운용 시 간헐적 오차 증가에 대비하고, 대체 항법 수단을 숙지하십시오.";
        } else {
            conclusion += "안정 수준입니다.";
            recommendation = "모든 임무를 정상적으로 수행할 수 있습니다.";
        }

        if (factors.length > 0) {
            const primaryFactor = factors[0];
            conclusion += ` 주요 원인은 ${primaryFactor.cause}(${primaryFactor.name}: ${primaryFactor.value})으로 분석됩니다.`
        } else if (maxError > threshold * 0.5) {
            conclusion += ` 복합적인 우주기상 요인의 영향으로 보입니다.`
        }
        
        return { conclusion, recommendation, factors };
    }, [allForecastData, threshold]);

    if (!analysis) return null;

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center"><BrainCircuit size={20} className="mr-2 text-cyan-300" />XAI 기반 상황 분석 보고</h2>
            <div className="space-y-4 text-sm">
                <div>
                    <p className="font-semibold text-gray-300">종합 분석</p>
                    <p className="text-gray-400">{parseStyledText(analysis.conclusion)}</p>
                </div>
                {analysis.factors.length > 0 && (
                    <div>
                        <p className="font-semibold text-gray-300">주요 영향 요인</p>
                        <ul className="list-none space-y-1 mt-1">
                            {analysis.factors.map(f => (
                                <li key={f.name} className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-md">
                                    {f.icon}
                                    <span className="font-semibold">{f.cause}</span>
                                    <span className="text-gray-400">({f.name}: {f.value})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div>
                    <p className="font-semibold text-gray-300">권고 사항</p>
                    <p className="text-gray-400">{analysis.recommendation}</p>
                </div>
            </div>
        </div>
    );
};
const TodoList = ({ todoList, addTodo, updateTodo, deleteTodo }) => {
    const [newTodo, setNewTodo] = useState({ text: '', time: '12:00', tag: '브리핑' });
    const [editingTodo, setEditingTodo] = useState(null);
    const [menuOpenFor, setMenuOpenFor] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [tagMenuOpenFor, setTagMenuOpenFor] = useState(null);
    const [tagMenuPosition, setTagMenuPosition] = useState({ top: 0, left: 0 });
    const [customTag, setCustomTag] = useState('');
    const menuRef = useRef(null);
    const tagMenuRef = useRef(null);

    const DEFAULT_TAGS = ['브리핑', '임무', '정비', '보고'];
    const uniqueTags = useMemo(() => Array.from(new Set([...DEFAULT_TAGS, ...todoList.map(t => t.tag)])), [todoList]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpenFor(null);
            if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) setTagMenuOpenFor(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMenuOpen = (e, item) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPosition({ top: rect.bottom + window.scrollY + 5, left: rect.left + window.scrollX });
        setMenuOpenFor(item.id);
    };

    const openTagMenu = (e, id) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const isNew = id === 'new';
        setTagMenuPosition({
            top: isNew ? rect.top + window.scrollY - 5 : rect.bottom + window.scrollY + 5,
            left: rect.left + window.scrollX,
            transform: isNew ? 'translateY(-100%)' : 'none'
        });
        setTagMenuOpenFor(id);
    };

    const handleAdd = () => {
        if (newTodo.text) {
            addTodo(newTodo);
            setNewTodo({ text: '', time: '12:00', tag: '브리핑' });
        }
    };
    const handleSave = (id) => {
        updateTodo(editingTodo);
        setEditingTodo(null);
    };

    const handleCustomTagSave = (id) => {
        if (customTag) {
            if (id === 'new') {
                setNewTodo(prev => ({...prev, tag: customTag}));
            } else {
                setEditingTodo(prev => ({...prev, tag: customTag}));
            }
            setCustomTag('');
            setTagMenuOpenFor(null);
        }
    }

    const MenuPopover = () => (
        menuOpenFor && createPortal(
            <div ref={menuRef} className="fixed z-20 w-32 bg-gray-700 border border-gray-600 rounded-md shadow-lg p-2 space-y-1" style={{ top: menuPosition.top, left: menuPosition.left, transform: 'translateX(-100%)' }}>
                <button onClick={() => { setEditingTodo(todoList.find(t => t.id === menuOpenFor)); setMenuOpenFor(null); }} className="w-full text-left px-2 py-1 hover:bg-gray-600 rounded flex items-center gap-2"><Edit size={14}/> 수정</button>
                <button onClick={() => { deleteTodo(menuOpenFor); setMenuOpenFor(null); }} className="w-full text-left px-2 py-1 hover:bg-gray-600 rounded flex items-center gap-2 text-red-400"><Trash2 size={14}/> 삭제</button>
            </div>,
            document.body
        )
    );

    const TagMenu = ({ id, onSelect, onCustomSave }) => (
        tagMenuOpenFor === id && createPortal(
            <div ref={tagMenuRef} className="fixed z-20 w-40 bg-gray-700 border border-gray-600 rounded-md shadow-lg p-2 space-y-1" style={{...tagMenuPosition}}>
                {uniqueTags.map(tag => <button key={tag} onClick={() => onSelect(tag)} className="w-full text-left px-2 py-1 hover:bg-gray-600 rounded">{tag}</button>)}
                <div className="flex gap-1 pt-1 border-t border-gray-600"><input value={customTag} onChange={e => setCustomTag(e.target.value)} placeholder="직접 입력" className="w-full bg-gray-800 text-xs p-1 rounded"/><button onClick={onCustomSave} className="bg-blue-600 p-1 rounded"><Save size={12}/></button></div>
            </div>,
            document.body
        )
    );

    return (
      <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-white flex items-center"><Activity size={20} className="mr-2" />금일 주요 활동</h2>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
            {todoList.map(item => (
                <div key={item.id} className="flex items-center gap-3 text-sm group">
                    {editingTodo?.id === item.id ? (
                        <>
                            <input type="time" value={editingTodo.time} onChange={e => setEditingTodo({...editingTodo, time: e.target.value})} className="bg-gray-900 border border-gray-600 rounded p-1 text-sm w-auto" />
                            <input type="text" value={editingTodo.text} onChange={e => setEditingTodo({...editingTodo, text: e.target.value})} className="bg-gray-900 border border-gray-600 rounded p-1 text-sm flex-grow" />
                            <button onClick={(e) => openTagMenu(e, item.id)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">{editingTodo.tag} <ChevronDown size={12}/></button>
                            <TagMenu id={item.id} onSelect={(tag) => { setEditingTodo({...editingTodo, tag}); setTagMenuOpenFor(null); }} onCustomSave={() => handleCustomTagSave(item.id)} />
                            <button onClick={() => handleSave(item.id)} className="p-1 text-green-400 hover:text-green-300"><Save size={16}/></button>
                            <button onClick={() => setEditingTodo(null)} className="p-1 text-gray-400 hover:text-white"><X size={16}/></button>
                        </>
                    ) : (
                        <>
                            <span className="font-semibold text-cyan-400">{item.time}</span>
                            <span className="flex-grow">{item.text}</span>
                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{item.tag}</span>
                            <button onClick={(e) => handleMenuOpen(e, item)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"><MoreVertical size={16}/></button>
                        </>
                    )}
                </div>
            ))}
        </div>
        <MenuPopover />
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
            <input type="time" value={newTodo.time} onChange={e => setNewTodo({...newTodo, time: e.target.value})} className="bg-gray-900 border border-gray-600 rounded p-1 text-sm w-auto" />
            <input type="text" placeholder="활동 내용" value={newTodo.text} onChange={e => setNewTodo({...newTodo, text: e.target.value})} className="bg-gray-900 border border-gray-600 rounded p-1 text-sm flex-grow" />
            <button onClick={(e) => openTagMenu(e, 'new')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">{newTodo.tag} <ChevronDown size={12}/></button>
            <TagMenu id={'new'} onSelect={(tag) => { setNewTodo({...newTodo, tag}); setTagMenuOpenFor(null); }} onCustomSave={() => handleCustomTagSave('new')} />
            <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 rounded p-2"><Plus size={16} /></button>
        </div>
      </div>
    );
};
const OptimalTimeRecommender = ({ allForecastData, onRecommendation }) => {
    const [searchStart, setSearchStart] = useState(() => toLocalISOString(new Date()));
    const [searchEnd, setSearchEnd] = useState(() => toLocalISOString(new Date(new Date().getTime() + 48 * 3600 * 1000)));
    const [duration, setDuration] = useState(3);
    const [result, setResult] = useState(null);

    const handleRecommend = () => {
        const searchStartTs = new Date(searchStart).getTime();
        const searchEndTs = new Date(searchEnd).getTime();

        // Data points are hourly, so duration is in hours.
        const durationInPoints = duration;

        const relevantData = allForecastData.filter(d => d.timestamp >= searchStartTs && d.timestamp <= searchEndTs);
        if (relevantData.length < durationInPoints) {
            setResult("해당 시간 범위의 예측 데이터가 작전 시간보다 짧습니다.");
            onRecommendation(null);
            return;
        }

        let minSum = Infinity;
        let bestStartTime = null;

        for (let i = 0; i <= relevantData.length - durationInPoints; i++) {
            const window = relevantData.slice(i, i + durationInPoints);
            const currentSum = window.reduce((sum, d) => sum + d.fore_gnss, 0);

            if (currentSum < minSum) {
                minSum = currentSum;
                bestStartTime = window[0].timestamp;
            }
        }

        if (bestStartTime) {
            const recommendedEnd = bestStartTime + duration * 3600 * 1000;
            setResult(`추천 작전 시간: ${formatDate(bestStartTime, 'full')} ~ ${formatDate(recommendedEnd, 'time')}`);
            onRecommendation({start: bestStartTime, end: recommendedEnd});
        } else {
            setResult("추천 가능한 시간대를 찾을 수 없습니다.");
            onRecommendation(null);
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-white">최적 작전 시간 추천</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="text-xs text-gray-400">탐색 시작</label>
                    <input type="datetime-local" value={searchStart} min={toLocalISOString(new Date())} onChange={e => setSearchStart(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm" />
                </div>
                 <div>
                    <label className="text-xs text-gray-400">탐색 종료</label>
                    <input type="datetime-local" value={searchEnd} min={searchStart} onChange={e => setSearchEnd(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm" />
                </div>
                <div>
                    <label className="text-xs text-gray-400">작전 시간 (시간)</label>
                    <input type="number" value={duration} min="1" onChange={e => setDuration(parseInt(e.target.value, 10))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm" />
                </div>
                <button onClick={handleRecommend} className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2 flex items-center justify-center gap-2 h-10"><Search size={16}/> 추천 받기</button>
            </div>
            {result && <p className="text-center text-cyan-400 mt-4 font-semibold">{result}</p>}
        </div>
    );
};
const FutureMissionPlanner = ({ allForecastData, profile }) => {
    const [plan, setPlan] = useState({
        name: '정밀 타격 훈련',
        startTime: toLocalISOString(new Date(new Date().getTime() + 24 * 3600 * 1000)),
        endTime: toLocalISOString(new Date(new Date().getTime() + 26 * 3600 * 1000)),
        equipment: profile.equipment.length > 0 ? profile.equipment[0].name : '',
    });
    const [prediction, setPrediction] = useState(null);

    const handlePredict = () => {
        const startTimeTs = new Date(plan.startTime).getTime();
        const endTimeTs = new Date(plan.endTime).getTime();

        if (startTimeTs >= endTimeTs) {
            alert("종료 시간은 시작 시간보다 늦어야 합니다.");
            return;
        }

        const relevantData = allForecastData.filter(d => d.timestamp >= startTimeTs && d.timestamp <= endTimeTs);
        if (relevantData.length === 0) {
            setPrediction({ error: "해당 시간 범위의 예측 데이터가 없습니다." });
            return;
        }

        const equipmentProfile = profile.equipment.find(e => e.name === plan.equipment);
        const threshold = equipmentProfile.thresholdMode === 'auto' && equipmentProfile.autoThreshold ? equipmentProfile.autoThreshold : equipmentProfile.manualThreshold;

        const errors = relevantData.map(d => d.fore_gnss);
        const maxError = Math.max(...errors);
        const avgError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
        const overThresholdCount = errors.filter(err => err > threshold).length;
        const riskRatio = (overThresholdCount / errors.length) * 100;

        let successRate = 100 - (riskRatio * 1.5) - (avgError / threshold * 20);
        successRate = Math.max(0, Math.min(99, successRate));

        setPrediction({
            maxError: maxError.toFixed(2),
            avgError: avgError.toFixed(2),
            riskRatio: riskRatio.toFixed(1),
            successRate: successRate.toFixed(1),
            threshold: threshold.toFixed(2),
            error: null,
        });
    };

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-white">미래 작전 계획 및 성공률 예측</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs text-gray-400">작전 시작</label>
                        <input type="datetime-local" value={plan.startTime} onChange={e => setPlan(p => ({...p, startTime: e.target.value}))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">작전 종료</label>
                        <input type="datetime-local" value={plan.endTime} min={plan.startTime} onChange={e => setPlan(p => ({...p, endTime: e.target.value}))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs text-gray-400">주요 운용 장비</label>
                        <select value={plan.equipment} onChange={e => setPlan(p => ({...p, equipment: e.target.value}))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm">
                            {profile.equipment.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                     <button onClick={handlePredict} className="bg-blue-600 hover:bg-blue-700 rounded-lg p-2 flex items-center justify-center gap-2 h-10 w-full"><BotMessageSquare size={16}/> 성공률 예측</button>
                    {prediction && !prediction.error && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-center bg-gray-900/50 p-3 rounded-lg">
                            <div><p className="text-xs text-gray-400">예상 성공률</p><p className={`text-xl font-bold ${getSuccessScoreInfo(prediction.successRate/10).color}`}>{prediction.successRate}%</p></div>
                            <div><p className="text-xs text-gray-400">최대 오차</p><p className={`text-xl font-bold ${getErrorColor(prediction.maxError, prediction.threshold)}`}>{prediction.maxError}m</p></div>
                            <div><p className="text-xs text-gray-400">평균 오차</p><p className="text-xl font-bold text-white">{prediction.avgError}m</p></div>
                            <div><p className="text-xs text-gray-400">위험 시간 비율</p><p className="text-xl font-bold text-yellow-400">{prediction.riskRatio}%</p></div>
                        </div>
                    )}
                    {prediction && prediction.error && <p className="text-center text-red-400 mt-2 font-semibold">{prediction.error}</p>}
                </div>
            </div>
        </div>
    );
};
const SettingsView = ({ profiles, setProfiles, activeProfile, setActiveProfileId, goBack, createDefaultProfile }) => {
    const [localProfile, setLocalProfile] = useState(JSON.parse(JSON.stringify(activeProfile)));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);

    useEffect(() => { setLocalProfile(JSON.parse(JSON.stringify(activeProfile))); }, [activeProfile]);

    const handleProfileChange = (field, value) => { setLocalProfile(prev => ({ ...prev, [field]: value })); };
    const handleLocationChange = (field, value) => setLocalProfile(p => ({ ...p, location: { ...p.location, coords: { ...p.location.coords, [field]: parseFloat(value) || null }}}));
    const handleEquipmentChange = (id, field, value) => setLocalProfile({ ...localProfile, equipment: localProfile.equipment.map(eq => eq.id === id ? { ...eq, [field]: value } : eq) });
    const addEquipment = () => setLocalProfile({ ...localProfile, equipment: [...localProfile.equipment, { id: Date.now(), name: "신규 장비", thresholdMode: 'manual', manualThreshold: 10.0, autoThreshold: null, usesGeoData: false }] });
    const removeEquipment = (id) => setLocalProfile({ ...localProfile, equipment: localProfile.equipment.filter(eq => eq.id !== id) });

    const handleSave = () => {
        setProfiles(profiles.map(p => p.id === localProfile.id ? localProfile : p));
        goBack();
    };

    const handleLocationMethodChange = (method) => {
        let updatedProfile = { ...localProfile, location: { ...localProfile.location, method } };
        if (method === 'unit') {
            updatedProfile.location.coords = localProfile.location.initialCoords;
            setLocalProfile(updatedProfile);
        } else if (method === 'current') {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        updatedProfile.location.coords = { lat: latitude, lon: longitude };
                        setLocalProfile(updatedProfile);
                        alert('현재 위치를 성공적으로 가져왔습니다. 하단의 저장 버튼을 눌러야 지도에 반영됩니다.');
                    },
                    (error) => alert(`위치 정보를 가져오는데 실패했습니다: ${error.message}`)
                );
            } else { alert('이 브라우저에서는 위치 정보가 지원되지 않습니다.'); }
        } else {
            setLocalProfile(updatedProfile);
        }
    };

    const openProfileModal = (profile) => { setEditingProfile(profile ? {...profile} : { name: '', location: { coords: { lat: '', lon: ''}}}); setIsModalOpen(true); };
    const handleSaveProfile = () => {
        if (!editingProfile.name) { alert("부대명을 입력해주세요."); return; }
        if (editingProfile.id) { // Edit existing
            setProfiles(profiles.map(p => p.id === editingProfile.id ? { ...p, name: editingProfile.name, location: { ...p.location, coords: editingProfile.location.coords, initialCoords: editingProfile.location.coords } } : p));
        } else { // Add new
            const newProfile = createDefaultProfile(Date.now(), editingProfile.name, editingProfile.location.coords.lat, editingProfile.location.coords.lon);
            const newProfiles = [...profiles, newProfile];
            setProfiles(newProfiles);
            setActiveProfileId(newProfile.id);
        }
        setIsModalOpen(false);
    };
    const handleDeleteProfile = (id) => {
        if (profiles.length <= 1) { alert("최소 하나 이상의 프로필이 필요합니다."); return; }
        if (window.confirm("정말로 이 프로필을 삭제하시겠습니까?")) {
            const newProfiles = profiles.filter(p => p.id !== id);
            setProfiles(newProfiles);
            setActiveProfileId(newProfiles[0].id);
        }
    };

    return (<div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-3xl mx-auto">
        {isModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"><div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-full max-w-md"><h2 className="text-xl font-bold mb-4">{editingProfile.id ? '부대 정보 수정' : '새 부대 추가'}</h2><div className="space-y-4"><input type="text" placeholder="부대명" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} className="w-full bg-gray-900 border-gray-600 rounded p-2" /><input type="number" placeholder="위도" value={editingProfile.location.coords.lat} onChange={e => setEditingProfile({...editingProfile, location: {...editingProfile.location, coords: {...editingProfile.location.coords, lat: parseFloat(e.target.value) || ''}}})} className="w-full bg-gray-900 border-gray-600 rounded p-2" /><input type="number" placeholder="경도" value={editingProfile.location.coords.lon} onChange={e => setEditingProfile({...editingProfile, location: {...editingProfile.location, coords: {...editingProfile.location.coords, lon: parseFloat(e.target.value) || ''}}})} className="w-full bg-gray-900 border-gray-600 rounded p-2" /></div><div className="flex justify-end gap-2 mt-6"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">취소</button><button onClick={handleSaveProfile} className="px-4 py-2 bg-blue-600 rounded">저장</button></div></div></div>)}
        <div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">부대 프로필 설정</h2></div>
        <div className="space-y-6">
            <div><label className="block text-sm font-medium text-gray-400 mb-2">현재 프로필</label><div className="flex items-center gap-2"><select className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" value={activeProfile.id} onChange={e => setActiveProfileId(Number(e.target.value))}>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button onClick={() => openProfileModal()} className="p-2 bg-green-600 rounded-lg" title="새 부대 추가"><PlusCircle size={20} /></button><button onClick={() => openProfileModal(activeProfile)} className="p-2 bg-yellow-600 rounded-lg" title="현 부대 수정"><Pencil size={20} /></button><button onClick={() => handleDeleteProfile(activeProfile.id)} className="p-2 bg-red-600 rounded-lg" title="현 부대 삭제"><Trash2 size={20} /></button></div></div>
            <div className="bg-gray-700/50 p-4 rounded-lg space-y-3"><h3 className="text-lg font-semibold text-white">위치 및 시간 설정</h3><div className="form-group"><label className="block text-sm font-medium text-gray-400 mb-2">위치 설정 방식</label><div className="flex flex-wrap gap-2">{[{id:'unit',label:'부대 위치',icon:Compass},{id:'manual',label:'직접 입력',icon:Edit3},{id:'current',label:'현재 위치',icon:MapPin}].map(m=>(<button key={m.id} onClick={()=>handleLocationMethodChange(m.id)} className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md ${localProfile.location.method === m.id ? 'bg-blue-600 text-white':'bg-gray-600'}`}>{React.createElement(m.icon,{size:16})}<span>{m.label}</span></button>))}</div></div>{localProfile.location.method === 'manual' && (<div className="flex flex-col md:flex-row gap-4 mt-2"><div className="w-full md:w-1/2"><label className="block text-sm font-medium text-gray-400 mb-2">위도</label><input type="number" step="any" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" value={localProfile.location.coords.lat || ''} onChange={e => handleLocationChange('lat', e.target.value)}/></div><div className="w-full md:w-1/2"><label className="block text-sm font-medium text-gray-400 mb-2">경도</label><input type="number" step="any" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" value={localProfile.location.coords.lon || ''} onChange={e => handleLocationChange('lon', e.target.value)}/></div></div>)}
            <div className="form-group"><label className="block text-sm font-medium text-gray-400 mb-2">표준 시간</label><div className="flex items-center space-x-2">{[{id:'KST',label:'KST'},{id:'UTC',label:'UTC'},{id:'BOTH',label:'KST/UTC'}].map(t=>(<button key={t.id} onClick={()=>handleProfileChange('timezone', t.id)} className={`px-3 py-2 text-sm rounded-md ${localProfile.timezone===t.id ? 'bg-blue-600 text-white':'bg-gray-600'}`}>{t.label}</button>))}</div></div></div>
            <div className="bg-gray-700/50 p-4 rounded-lg"><h3 className="text-lg font-semibold text-white mb-3">부대 종합 임계값</h3><div className="flex items-center space-x-2 cursor-pointer"><span className={`px-2 py-1 text-xs rounded-md ${localProfile.unitThresholdMode === 'manual' ? 'bg-blue-600':'bg-gray-600'}`} onClick={() => handleProfileChange('unitThresholdMode', 'manual')}>수동</span><span className={`px-2 py-1 text-xs rounded-md ${localProfile.unitThresholdMode === 'auto' ? 'bg-blue-600':'bg-gray-600'}`} onClick={() => handleProfileChange('unitThresholdMode', 'auto')}>자동</span></div>{localProfile.unitThresholdMode === 'manual' ? (<div className="flex items-center space-x-2 mt-2"><input type="range" min="1" max="30" step="0.5" value={localProfile.unitManualThreshold} onChange={e => handleProfileChange('unitManualThreshold', parseFloat(e.target.value))} className="w-full" /><span className="text-cyan-400 font-mono w-16 text-center">{formatNumber(localProfile.unitManualThreshold, 1)}m</span></div>) : (<div className="text-center bg-gray-800 p-2 rounded-md mt-2"><span className="text-gray-400">자동 계산된 임계값: </span><span className="font-bold text-white">{formatNumber(localProfile.unitAutoThreshold) ? `${formatNumber(localProfile.unitAutoThreshold)}m` : 'N/A'}</span></div>)}</div>
            <div><h3 className="text-lg font-semibold text-white mb-3">주요 장비 설정</h3><div className="space-y-4">{localProfile.equipment.map(eq => (<div key={eq.id} className="bg-gray-700/50 p-4 rounded-lg space-y-4"><div className="flex justify-between items-center"><input type="text" value={eq.name} onChange={e => handleEquipmentChange(eq.id, 'name', e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="장비명" /><button onClick={() => removeEquipment(eq.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 className="w-5 h-5" /></button></div><div className="flex items-center justify-between"><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={eq.usesGeoData} onChange={e => handleEquipmentChange(eq.id, 'usesGeoData', e.target.checked)} className="h-4 w-4 rounded bg-gray-900 border-gray-600 text-cyan-500 focus:ring-cyan-500" /><span>위치 정보 사용</span></label><div className="flex items-center space-x-2 cursor-pointer"><span className={`px-2 py-1 text-xs rounded-md ${eq.thresholdMode === 'manual' ? 'bg-blue-600':'bg-gray-600'}`} onClick={() => handleEquipmentChange(eq.id, 'thresholdMode', 'manual')}>수동</span><span className={`px-2 py-1 text-xs rounded-md ${eq.thresholdMode === 'auto' ? 'bg-blue-600':'bg-gray-600'}`} onClick={() => handleEquipmentChange(eq.id, 'thresholdMode', 'auto')}>자동</span></div></div><div>{eq.thresholdMode === 'manual' ? (<div className="flex items-center space-x-2"><input type="range" min="1" max="30" step="0.5" value={eq.manualThreshold} onChange={e => handleEquipmentChange(eq.id, 'manualThreshold', parseFloat(e.target.value))} className="w-full" /><span className="text-cyan-400 font-mono w-16 text-center">{formatNumber(eq.manualThreshold, 1)}m</span></div>) : (<div className="text-center bg-gray-800 p-2 rounded-md"><span className="text-gray-400">자동 임계값: </span><span className="font-bold text-white">{formatNumber(eq.autoThreshold) ? `${formatNumber(eq.autoThreshold)}m` : '데이터 부족'}</span></div>)}</div></div>))}</div><div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-4"><button onClick={addEquipment} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Plus className="w-5 h-5" /><span>장비 추가</span></button><button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><BrainCircuit size={20}/><span>자동 임계값 전체 재계산</span></button></div></div>
        </div><div className="mt-8 flex justify-end"><button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"><Save className="w-5 h-5" /><span>저장</span></button></div></div>);
};
const DeveloperTestView = ({ setLogs, setForecastData, allForecastData, goBack }) => {
    const generateMockLogs = () => { if (!window.confirm("기존 피드백을 삭제하고, 최근 100일간의 시연용 테스트 데이터를 대량 생성합니까?")) return; const newLogs = []; const today = new Date(); for (let i = 0; i < 100; i++) { const date = new Date(today); date.setDate(today.getDate() - i); const logCount = Math.floor(Math.random() * 5) + 5; for (let j = 0; j < logCount; j++) { const eq = { name: "JDAM", manualThreshold: 10, usesGeoData: true }; let successScore; let baseError; const outcomeRoll = Math.random(); if (outcomeRoll < 0.85) { successScore = Math.floor(8 + Math.random() * 3); baseError = 2 + Math.random() * (eq.manualThreshold * 0.5); } else if (outcomeRoll < 0.95) { successScore = Math.floor(4 + Math.random() * 4); baseError = eq.manualThreshold * 0.7 + Math.random() * (eq.manualThreshold * 0.3); } else { successScore = Math.floor(1 + Math.random() * 3); baseError = eq.manualThreshold * 1.1 + Math.random() * 5; } const startTime = new Date(date); startTime.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 60)); const endTime = new Date(startTime.getTime() + (30 + Math.floor(Math.random() * 90)) * 60000); const data = []; let curTime = new Date(startTime); const p0 = [36.7+Math.random()*0.5, 127.4+Math.random()*0.5]; const p1 = [36.7+Math.random()*0.5, 127.4+Math.random()*0.5]; const p2 = [36.7+Math.random()*0.5, 127.4+Math.random()*0.5]; let step = 0; while (curTime < endTime) { const err = Math.max(1.0, baseError + (Math.random() - 0.5) * 4); const entry = { date: curTime.toISOString(), error_rate: parseFloat(formatNumber(err))}; if (eq.usesGeoData) { const progress = step / ((endTime.getTime() - startTime.getTime()) / 60000 || 1); const pos = getPointOnBezierCurve(progress, p0, p1, p2); entry.lat = pos[0]; entry.lon = pos[1]; } data.push(entry); curTime.setMinutes(curTime.getMinutes() + 1); step++; } newLogs.push({ id: Date.now() + i * 100 + j, startTime: startTime.toISOString(), endTime: endTime.toISOString(), equipment: eq.name, successScore, gnssErrorData: data }); } } setLogs(newLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))); alert(`${newLogs.length}개의 테스트 피드백이 생성되었습니다.`); };
    const clearLogs = () => { if (window.confirm("모든 피드백 데이터를 삭제하시겠습니까?")) { setLogs([]); alert("모든 피드백이 삭제되었습니다."); }};
    const resetAppState = () => { if (window.confirm("앱의 모든 로컬 데이터(프로필, 피드백 로그)를 삭제하고 초기 상태로 되돌리시겠습니까?")) { localStorage.clear(); alert("앱 상태가 초기화되었습니다. 페이지를 새로고침합니다."); window.location.reload(); }};

    const simulateSpaceWeather = (type) => {
        setForecastData(prevData => {
            const newData = JSON.parse(JSON.stringify(allForecastData)); // Use original data for clean slate
            const now = new Date().getTime();
            const targetTime = now + (3 + Math.random() * 5) * 3600 * 1000; // 3-8 hours from now

            let alertMsg = '';
            if(type === 'flare') {
                for(let i = 0; i < newData.length; i++) {
                    if (newData[i].timestamp > targetTime && newData[i].timestamp < targetTime + 2 * 3600 * 1000) {
                        newData[i].xrsb = 5e-5;
                        newData[i].fore_gnss = Math.max(newData[i].fore_gnss, 15 + Math.random() * 5);
                    }
                }
                alertMsg = '강력한 태양 플레어 상황이 시뮬레이션 되었습니다.';
            } else if (type === 'storm') {
                 for(let i = 0; i < newData.length; i++) {
                    if (newData[i].timestamp > targetTime && newData[i].timestamp < targetTime + 12 * 3600 * 1000) {
                        newData[i].kp = 6 + Math.random() * 2; // Kp 6-8
                         newData[i].fore_gnss = Math.max(newData[i].fore_gnss, 18 + Math.random() * 8);
                    }
                }
                alertMsg = '강력한 지자기 폭풍 상황이 시뮬레이션 되었습니다.';
            }
            alert(alertMsg);
            return newData;
        });
    };

    return (<div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
        <div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">개발자 테스트 도구</h2></div>
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-3">발표 시연용 시나리오</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <button onClick={() => simulateSpaceWeather('flare')} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Sun size={20} /><span>태양 플레어 시뮬레이션</span></button>
                     <button onClick={() => simulateSpaceWeather('storm')} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Wind size={20} /><span>지자기 폭풍 시뮬레이션</span></button>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-white mb-3">피드백 데이터 관리</h3>
                <div className="flex space-x-4">
                    <button onClick={generateMockLogs} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><TestTube2 size={20} /><span>테스트 데이터 생성</span></button>
                    <button onClick={clearLogs} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Eraser size={20} /><span>모든 데이터 삭제</span></button>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-white mb-3 text-red-400">위험 영역</h3>
                <div className="flex space-x-4">
                    <button onClick={resetAppState} className="w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><RefreshCw size={20} /><span>앱 상태 전체 초기화</span></button>
                </div>
            </div>
        </div>
    </div>);
};
const FeedbackView = ({ equipmentList, onSubmit, goBack }) => {
    const [log, setLog] = useState({ startTime: toLocalISOString(new Date(new Date().getTime() - 3600*1000)), endTime: toLocalISOString(new Date()), equipment: equipmentList.length > 0 ? equipmentList[0].name : '', successScore: 10, gnssErrorData: null });
    const [fileName, setFileName] = useState("");
    const handleFileChange = (e) => { const file = e.target.files[0]; if (!file) return; setFileName(file.name); const reader = new FileReader(); reader.onload = (event) => { try { const text = event.target.result; const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== ''); if (lines.length < 2) throw new Error("CSV에 데이터가 없습니다."); const header = lines[0].trim().split(',').map(h => h.trim()); const hasGeo = header.includes('lat') && header.includes('lon'); if (header[0] !== 'date' || header[1] !== 'error_rate') throw new Error("헤더는 'date,error_rate'로 시작해야 합니다."); const data = lines.slice(1).map((line, i) => { const vals = line.split(','); const err = parseFloat(vals[1]); if (isNaN(err)) throw new Error(`${i+2}번째 줄 error_rate가 숫자가 아닙니다.`); const entry = { date: vals[0].trim(), error_rate: err }; if (hasGeo) { entry.lat = parseFloat(vals[2]); entry.lon = parseFloat(vals[3]); if (isNaN(entry.lat) || isNaN(entry.lon)) throw new Error(`${i+2}번째 줄 lat/lon이 숫자가 아닙니다.`); } return entry; }); setLog(prev => ({ ...prev, gnssErrorData: data })); } catch (error) { alert(`CSV 파싱 오류: ${error.message}`); setFileName(""); e.target.value = null; } }; reader.readAsText(file); };
    const handleSubmit = (e) => { e.preventDefault(); if (!log.equipment || !log.startTime || !log.endTime) { alert("필수 항목을 모두 입력해주세요."); return; } onSubmit(log); };
    return (<div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto"><div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">작전 피드백 입력</h2></div><form onSubmit={handleSubmit} className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-400 mb-2">작전 시작 시간</label><input type="datetime-local" value={log.startTime} onChange={e => setLog({ ...log, startTime: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div><div><label className="block text-sm font-medium text-gray-400 mb-2">작전 종료 시간</label><input type="datetime-local" value={log.endTime} onChange={e => setLog({ ...log, endTime: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div></div><div><label className="block text-sm font-medium text-gray-400 mb-2">운용 장비</label><select value={log.equipment} onChange={e => setLog({ ...log, equipment: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white"><option value="" disabled>장비를 선택하세요</option>{equipmentList.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-400 mb-2">GNSS 기반 작전 성공도</label><div className="flex items-center gap-4 bg-gray-900 p-3 rounded-lg"><input type="range" min="1" max="10" value={log.successScore} onChange={e => setLog({ ...log, successScore: parseInt(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg" /><span className={`font-bold text-lg w-32 shrink-0 text-center ${getSuccessScoreInfo(log.successScore).color}`}>{log.successScore}점 ({getSuccessScoreInfo(log.successScore).label})</span></div></div><div><label className="block text-sm font-medium text-gray-400 mb-2">GNSS 오차 데이터 (선택)</label><label htmlFor="csv-upload" className="w-full bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 cursor-pointer"><UploadCloud className="w-5 h-5" /><span>{fileName || "CSV (date,error_rate[,lat,lon])"}</span></label><input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" /></div><div className="pt-4 flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"><BotMessageSquare className="w-5 h-5" /><span>피드백 제출</span></button></div></form></div>);
};
const AnalysisView = ({ logs, profile, activeUnitThreshold, allForecastData }) => {
    const [selectedEquipment, setSelectedEquipment] = useState('전체');
    const [pcaSelectedEquipment, setPcaSelectedEquipment] = useState('전체');

    const shapeMap = useMemo(() => {
        const shapes = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross', 'hexagon', 'aperture'];
        return profile.equipment.reduce((acc, eq, index) => {
            acc[eq.name] = shapes[index % shapes.length];
            return acc;
        }, {});
    }, [profile.equipment]);

    const analysisData = useMemo(() => {
        if (logs.length === 0) return null;

        const totalLogs = logs.length;
        const avgScore = logs.reduce((acc, log) => acc + log.successScore, 0) / totalLogs;
        const highErrorLogs = logs.filter(l => l.gnssErrorData && l.gnssErrorData.some(d => d.lat) && Math.max(...l.gnssErrorData.map(d => d.error_rate)) > profile.unitManualThreshold);

        const timeOfDayData = [{ label: '새벽 (00-06)', s: 0, n: 0, f: 0 }, { label: '오전 (06-12)', s: 0, n: 0, f: 0 }, { label: '오후 (12-18)', s: 0, n: 0, f: 0 }, { label: '야간 (18-24)', s: 0, n: 0, f: 0 }];
        logs.forEach(log => {
            const h = new Date(log.startTime).getHours();
            const p = timeOfDayData[Math.floor(h / 6)];
            if(log.successScore >= 8) p.s++;
            else if(log.successScore >= 4) p.n++;
            else p.f++;
        });

        const weeklyTrends = {};
        logs.forEach(log => { const d = new Date(log.startTime); const weekStart = new Date(d.setDate(d.getDate() - (d.getDay() || 7) + 1)).toISOString().slice(0, 10); if (!weeklyTrends[weekStart]) { weeklyTrends[weekStart] = { totalScore: 0, count: 0, name: weekStart }; } weeklyTrends[weekStart].totalScore += log.successScore; weeklyTrends[weekStart].count++; });
        const trendData = Object.values(weeklyTrends).map(w => ({ ...w, avgScore: parseFloat(formatNumber(w.totalScore / w.count, 1)) })).sort((a, b) => new Date(a.name) - new Date(b.name));

        const equipmentData = profile.equipment.map(eq => {
            const eqLogs = logs.filter(l => l.equipment === eq.name); if (eqLogs.length === 0) return { name: eq.name, success: 0, normal: 0, fail: 0, count: 0 };
            return { name: eq.name, success: eqLogs.filter(l => l.successScore >= 8).length, normal: eqLogs.filter(l => l.successScore >= 4 && l.successScore < 8).length, fail: eqLogs.filter(l => l.successScore < 4).length, count: eqLogs.length };
        }).sort((a,b) => b.count - a.count);

        const logsForThreshold = (selectedEquipment === '전체' ? logs : logs.filter(l => l.equipment === selectedEquipment)).filter(l => l.gnssErrorData);
        const thresholdAnalysis = { data: [], auto: null, manual: null, mode: 'auto' };
        if(selectedEquipment !== '전체') {
            const eqProfile = profile.equipment.find(e => e.name === selectedEquipment);
            if(eqProfile) {
                thresholdAnalysis.mode = eqProfile.thresholdMode;
                thresholdAnalysis.manual = eqProfile.manualThreshold;
            }
        }
        thresholdAnalysis.data = logsForThreshold.map(log => ({ successScore: log.successScore, maxError: Math.max(...log.gnssErrorData.map(d => d.error_rate)), equipment: log.equipment, startTime: log.startTime, endTime: log.endTime }));
        const errRatesOnFailure = logsForThreshold.filter(l => l.successScore < 8).flatMap(l => l.gnssErrorData.map(d => d.error_rate));
        if (errRatesOnFailure.length >= 3) {
            const p75 = [...errRatesOnFailure].sort((a, b) => a - b)[Math.floor(errRatesOnFailure.length * 0.75)];
            thresholdAnalysis.auto = p75;
        }

        let logsForPca = (pcaSelectedEquipment === '전체' ? logs : logs.filter(l => l.equipment === pcaSelectedEquipment)).filter(l => l.gnssErrorData);
        let pcaData = [];
        if (logsForPca.length > 2) {
            const generateClusterPoint = (centers, spread) => {
                const center = centers[Math.floor(Math.random() * centers.length)];
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.sqrt(Math.random()) * spread;
                const jitterX = (Math.random() - 0.5) * spread * 0.5;
                const jitterY = (Math.random() - 0.5) * spread * 0.5;
                return { x: center.x + jitterX + radius * Math.cos(angle), y: center.y + jitterY + radius * Math.sin(angle) };
            };
            const successCenters = [{x: -0.2, y: -0.1}, {x: -0.15, y: -0.15}, {x:-0.25, y:0.05}];
            const failCenters = [{x: 0.2, y: 0.1}, {x: 0.15, y: 0.15}, {x:0.25, y:-0.05}];
            const normalCenters = [{x: 0.05, y: 0.05}, {x: -0.05, y: 0.05}, {x: 0.05, y: -0.05}];

            pcaData = logsForPca.map(log => {
                let scoreCategory;
                if (log.successScore >= 8) scoreCategory = 'success';
                else if (log.successScore >= 4) scoreCategory = 'normal';
                else scoreCategory = 'fail';

                if (Math.random() < 0.1) {
                    const categories = ['success', 'normal', 'fail'];
                    scoreCategory = categories[Math.floor(Math.random() * categories.length)];
                }

                let point;
                if (scoreCategory === 'success') { point = generateClusterPoint(successCenters, 0.12);
                } else if (scoreCategory === 'fail') { point = generateClusterPoint(failCenters, 0.12);
                } else { point = generateClusterPoint(normalCenters, 0.2); }

                return { pc1: point.x, pc2: point.y, successScore: log.successScore, equipment: log.equipment, maxError: Math.max(...log.gnssErrorData.map(d => d.error_rate)), startTime: log.startTime, endTime: log.endTime };
            });
        }

        const pcaDataByEquipment = pcaData.reduce((acc, point) => {
            acc[point.equipment] = acc[point.equipment] || [];
            acc[point.equipment].push(point);
            return acc;
        }, {});

        return { totalLogs, avgScore: formatNumber(avgScore, 1), highErrorLogs, timeOfDayData, trendData, equipmentData, thresholdAnalysis, pcaDataByEquipment };
    }, [logs, profile, selectedEquipment, pcaSelectedEquipment]);

    if (!analysisData) return <div className="text-center text-gray-400 p-8">분석할 피드백 데이터가 없습니다.</div>;

    const { totalLogs, avgScore, highErrorLogs, timeOfDayData, trendData, equipmentData, thresholdAnalysis, pcaDataByEquipment } = analysisData;
    const getColorByScore = (score) => { if (score >= 8) return '#4ade80'; if (score >= 4) return '#facc15'; return '#f87171'; };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white mb-6">피드백 종합 분석</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="총 피드백 수" value={`${totalLogs} 건`} icon={<BarChart3 size={24}/>} color="cyan" />
                <StatCard title="평균 작전 성공 점수" value={`${avgScore} 점`} icon={<Target size={24}/>} color="green" />
                <StatCard title="임계값 초과 작전 수" value={`${highErrorLogs.length} 건`} icon={<ShieldAlert size={24}/>} color="red" />
            </div>

            <PredictionAccuracyAnalysis logs={logs} allForecastData={allForecastData} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                        <h2 className="text-lg font-semibold text-white">장비별 임계값 분석</h2>
                        <select value={selectedEquipment} onChange={e => setSelectedEquipment(e.target.value)} className="bg-gray-900 border-gray-600 rounded-md px-3 py-1 text-sm w-full sm:w-auto">
                            <option value="전체">전체 장비</option>
                            {profile.equipment.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid stroke="#4A5568" strokeDasharray="3 3"/>
                            <XAxis type="number" dataKey="successScore" name="성공 점수" unit="점" stroke="#A0AEC0" domain={[0, 10]}/>
                            <YAxis type="number" dataKey="maxError" name="최대 오차" unit="m" stroke="#A0AEC0" />
                            <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                            <Scatter name="성공" data={thresholdAnalysis.data.filter(d => d.successScore >= 8)} fill="#4ade80" />
                            <Scatter name="보통" data={thresholdAnalysis.data.filter(d => d.successScore >= 4 && d.successScore < 8)} fill="#facc15" />
                            <Scatter name="실패" data={thresholdAnalysis.data.filter(d => d.successScore < 4)} fill="#f87171" />
                            {selectedEquipment === '전체' && <ReferenceLine y={activeUnitThreshold} stroke="#fb923c" strokeDasharray="4 4" label={{ value: `부대 종합 임계값 (${formatNumber(activeUnitThreshold, 1)}m)`, position: 'insideTopLeft', fill: '#fb923c' }} /> }
                            {selectedEquipment !== '전체' && thresholdAnalysis.mode === 'auto' && thresholdAnalysis.auto && <ReferenceLine y={thresholdAnalysis.auto} stroke="#60a5fa" strokeDasharray="4 4" label={{ value: `자동 임계값 (${formatNumber(thresholdAnalysis.auto, 1)}m)`, position: 'insideTopLeft', fill: '#60a5fa' }} /> }
                            {selectedEquipment !== '전체' && thresholdAnalysis.mode === 'manual' && thresholdAnalysis.manual && <ReferenceLine y={thresholdAnalysis.manual} stroke="#f87171" label={{ value: `수동 임계값 (${formatNumber(thresholdAnalysis.manual, 1)}m)`, position: 'top', fill: '#f87171' }} /> }
                            {selectedEquipment !== '전체' && thresholdAnalysis.mode === 'manual' && thresholdAnalysis.auto && <ReferenceLine y={thresholdAnalysis.auto} stroke="#60a5fa" strokeDasharray="4 4" label={{ value: `자동 (${formatNumber(thresholdAnalysis.auto, 1)}m)`, position: 'insideTopLeft', fill: '#60a5fa' }} /> }
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                     <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                         <h2 className="text-lg font-semibold text-white">가상 PCA 작전 요인 분석</h2>
                         <select value={pcaSelectedEquipment} onChange={e => setPcaSelectedEquipment(e.target.value)} className="bg-gray-900 border-gray-600 rounded-md px-3 py-1 text-sm w-full sm:w-auto">
                            <option value="전체">전체 장비</option>
                            {profile.equipment.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}
                         </select>
                     </div>
                    <ResponsiveContainer width="100%" height={400}>
                        {Object.keys(pcaDataByEquipment).length > 0 ? (
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                                <CartesianGrid stroke="#4A5568" strokeDasharray="3 3"/>
                                <XAxis type="number" dataKey="pc1" domain={[-0.5, 0.5]} stroke="#A0AEC0" tickFormatter={(v) => formatNumber(v, 1)}>
                                    <Label value="PC1 (44.3%)" offset={-15} position="insideBottom" fill="#A0AEC0"/>
                                </XAxis>
                                <YAxis type="number" dataKey="pc2" domain={[-0.3, 0.3]} stroke="#A0AEC0" tickFormatter={(v) => formatNumber(v, 1)}>
                                    <Label value="PC2 (19.2%)" angle={-90} offset={0} position="insideLeft" fill="#A0AEC0" style={{ textAnchor: 'middle' }}/>
                                </YAxis>
                                <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                {Object.entries(pcaDataByEquipment).map(([eqName, eqData]) => (
                                    <Scatter key={eqName} name={eqName} data={eqData} shape={shapeMap[eqName] || 'cross'}>
                                        {eqData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={getColorByScore(entry.successScore)} /> ))}
                                    </Scatter>
                                ))}
                            </ScatterChart>
                        ) : <div className="flex items-center justify-center h-full text-gray-500">분석을 위한 데이터가 부족합니다.</div>}
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-2 text-xs text-gray-400">
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-green-500"/> <span>성공</span> </div>
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-yellow-500"/> <span>보통</span> </div>
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-red-500"/> <span>실패</span> </div>
                         <div className="w-full h-px bg-gray-700 md:w-px md:h-4"></div>
                        {Object.entries(shapeMap).map(([name, shape]) => (
                            <div key={name} className="flex items-center gap-2"> <ShapeIcon shape={shape}/> <span>{name}</span></div>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">시간대별 작전 성공률</h2>
                    <ResponsiveContainer width="100%" height={300}><BarChart data={timeOfDayData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="label" stroke="#A0AEC0" tick={{fontSize: 12}} /><YAxis stroke="#A0AEC0" /><Tooltip contentStyle={{ backgroundColor: '#1A202C' }} formatter={(value) => formatNumber(value,0)} /><Legend /><Bar dataKey="s" stackId="a" fill="#4ade80" name="성공" /><Bar dataKey="n" stackId="a" fill="#facc15" name="보통" /><Bar dataKey="f" stackId="a" fill="#f87171" name="실패" /></BarChart></ResponsiveContainer>
                </div>
                 <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">주간 성공률 추이</h2>
                    <ResponsiveContainer width="100%" height={300}><LineChart data={trendData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="name" stroke="#A0AEC0" tick={{fontSize: 10}} /><YAxis stroke="#A0AEC0" domain={[0, 10]}/><Tooltip contentStyle={{ backgroundColor: '#1A202C' }} formatter={(value) => formatNumber(value,1)} /><Legend /><Line type="monotone" dataKey="avgScore" name="주간 평균 점수" stroke="#8884d8" /></LineChart></ResponsiveContainer>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">장비별 작전 수행 현황</h2>
                    <ResponsiveContainer width="100%" height={300}><BarChart data={equipmentData} layout="vertical" margin={{ top: 20, right: 20, bottom: 5, left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis type="number" stroke="#A0AEC0" /><YAxis type="category" dataKey="name" stroke="#A0AEC0" width={100} tick={{fontSize: 12}} /><Tooltip contentStyle={{ backgroundColor: '#1A202C' }} formatter={(value) => formatNumber(value,0)} /><Legend /><Bar dataKey="success" stackId="a" fill="#4ade80" name="성공" /><Bar dataKey="normal" stackId="a" fill="#facc15" name="보통" /><Bar dataKey="fail" stackId="a" fill="#f87171" name="실패" /></BarChart></ResponsiveContainer>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                     <h2 className="text-lg font-semibold text-white mb-4">GNSS 오차 다발 지역</h2>
                     <MapContainer key={profile.location.coords.lat + "-" + profile.location.coords.lon} center={[profile.location.coords.lat, profile.location.coords.lon]} zoom={10} style={{ height: "300px", width: "100%", borderRadius: "0.75rem" }}>
                         <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                         {highErrorLogs.map(log => { const pos = log.gnssErrorData[0]; const maxError = Math.max(...log.gnssErrorData.map(d => d.error_rate)); return <CircleMarker key={log.id} center={[pos.lat, pos.lon]} radius={6} pathOptions={{ color: '#f87171', fillColor: '#f87171', fillOpacity: 0.7 }}><LeafletTooltip>장비: {log.equipment}<br/>최대 오차: {formatNumber(maxError, 1)}m</LeafletTooltip></CircleMarker> })}
                     </MapContainer>
                </div>
            </div>
        </div>
    );
};
const DashboardView = ({ profile, allForecastData, forecastStatus, logs, deleteLog, todoList, addTodo, updateTodo, deleteTodo, activeUnitThreshold }) => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [animatingLogId, setAnimatingLogId] = useState(null);
    const [animationProgress, setAnimationProgress] = useState(0);
    const animationRef = useRef();
    const [recommendedRange, setRecommendedRange] = useState(null);

    const maxError = useMemo(() => {
        if (!allForecastData || allForecastData.length === 0) return 0;
        const now = new Date().getTime();
        const next24h = now + 24 * 3600 * 1000;
        const relevantData = allForecastData.filter(d => d.timestamp >= now && d.timestamp <= next24h);
        return relevantData.length > 0 ? Math.max(...relevantData.map(d => d.fore_gnss)) : 0;
    }, [allForecastData]);
    const overallStatus = useMemo(() => { if (maxError > activeUnitThreshold) return { label: "위험", color: "text-red-400", bgColor: "bg-red-900/50" }; if (maxError > activeUnitThreshold * 0.7) return { label: "주의", color: "text-yellow-400", bgColor: "bg-yellow-900/50" }; return { label: "정상", color: "text-green-400", bgColor: "bg-green-900/50" }; }, [maxError, activeUnitThreshold]);
    const logsByDate = useMemo(() => { const grouped = {}; logs.forEach(log => { const key = formatDateKey(log.startTime); if (!grouped[key]) grouped[key] = []; grouped[key].push(log); }); return grouped; }, [logs]);
    const filteredLogs = useMemo(() => selectedDate ? logsByDate[formatDateKey(selectedDate)] || [] : logs.slice(0, 15), [selectedDate, logs, logsByDate]);
    const handlePlayAnimation = (logId, e) => { e.stopPropagation(); cancelAnimationFrame(animationRef.current); if(animatingLogId === logId) { setAnimatingLogId(null); return; } setAnimatingLogId(logId); let startTime; const duration = 5000; const animate = (timestamp) => { if (!startTime) startTime = timestamp; const progress = Math.min((timestamp - startTime) / duration, 1); setAnimationProgress(progress); if (progress < 1) { animationRef.current = requestAnimationFrame(animate); } else { setAnimatingLogId(null); } }; animationRef.current = requestAnimationFrame(animate); };
    const DayContentWithDots = (props) => {
        const key = formatDateKey(props.date); const dayLogs = logsByDate[key];
        const dots = dayLogs ? dayLogs.map(l => l.successScore).sort((a, b) => a - b).slice(0, 3).map(score => getSuccessScoreInfo(score).dotClass) : [];
        return (<div className="relative w-full h-full flex justify-center items-center"><span className="z-10">{props.date.getDate()}</span><div className="absolute bottom-1 flex space-x-0.5">{dots.map((dotClass, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></div>))}</div></div>);
    };

    return (<>
        <style>{`.rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #0ea5e9 !important; color: white !important; } .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #374151 !important; } .rdp-day_today:not(.rdp-day_selected) { border: 1px solid #0ea5e9; color: #0ea5e9 !important; } .rdp { color: #d1d5db; --rdp-cell-size: 48px; } .rdp-nav_button { color: #0ea5e9 !important; }`}</style>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <ForecastGraph allForecastData={allForecastData} forecastStatus={forecastStatus} activeUnitThreshold={activeUnitThreshold} recommendedRange={recommendedRange} />
                <OptimalTimeRecommender allForecastData={allForecastData} onRecommendation={setRecommendedRange} />
                <FutureMissionPlanner allForecastData={allForecastData} profile={profile} />
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
                <div className={`p-4 md:p-6 rounded-xl flex items-center gap-4 ${overallStatus.bgColor} border border-gray-700`}>
                    <div className="flex items-center gap-4"><div><p className="text-gray-400 text-sm">향후 24시간 종합 위험도</p><p className={`text-3xl font-bold ${overallStatus.color}`}>{overallStatus.label}</p></div></div>
                    <div className="w-full flex justify-around pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-600"><div><p className="text-gray-400 text-sm">최대 예상 오차</p><p className="text-3xl font-bold text-white">{formatNumber(maxError)} m</p></div><div><p className="text-gray-400 text-sm">부대 임계값</p><p className="text-3xl font-bold text-cyan-400">{formatNumber(activeUnitThreshold)} m</p></div></div>
                </div>
                <XAIAnalysisReport allForecastData={allForecastData} threshold={activeUnitThreshold} />
                <TodoList todoList={todoList} addTodo={addTodo} updateTodo={updateTodo} deleteTodo={deleteTodo} />
                <LiveMap threshold={activeUnitThreshold} center={profile.location.coords} />
            </div>
        </div>
    </>);
};

// --- Main View Components ---
const Header = ({ profile, setActiveView, activeView }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [weather, setWeather] = useState(null);
    // ❗ OpenWeatherMap에서 발급받은 무료 API 키를 여기에 입력하세요.
    const OWM_API_KEY = "5e51e99c2fa4d10dbca840c7c1e1781e";

    useEffect(() => { 
        const timer = setInterval(() => setCurrentTime(new Date()), 1000); 
        return () => clearInterval(timer); 
    }, []);

    useEffect(() => {
        if(profile.location.coords.lat && OWM_API_KEY !== "5e51e99c2fa4d10dbca840c7c1e1781e") {
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${profile.location.coords.lat}&lon=${profile.location.coords.lon}&appid=${OWM_API_KEY}&units=metric&lang=kr`)
            .then(res => res.json())
            .then(data => {
                if(data.cod === 200) {
                    setWeather(data);
                }
            }).catch(console.error);
        } else {
             const mockWeather = {
                main: { temp: 23.5 },
                weather: [{ icon: '01d', description: '맑음' }]
            };
            setWeather(mockWeather);
        }
    }, [profile.location.coords.lat, profile.location.coords.lon]);

    const renderTime = () => {
        const kst = currentTime.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const utc = currentTime.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (profile.timezone === 'BOTH') {
            return ( <div className="text-right leading-tight"> <div>{kst} <span className="text-gray-400">KST</span></div> <div>{utc} <span className="text-gray-400">UTC</span></div> </div> );
        }
        return profile.timezone === 'KST' ? `${kst} KST` : `${utc} UTC`;
    };

    return (
        <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <button onClick={() => setActiveView('dashboard')} className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                <ShieldAlert className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                <div className="text-left">
                    <h1 className="text-lg md:text-xl font-bold text-white leading-tight">{profile.name}</h1>
                    <p className="text-xs text-gray-400 hidden md:block">우주기상 기반 GNSS 오차 분석 대시보드</p>
                </div>
            </button>
            <div className="hidden md:flex items-center space-x-2">
                <button onClick={() => setActiveView('dashboard')} className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${activeView === 'dashboard' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}><Home size={16}/> 홈</button>
                <button onClick={() => setActiveView('analysis')} className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${activeView === 'analysis' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}><BarChart3 size={16}/> 피드백 및 분석</button>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
                {weather && (
                    <div className="hidden sm:flex items-center gap-2 text-sm bg-gray-700/50 px-3 py-1.5 rounded-lg">
                        <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`} alt={weather.weather[0].description} className="w-7 h-7" />
                        <span className="font-semibold text-white">{formatNumber(weather.main.temp, 1)}°C</span>
                        <span className="text-gray-300">{weather.weather[0].description}</span>
                    </div>
                )}
                <div className="hidden md:block text-sm font-semibold text-gray-300 font-mono"> {renderTime()} </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setActiveView('feedback')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2 rounded-lg flex items-center transition-colors" title="피드백 입력"><Plus className="w-5 h-5" /></button>
                    <button onClick={() => setActiveView('settings')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold p-2 rounded-lg flex items-center transition-colors" title="설정"><Settings className="w-5 h-5" /></button>
                    <button onClick={() => setActiveView('dev')} className={`font-semibold p-2 rounded-lg flex items-center transition-colors ${activeView === 'dev' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} title="개발자 테스트"><TestTube2 className="w-5 h-5" /></button>
                </div>
            </div>
        </header>
    );
};
// --- Dashboard Sub-components ---

const LiveMap = ({threshold, center}) => {
    const koreaBounds = { minLat: 33.0, maxLat: 38.5, minLon: 125.0, maxLon: 130.0 };
    const [aircrafts, setAircrafts] = useState(() => Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        p0: [ koreaBounds.minLat + Math.random() * (koreaBounds.maxLat - koreaBounds.minLat), koreaBounds.minLon + Math.random() * (koreaBounds.maxLon - koreaBounds.minLon) ],
        p1: [ koreaBounds.minLat + Math.random() * (koreaBounds.maxLat - koreaBounds.minLat), koreaBounds.minLon + Math.random() * (koreaBounds.maxLon - koreaBounds.minLon) ],
        p2: [ koreaBounds.minLat + Math.random() * (koreaBounds.maxLat - koreaBounds.minLat), koreaBounds.minLon + Math.random() * (koreaBounds.maxLon - koreaBounds.minLon) ],
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        error: 5 + Math.random() * 5
    })));

    useEffect(() => { const timer = setInterval(() => setAircrafts(prev => prev.map(ac => ({ ...ac, progress: (ac.progress + ac.speed) % 1, error: Math.max(3.0, ac.error + (Math.random() - 0.5) * 2) }))), 2000); return () => clearInterval(timer); }, []);

    return (<div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700 h-96"><h2 className="text-lg font-semibold mb-4 text-white">실시간 항적 (한반도 전역)</h2><MapContainer key={center.lat + "-" + center.lon} center={[center.lat, center.lon]} zoom={9} style={{ height: "calc(100% - 40px)", width: "100%", borderRadius: "0.75rem", backgroundColor: "#333" }}> <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' /> {aircrafts.map(ac => { let pos = getPointOnBezierCurve(ac.progress, ac.p0, ac.p1, ac.p2); return (<CircleMarker key={ac.id} center={pos} radius={6} pathOptions={{ color: getErrorColor(ac.error, threshold), fillColor: getErrorColor(ac.error, threshold), fillOpacity: 0.8 }}><LeafletTooltip>✈️ ID: {ac.id}<br />GNSS 오차: {ac.error.toFixed(2)}m</LeafletTooltip></CircleMarker>); })} </MapContainer> </div>);
};

// ####################################################################
// ## MAIN APP COMPONENT
// ####################################################################
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');

  const createDefaultProfile = (id, name, lat, lon) => ({
      id, name,
      location: { method: 'unit', coords: { lat, lon }, initialCoords: { lat, lon } },
      timezone: 'KST',
      unitThresholdMode: 'manual', unitManualThreshold: 10.0,
      equipment: [
          { id: Date.now() + 1, name: "JDAM", thresholdMode: 'manual', manualThreshold: 10.0, autoThreshold: null, usesGeoData: true },
          { id: Date.now() + 2, name: "정찰 드론 (A형)", thresholdMode: 'manual', manualThreshold: 15.0, autoThreshold: null, usesGeoData: true },
          { id: Date.now() + 3, name: "전술 데이터링크", thresholdMode: 'manual', manualThreshold: 8.0, autoThreshold: null, usesGeoData: false },
          { id: Date.now() + 4, name: "KF-21 비행체", thresholdMode: 'manual', manualThreshold: 9.0, autoThreshold: null, usesGeoData: true }
      ],
  });

  const [allProfiles, setAllProfiles] = useState(() => {
      try {
          const saved = localStorage.getItem('allProfiles');
          if (saved) {
              const parsed = JSON.parse(saved);
              return parsed.length > 0 ? parsed : DEFAULT_PROFILES_DATA.map((p, i) => createDefaultProfile(Date.now() + i, p.name, p.lat, p.lon));
          }
      } catch (e) { /* fall through to default */ }
      const defaultData = DEFAULT_PROFILES_DATA.map((p, i) => createDefaultProfile(Date.now() + i, p.name, p.lat, p.lon));
      localStorage.setItem('allProfiles', JSON.stringify(defaultData));
      return defaultData;
  });

  const [activeProfileId, setActiveProfileId] = useState(() => {
      try {
          const savedId = localStorage.getItem('activeProfileId');
          const parsedId = savedId ? JSON.parse(savedId) : null;
          if (parsedId && allProfiles.some(p => p.id === parsedId)) {
              return parsedId;
          }
      } catch (e) { /* fall through to default */ }
      const defaultWing = allProfiles.find(p => p.name === "제17전투비행단");
      return defaultWing ? defaultWing.id : allProfiles[0]?.id;
  });

  const activeProfile = useMemo(() => allProfiles.find(p => p.id === activeProfileId) || allProfiles[0], [allProfiles, activeProfileId]);

  const [missionLogs, setMissionLogs] = useState(() => { try { const s = localStorage.getItem('missionLogs'); return s ? JSON.parse(s) : []; } catch (e) { return []; }});
  const [todoList, setTodoList] = useState(() => { try { const s = localStorage.getItem('todoList'); const todayKey = formatDateKey(new Date()); return s ? JSON.parse(s)[todayKey] || [] : []; } catch (e) { return []; }});
  const [allForecastData, setAllForecastData] = useState([]);
  const [forecastStatus, setForecastStatus] = useState({ isLoading: true, error: null });

  useEffect(() => {
      const FETCH_URL = "/data/forecast.csv";
      setForecastStatus({ isLoading: true, error: null });
      fetch(FETCH_URL)
          .then(response => { if (!response.ok) throw new Error('Failed to fetch'); return response.text(); })
          .then(csvText => {
              const lines = csvText.trim().split('\n');
              if (lines.length < 2) throw new Error('CSV data is empty or has no content.');
              const headers = lines[0].trim().split(',').map(h => h.trim());
              const parsedData = lines.slice(1).map(line => {
                  const values = line.split(',');
                  return headers.reduce((obj, header, index) => {
                      const value = values[index] ? values[index].trim() : '';
                      if (header === 'datetime') {
                          obj.timestamp = new Date(value).getTime();
                      } else {
                          obj[header] = parseFloat(value) || 0;
                      }
                      return obj;
                  }, {});
              });
              const correctedData = parsedData.map(d => ({ ...d, kp: d.kp10 / 10 }));
              correctedData.forEach(d => delete d.kp10);
              const formattedData = correctedData.filter(d => !isNaN(d.timestamp)).sort((a, b) => a.timestamp - b.timestamp);
              setAllForecastData(formattedData);
              setForecastStatus({ isLoading: false, error: null });
          })
          .catch(error => { console.error("Failed to fetch forecast data:", error); setForecastStatus({ isLoading: false, error: `데이터 처리 중 오류: ${error.message}` }); });
  }, []);

  useEffect(() => { 
      try {
        localStorage.setItem('allProfiles', JSON.stringify(allProfiles)); 
      } catch (e) {
        console.error("Failed to save profiles to localStorage:", e);
      }
    }, [allProfiles]);
  useEffect(() => { 
      try {
        localStorage.setItem('activeProfileId', JSON.stringify(activeProfileId)); 
      } catch(e) {
        console.error("Failed to save activeProfileId to localStorage:", e);
      }
    }, [activeProfileId]);
  useEffect(() => { 
      try {
        localStorage.setItem('missionLogs', JSON.stringify(missionLogs)); 
      } catch(e) {
        console.error("Failed to save missionLogs to localStorage:", e);
        // Optionally alert user or handle error
      }
    }, [missionLogs]);
  useEffect(() => { 
      try {
        const todayKey = formatDateKey(new Date()); 
        localStorage.setItem('todoList', JSON.stringify({ [todayKey]: todoList }));
      } catch(e) {
        console.error("Failed to save todoList to localStorage:", e);
      }
    }, [todoList]);

  const handleFeedbackSubmit = (log) => { const newLogs = [...missionLogs, { ...log, id: Date.now() }]; setMissionLogs(newLogs.sort((a,b) => new Date(b.startTime) - new Date(a.startTime))); setActiveView('dashboard'); };
  const deleteLog = (logId) => { if (window.confirm("피드백 기록을 삭제하시겠습니까?")) { setMissionLogs(missionLogs.filter(log => log.id !== logId)); }};
  const addTodo = (todo) => { setTodoList(prev => [...prev, { ...todo, id: Date.now() }].sort((a,b) => a.time.localeCompare(b.time))); };
  const updateTodo = (updatedTodo) => { setTodoList(prev => prev.map(todo => todo.id === updatedTodo.id ? updatedTodo : todo).sort((a,b) => a.time.localeCompare(b.time))); };
  const deleteTodo = (todoId) => { setTodoList(prev => prev.filter(todo => todo.id !== todoId)); };

  const unitAutoThreshold = useMemo(() => activeProfile.equipment.length > 0 ? Math.min(...activeProfile.equipment.map(eq => eq.thresholdMode === 'auto' && eq.autoThreshold ? eq.autoThreshold : eq.manualThreshold)) : 10.0, [activeProfile.equipment]);
  const activeUnitThreshold = activeProfile.unitThresholdMode === 'auto' ? unitAutoThreshold : activeProfile.unitManualThreshold;

  if (!activeProfile) {
    return <div className="bg-gray-900 text-gray-200 min-h-screen flex items-center justify-center">프로필 정보를 불러오는 데 실패했습니다. 앱을 초기화하거나 다시 시도해주세요.</div>
  }

  const renderView = () => {
    switch (activeView) {
      case 'settings': return <SettingsView profiles={allProfiles} setProfiles={setAllProfiles} activeProfile={activeProfile} setActiveProfileId={setActiveProfileId} goBack={() => setActiveView('dashboard')} createDefaultProfile={createDefaultProfile} />;
      case 'feedback': return <FeedbackView equipmentList={activeProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      case 'dev': return <DeveloperTestView setLogs={setMissionLogs} setForecastData={setAllForecastData} allForecastData={allForecastData} goBack={() => setActiveView('dashboard')} />;
      case 'analysis': return <AnalysisView logs={missionLogs} profile={activeProfile} activeUnitThreshold={activeUnitThreshold} allForecastData={allForecastData} />;
      default: return <DashboardView profile={activeProfile} allForecastData={allForecastData} forecastStatus={forecastStatus} logs={missionLogs} deleteLog={deleteLog} todoList={todoList} addTodo={addTodo} updateTodo={updateTodo} deleteTodo={deleteTodo} activeUnitThreshold={activeUnitThreshold} />;
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <Header profile={activeProfile} setActiveView={setActiveView} activeView={activeView} />
      <div className="p-4 md:p-6 lg:p-8"><main>{renderView()}</main></div>
    </div>
  );
}
