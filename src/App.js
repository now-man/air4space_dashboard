import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, BarChart, Bar, ScatterChart, Scatter, Cell, Label } from 'recharts';
import { DayPicker } from 'react-day-picker';
import { ko } from 'date-fns/locale';
import { Zap, Settings, ShieldAlert, BotMessageSquare, Plus, Trash2, Save, ArrowLeft, UploadCloud, TestTube2, BrainCircuit, Eraser, Lightbulb, RefreshCw, PlayCircle, MapPin, Edit3, Compass, Activity, Calendar as CalendarIcon, MoreVertical, X, Edit, Home, BarChart3, Target, PlusCircle, Pencil, Square, Circle, Triangle, Star, Diamond, Hexagon, Aperture, Search, ChevronDown, Sun, Wind, Cloud, Thermometer, Droplets } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'react-day-picker/dist/style.css';

// --- Helper Functions ---
const formatNumber = (num, places = 2) => num !== null && num !== undefined ? num.toFixed(places) : 'N/A';
const getErrorColor = (error, threshold = 10.0) => { if (error > threshold) return '#f87171'; if (error > threshold * 0.7) return '#facc15'; return '#4ade80'; };
const getSuccessScoreInfo = (score) => { if (score >= 8) return { label: "성공", color: "text-green-400", dotClass: "bg-green-500" }; if (score >= 4 && score < 8) return { label: "보통", color: "text-yellow-400", dotClass: "bg-yellow-500" }; return { label: "실패", color: "text-red-400", dotClass: "bg-red-500" }; };

const formatDate = (dateString, format = 'full') => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (format === 'time') {
        const hour = String(date.getHours()).padStart(2, '0');
        return `${hour}:00`;
    }
    const options = {
        full: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false },
        date: { year: 'numeric', month: '2-digit', day: '2-digit' }
    };
    return new Intl.DateTimeFormat('ko-KR', options[format]).format(date);
};

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
const WeatherForecastPopover = ({ profile, apiKey, onClose, position }) => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const popoverRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);
    
    useEffect(() => {
        if (profile.location.coords.lat && apiKey !== "5e51e99c2fa4d10dbca840c7c1e1781e") {
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${profile.location.coords.lat}&lon=${profile.location.coords.lon}&appid=${apiKey}&units=metric&lang=kr`)
            .then(res => res.json())
            .then(data => {
                if (data && data.list) {
                    setForecast(data.list.slice(0, 8)); // Get next 24 hours (8 * 3-hour intervals)
                } else {
                    console.error("Weather forecast data is not in expected format:", data);
                }
                setLoading(false);
            }).catch(err => {
                console.error("Weather API fetch error:", err);
                setLoading(false);
            });
        } else {
            const mockData = Array.from({length: 8}).map((_, i) => ({
                dt: (new Date().getTime() / 1000) + i * 3600 * 3,
                main: { temp: 20 + Math.random() * 5 },
                weather: [{icon: '02d', description: '구름 조금'}],
                pop: Math.random()
            }));
            setForecast(mockData);
            setLoading(false);
        }
    }, [profile.location.coords, apiKey]);
    
    if (!position) return null;

    return createPortal(
        <div ref={popoverRef} className="absolute z-50 bg-gray-800 border border-gray-600 rounded-xl p-4 w-full max-w-lg shadow-lg" style={{ top: `${position.bottom + 8}px`, right: `${window.innerWidth - position.right}px`}}>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">시간대별 예보 ({profile.name})</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X size={20}/></button>
            </div>
            {loading ? <p className="text-gray-300">로딩 중...</p> : !forecast ? <p className="text-red-400">예보를 불러올 수 없습니다.</p> :
            <div className="space-y-2 max-h-80 overflow-y-auto">
                {forecast.map(hour => (
                    <div key={hour.dt} className="grid grid-cols-4 items-center text-center p-2 bg-gray-900/50 rounded-md text-white">
                        <span className="font-semibold">{formatDate(hour.dt * 1000, 'time')}</span>
                        <div className="flex items-center justify-center gap-1">
                            <img src={`https://openweathermap.org/img/wn/${hour.weather[0].icon}.png`} alt={hour.weather[0].description} className="w-8 h-8"/>
                            <span className="w-16 text-xs">{hour.weather[0].description}</span>
                        </div>
                        <span className="flex items-center justify-center gap-1"><Thermometer size={16} className="text-red-400"/> {formatNumber(hour.main.temp, 1)}°C</span>
                        <span className="flex items-center justify-center gap-1"><Droplets size={16} className="text-blue-400"/> {Math.round(hour.pop * 100)}%</span>
                    </div>
                ))}
            </div>
            }
        </div>,
        document.body
    );
};
const SpaceWeatherAlert = ({ alertInfo, onClose }) => {
    if (!alertInfo) return null;
    return createPortal(
        <div className="fixed top-24 right-8 z-50 bg-red-800/90 border border-red-500 text-white p-4 rounded-lg shadow-2xl max-w-sm animate-pulse">
            <div className="flex items-start gap-3">
                <ShieldAlert size={24} className="text-yellow-300 mt-1"/>
                <div>
                    <h3 className="font-bold">{alertInfo.title}</h3>
                    <p className="text-sm">{alertInfo.message}</p>
                </div>
                <button onClick={onClose} className="p-1 -mr-2 -mt-2 rounded-full hover:bg-red-700"><X size={18}/></button>
            </div>
        </div>,
        document.body
    )
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
const FeedbackMap = ({ data, equipment, isAnimating, animationProgress, showClouds, isRaining }) => { 
    const OWM_API_KEY = "5e51e99c2fa4d10dbca840c7c1e1781e";
    const activeThreshold = equipment.thresholdMode === 'auto' && equipment.autoThreshold ? equipment.autoThreshold : equipment.manualThreshold; 
    const bounds = useMemo(() => data.length > 0 ? L.latLngBounds(data.map(p => [p.lat, p.lon])) : null, [data]); 
    const animatedPosition = useMemo(() => { if(!isAnimating || data.length < 2) return null; const totalPoints = data.length - 1; const currentIndex = Math.min(Math.floor(animationProgress * totalPoints), totalPoints - 1); const nextIndex = Math.min(currentIndex + 1, totalPoints); const segmentProgress = (animationProgress * totalPoints) - currentIndex; const p1 = data[currentIndex]; const p2 = data[nextIndex]; return { lat: p1.lat + (p2.lat - p1.lat) * segmentProgress, lon: p1.lon + (p2.lon - p1.lon) * segmentProgress, error: p1.error_rate }; }, [isAnimating, animationProgress, data]); 

    const cloudOpacity = isAnimating ? 0.3 + 0.5 * Math.abs(Math.sin(animationProgress * Math.PI * 8)) : 0.8;
    
    return (
        <div className="h-56 rounded-lg overflow-hidden relative">
            <MapContainer center={data[0] ? [data[0].lat, data[0].lon] : [36.6, 127.4]} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                {(showClouds || isRaining) && OWM_API_KEY !== "5e51e99c2fa4d10dbca840c7c1e1781e" && (
                    <>
                        <TileLayer url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`} attribution='&copy; OpenWeatherMap' zIndex={2} opacity={0.5}/>
                        <TileLayer className="weather-tile-layer" key={cloudOpacity} url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`} attribution='&copy; OpenWeatherMap' zIndex={3} opacity={isRaining ? 0.9 : cloudOpacity}/>
                    </>
                )}
                {isAnimating ? (<Polyline positions={data.map(p => [p.lat, p.lon])} color="#6b7280" weight={3} dashArray="5, 10" />) : (data.slice(1).map((p, i) => (<Polyline key={i} positions={[[data[i].lat, data[i].lon], [p.lat, p.lon]]} color={getErrorColor(data[i].error_rate, activeThreshold)} weight={5} />)))}
                {animatedPosition && <CircleMarker center={animatedPosition} radius={7} pathOptions={{ color: '#fff', fillColor: getErrorColor(animatedPosition.error, activeThreshold), weight: 2, fillOpacity: 1 }} />}
                <AutoFitBounds bounds={bounds} />
            </MapContainer>
        </div>
    ); 
};
const FeedbackChart = ({ data, equipment }) => { const activeThreshold = equipment.thresholdMode === 'auto' && equipment.autoThreshold ? equipment.autoThreshold : equipment.manualThreshold; const segments = useMemo(() => { const segs = []; let cur = null; data.forEach(d => { if (d.error_rate > activeThreshold) { if (!cur) cur = { x1: d.date, x2: d.date }; else cur.x2 = d.date; } else { if (cur) { segs.push(cur); cur = null; } } }); if (cur) segs.push(cur); return segs; }, [data, activeThreshold]); return (<div className="mt-4 h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="date" stroke="#A0AEC0" tick={{ fontSize: 10 }} tickFormatter={(tick) => formatDate(tick, 'time')} /> <YAxis stroke="#A0AEC0" tick={{ fontSize: 10 }} domain={[0, 'dataMax + 2']} tickFormatter={(tick) => formatNumber(tick, 1)} /> <Tooltip contentStyle={{ backgroundColor: '#1A202C' }} labelFormatter={(label) => formatDate(label)} formatter={(value) => formatNumber(value)} /> <Line type="monotone" dataKey="error_rate" name="GNSS 오차(m)" stroke="#F56565" strokeWidth={2} dot={false} /> {segments.map((seg, i) => <ReferenceArea key={i} x1={seg.x1} x2={seg.x2} stroke="none" fill="#f56565" fillOpacity={0.3} />)} <ReferenceLine y={activeThreshold} label={{ value: "임계값", position: 'insideTopLeft', fill: '#4FD1C5', fontSize: 10 }} stroke="#4FD1C5" strokeDasharray="3 3" /> </LineChart></ResponsiveContainer></div>); };
const ExpandedLogView = ({ log, profile, animatingLogId, animationProgress, handlePlayAnimation, isRaining }) => {
    const [showClouds, setShowClouds] = useState(true);
    const equipment = profile.equipment.find(e => e.name === log.equipment);
    const hasGeoData = log.gnssErrorData && log.gnssErrorData[0]?.lat !== undefined;

    return (
        <div className="pt-2 mt-2 border-t border-gray-700 space-y-2">
            {log.gnssErrorData && <FeedbackChart data={log.gnssErrorData} equipment={equipment} />}
            {hasGeoData && (
                <>
                    <div className="relative">
                        <FeedbackMap
                            data={log.gnssErrorData}
                            equipment={equipment}
                            isAnimating={animatingLogId === log.id}
                            animationProgress={animationProgress}
                            showClouds={showClouds}
                            isRaining={isRaining}
                        />
                        <button onClick={(e) => handlePlayAnimation(log.id, e)} className="absolute top-2 right-2 z-[1000] bg-sky-500 text-white p-2 rounded-full hover:bg-sky-400 shadow-lg transition-transform hover:scale-110">
                            <PlayCircle size={20} className={animatingLogId === log.id ? 'animate-pulse' : ''} />
                        </button>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={showClouds}
                                onChange={e => setShowClouds(e.target.checked)}
                                className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500 rounded"
                            />
                            기상 타임랩스 표시
                        </label>
                    </div>
                </>
            )}
        </div>
    );
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
const OptimalTimeRecommender = ({ allForecastData, onRecommendation, activeUnitThreshold }) => {
    const [searchStart, setSearchStart] = useState(() => toLocalISOString(new Date()));
    const [searchEnd, setSearchEnd] = useState(() => toLocalISOString(new Date(new Date().getTime() + 48 * 3600 * 1000)));
    const [duration, setDuration] = useState(3);
    const [result, setResult] = useState(null);

    const getKpStatus = (kp) => {
        if (kp < 4) return { text: "안정", color: "text-green-400" };
        if (kp < 6) return { text: "보통", color: "text-yellow-400" };
        return { text: "불안", color: "text-red-400" };
    };

    const handleRecommend = () => {
        const searchStartTs = new Date(searchStart).getTime();
        const searchEndTs = new Date(searchEnd).getTime();
        const durationInPoints = duration;

        const relevantData = allForecastData.filter(d => d.timestamp >= searchStartTs && d.timestamp <= searchEndTs);
        if (relevantData.length < durationInPoints) {
            setResult({ error: "해당 시간 범위의 예측 데이터가 작전 시간보다 짧습니다." });
            onRecommendation(null);
            return;
        }

        let minSum = Infinity;
        let bestWindow = null;

        for (let i = 0; i <= relevantData.length - durationInPoints; i++) {
            const window = relevantData.slice(i, i + durationInPoints);
            const currentSum = window.reduce((sum, d) => sum + d.fore_gnss, 0);
            if (currentSum < minSum) {
                minSum = currentSum;
                bestWindow = window;
            }
        }

        if (bestWindow) {
            const bestStartTime = bestWindow[0].timestamp;
            const recommendedEnd = bestStartTime + duration * 3600 * 1000;
            
            const avgError = minSum / duration;
            const maxError = Math.max(...bestWindow.map(d => d.fore_gnss));
            const avgKp = bestWindow.reduce((s, d) => s + d.kp, 0) / duration;
            const overallAvgError = relevantData.reduce((s,d) => s + d.fore_gnss, 0) / relevantData.length;
            const improvement = overallAvgError > 0 ? ((overallAvgError - avgError) / overallAvgError) * 100 : 0;

            setResult({ 
                time: `추천 작전 시간: ${formatDate(bestStartTime, 'full')} ~ ${formatDate(recommendedEnd, 'time')}`,
                analysis: {
                    avgError,
                    maxError,
                    avgKp,
                    kpStatus: getKpStatus(avgKp),
                    improvement,
                },
                error: null
            });
            onRecommendation({start: bestStartTime, end: recommendedEnd});
        } else {
            setResult({ error: "추천 가능한 시간대를 찾을 수 없습니다." });
            onRecommendation(null);
        }
    };

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-white">최적 작전 시간 추천 (XAI)</h2>
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
            {result && !result.error && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                    <p className="text-center text-cyan-400 font-semibold">{result.time}</p>
                    <div className="bg-gray-900/50 p-3 rounded-md text-sm">
                        <p className="text-gray-300 mb-2">
                           {parseStyledText(`해당 시간대는 탐색 기간 전체 평균 오차 대비 **약 ${formatNumber(result.analysis.improvement, 0)}% 낮은** GNSS 오차가 예측되어 작전 수행에 가장 안정적인 환경을 제공합니다.`)}
                        </p>
                        <ul className="text-gray-400 space-y-1 text-xs">
                            <li className="flex justify-between"><span>평균 예측 오차:</span> <strong>{formatNumber(result.analysis.avgError)}m</strong></li>
                            <li className="flex justify-between"><span>최대 예측 오차:</span> <strong>{formatNumber(result.analysis.maxError)}m</strong></li>
                            <li className="flex justify-between"><span>평균 Kp 지수:</span> <strong className={result.analysis.kpStatus.color}>{formatNumber(result.analysis.avgKp, 1)} ({result.analysis.kpStatus.text})</strong></li>
                        </ul>
                    </div>
                </div>
            )}
            {result && result.error && <p className="text-center text-red-400 mt-4 font-semibold">{result.error}</p>}
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
            maxError: formatNumber(maxError),
            avgError: formatNumber(avgError),
            riskRatio: formatNumber(riskRatio, 1),
            successRate: formatNumber(successRate, 1),
            threshold: formatNumber(threshold),
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
const Header = ({ profile, setActiveView, activeView, onWeatherClick }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [weather, setWeather] = useState(null);
    const weatherButtonRef = useRef(null);
    const OWM_API_KEY = "5e51e99c2fa4d10dbca840c7c1e1781e";

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchWeather = () => {
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
        };

        fetchWeather();
        const weatherInterval = setInterval(fetchWeather, 600000); // 10분마다 날씨 정보 갱신
        return () => clearInterval(weatherInterval);

    }, [profile.location.coords.lat, profile.location.coords.lon, OWM_API_KEY]);

    const renderTime = () => {
        return currentTime.toLocaleTimeString('ko-KR', {
            timeZone: 'Asia/Seoul',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
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
                    <button ref={weatherButtonRef} onClick={() => onWeatherClick(weatherButtonRef.current.getBoundingClientRect())} className="hidden sm:flex items-center gap-2 text-sm bg-gray-700/50 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                        <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`} alt={weather.weather[0].description} className="w-7 h-7" />
                        <span className="font-semibold text-white">{formatNumber(weather.main.temp, 1)}°C</span>
                        <span className="text-gray-300">{weather.weather[0].description}</span>
                    </button>
                )}
                <div className="hidden md:block text-lg font-sans font-semibold text-gray-300"> {renderTime()} </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setActiveView('feedback')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2 rounded-lg flex items-center transition-colors" title="피드백 입력"><Plus className="w-5 h-5" /></button>
                    <button onClick={() => setActiveView('settings')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold p-2 rounded-lg flex items-center transition-colors" title="설정"><Settings className="w-5 h-5" /></button>
                    <button onClick={() => setActiveView('dev')} className={`font-semibold p-2 rounded-lg flex items-center transition-colors ${activeView === 'dev' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} title="개발자 테스트"><TestTube2 className="w-5 h-5" /></button>
                </div>
            </div>
        </header>
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
        const date = new Date(tick);
        const hours = String(date.getHours()).padStart(2, '0');
        if (duration <= 2 * 24 * 3600 * 1000) {
            return `${hours}:00`;
        }
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}`;
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
const LiveMap = ({threshold, center, isRaining}) => {
    const [showClouds, setShowClouds] = useState(true);
    const koreaBounds = { minLat: 33.0, maxLat: 38.5, minLon: 125.0, maxLon: 130.0 };
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

    useEffect(() => {
        const timer = setInterval(() => {
            setAircrafts(prev => prev.map(ac => ({
                ...ac,
                progress: (ac.progress + ac.speed) % 1,
                error: Math.max(3.0, ac.error + (Math.random() - 0.5) * (isRaining ? 3.5 : 2))
            })))
        }, 2000);
        return () => clearInterval(timer);
    }, [isRaining]);

    return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700 h-96 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-white">실시간 항적 및 기상</h2>
        <div className="flex-grow relative">
            <MapContainer key={center.lat + "-" + center.lon} center={[center.lat, center.lon]} zoom={9} style={{ height: "100%", width: "100%", borderRadius: "0.75rem", backgroundColor: "#333" }}>
                 <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                 {(showClouds || isRaining) && OWM_API_KEY !== "5e51e99c2fa4d10dbca840c7c1e1781e" && (
                    <>
                        <TileLayer url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`} attribution='&copy; OpenWeatherMap' zIndex={2} opacity={0.5}/>
                        <TileLayer className="weather-tile-layer" url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`} attribution='&copy; OpenWeatherMap' zIndex={3} opacity={isRaining ? 0.9 : 0.6}/>
                    </>
                )}
                {aircrafts.map(ac => {
                    let pos = getPointOnBezierCurve(ac.progress, ac.p0, ac.p1, ac.p2);
                    return (<CircleMarker key={ac.id} center={pos} radius={6} pathOptions={{ color: getErrorColor(ac.error, threshold), fillColor: getErrorColor(ac.error, threshold), fillOpacity: 0.8 }}><LeafletTooltip>✈️ ID: {ac.id}<br />GNSS 오차: {formatNumber(ac.error)}m</LeafletTooltip></CircleMarker>);
                })}
            </MapContainer>
        </div>
        <div className="pt-2 mt-2 border-t border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                <input type="checkbox" checked={showClouds} onChange={e => setShowClouds(e.target.checked)} className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500 rounded" />
                기상 오버레이 표시
            </label>
        </div>
    </div>);
};

// ####################################################################
// ## MAIN APP COMPONENT
// ####################################################################
export default function App() {
    const [activeView, setActiveView] = useState('dashboard');
    const [isRaining, setIsRaining] = useState(false);
    const [isWeatherPopoverOpen, setIsWeatherPopoverOpen] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState(null);
    const [alertInfo, setAlertInfo] = useState(null);

    const createDefaultProfile = (id, name, lat, lon) => ({
        id, name,
        location: { method: 'unit', coords: { lat, lon }, initialCoords: { lat, lon } },
        timezone: 'KST',
        unitThresholdMode: 'manual', unitManualThreshold: 20.0,
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
        let profiles = null;
        try {
            const savedProfiles = localStorage.getItem('allProfiles');
            if (savedProfiles) profiles = JSON.parse(savedProfiles);
            
            const savedId = localStorage.getItem('activeProfileId');
            const parsedId = savedId ? JSON.parse(savedId) : null;
            if (parsedId && profiles && profiles.some(p => p.id === parsedId)) {
                return parsedId;
            }
        } catch (e) { /* fall through to default */ }
        
        const profileSource = profiles || DEFAULT_PROFILES_DATA;
        const defaultWing = profileSource.find(p => p.name === "제17전투비행단");
        return defaultWing ? defaultWing.id : (profileSource[0]?.id || null);
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
        if (!allForecastData || allForecastData.length === 0 || alertInfo ) return;

        const now = new Date().getTime();
        const next24h = now + 24 * 3600 * 1000;
        const relevantData = allForecastData.filter(d => d.timestamp >= now && d.timestamp <= next24h);
        
        const stormPoint = relevantData.find(d => d.kp >= 6);
        if (stormPoint) {
            setAlertInfo({
                title: "지자기 폭풍 경보",
                message: `${formatDate(stormPoint.timestamp, 'time')}경 Kp 지수가 ${formatNumber(stormPoint.kp, 1)}까지 상승하여 GNSS 오차 급증이 예상됩니다.`
            });
            return;
        }

        const flarePoint = relevantData.find(d => d.xrsb > 1e-5);
        if (flarePoint) {
             setAlertInfo({
                title: "태양 플레어 경보",
                message: `${formatDate(flarePoint.timestamp, 'time')}경 강력한 태양 플레어 발생으로 단파 통신 및 GNSS에 영향이 예상됩니다.`
            });
        }
    }, [allForecastData, alertInfo]);


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
            alert("로컬 저장소 공간이 부족하여 피드백 로그를 저장할 수 없습니다. 오래된 로그를 삭제하거나 브라우저 캐시를 비워주세요.");
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

    const handleWeatherClick = (position) => {
        setPopoverPosition(position);
        setIsWeatherPopoverOpen(true);
    };

    const handleClosePopover = () => {
        setIsWeatherPopoverOpen(false);
    };

    const renderView = () => {
        switch (activeView) {
            case 'settings': return <SettingsView profiles={allProfiles} setProfiles={setAllProfiles} activeProfile={activeProfile} setActiveProfileId={setActiveProfileId} goBack={() => setActiveView('dashboard')} createDefaultProfile={createDefaultProfile} />;
            case 'feedback': return <FeedbackView equipmentList={activeProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
            case 'dev': return <DeveloperTestView setLogs={setMissionLogs} setForecastData={setAllForecastData} allForecastData={allForecastData} goBack={() => setActiveView('dashboard')} setIsRaining={setIsRaining}/>;
            case 'analysis': return <AnalysisView logs={missionLogs} profile={activeProfile} activeUnitThreshold={activeUnitThreshold} allForecastData={allForecastData} />;
            default: return <DashboardView profile={activeProfile} allForecastData={allForecastData} forecastStatus={forecastStatus} logs={missionLogs} deleteLog={deleteLog} todoList={todoList} addTodo={addTodo} updateTodo={updateTodo} deleteTodo={deleteTodo} activeUnitThreshold={activeUnitThreshold} isRaining={isRaining} />;
        }
    };

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
            <Header profile={activeProfile} setActiveView={setActiveView} activeView={activeView} onWeatherClick={handleWeatherClick}/>
            <SpaceWeatherAlert alertInfo={alertInfo} onClose={() => setAlertInfo(null)}/>
            {isWeatherPopoverOpen && <WeatherForecastPopover profile={activeProfile} apiKey={"5e51e99c2fa4d10dbca840c7c1e1781e"} onClose={handleClosePopover} position={popoverPosition}/>}
            <div className="p-4 md:p-6 lg:p-8"><main>{renderView()}</main></div>
        </div>
    );
}
