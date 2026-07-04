import { useState, useEffect, useRef, useCallback } from 'react';
import { getStudents, getGroups, recordQRAttendance, getCurrentUser, getStudentsByGroup, getAttendanceByDate, getGroupsForStudent } from '../store';
import { Student, Group } from '../types';
import { QrCode, Check, AlertTriangle, Scan, Camera, Video, VideoOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { formatStudentCode } from '../utils/qrcode';

export default function QRAttendance() {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; studentName?: string } | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<{ id: string; time: number } | null>(null);
  const recentScansRef = useRef<Record<string, number>>({});

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    let loadedGroups = getGroups();
    
    // If teacher, show only their groups
    if (user?.role === 'teacher' && user.teacher_id) {
      loadedGroups = loadedGroups.filter(g => g.teacher_id === user.teacher_id);
    }
    
    setGroups(loadedGroups);
    setStudents(getStudents());
  }, []);

  // Count today's attendance
  const todayAttendance = getAttendanceByDate(new Date().toISOString().split('T')[0]);
  const groupAttendance = selectedGroup
    ? todayAttendance.filter(a => a.group_id === selectedGroup)
    : todayAttendance;

  const startCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        scannerRef.current = null;
      }

      // First make the container visible so html5-qrcode can measure it
      setCameraActive(true);

      // Wait for DOM to update and the container to be visible
      await new Promise(resolve => setTimeout(resolve, 300));

      const readerElement = document.getElementById('qr-reader');
      if (!readerElement) {
        console.error('qr-reader element not found');
        setCameraActive(false);
        return;
      }

      // Clear any leftover content from previous scanner instances
      readerElement.innerHTML = '';

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {
          // QR code scan error - ignore, keep scanning
        }
      );
    } catch (err) {
      console.error('Camera error:', err);
      setCameraActive(false);
      alert('لم يتم العثور على كاميرا أو تم رفض الإذن. تأكد من السماح باستخدام الكاميرا.');
    }
  }, [selectedGroup, students]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  const handleScan = (data: string) => {
    const cleanData = data.trim();
    if (!cleanData) return;
    const now = Date.now();

    let studentId = '';
    try {
      const parsed = JSON.parse(cleanData);
      if (parsed.type === 'student' && parsed.id) {
        studentId = parsed.id;
      }
    } catch {
      // Not JSON
    }

    // Look up student by parsed ID, exact ID, or formatted code
    const lookupKey = studentId || cleanData;
    const student = students.find(s => 
      s.id === lookupKey || 
      formatStudentCode(s.id) === lookupKey || 
      s.id === cleanData || 
      formatStudentCode(s.id) === cleanData
    );

    if (!student) {
      const notFoundKey = `notfound-${cleanData}`;
      const lastNotFoundTime = recentScansRef.current[notFoundKey] || 0;
      if (now - lastNotFoundTime < 4000) return;
      recentScansRef.current[notFoundKey] = now;

      setScanResult({ success: false, message: 'الطالب غير موجود في النظام' });
      playErrorSound();
      setManualInput('');
      setTimeout(() => setScanResult(null), 3500);
      return;
    }

    // Determine the target group
    let targetGroupId = selectedGroup;
    const studentGroups = getGroupsForStudent(student.id);

    if (!targetGroupId) {
      if (studentGroups.length > 1) {
        const multiGroupKey = `multigroup-${student.id}`;
        const lastMultiTime = recentScansRef.current[multiGroupKey] || 0;
        if (now - lastMultiTime < 4000) return;
        recentScansRef.current[multiGroupKey] = now;

        setScanResult({ 
          success: false, 
          message: 'اختر المجموعة أولا لأن الطالب مسجل في أكثر من مجموعة', 
          studentName: student.name 
        });
        playErrorSound();
        setManualInput('');
        setTimeout(() => setScanResult(null), 3500);
        return;
      }
      targetGroupId = studentGroups[0]?.id || student.group_id || '';
    } else {
      const belongs = studentGroups.some(g => g.id === targetGroupId);
      if (!belongs) {
        const mismatchKey = `mismatch-${student.id}-${targetGroupId}`;
        const lastMismatchTime = recentScansRef.current[mismatchKey] || 0;
        if (now - lastMismatchTime < 4000) return;
        recentScansRef.current[mismatchKey] = now;

        setScanResult({ success: false, message: 'الطالب ليس من هذه المجموعة' });
        playErrorSound();
        setManualInput('');
        setTimeout(() => setScanResult(null), 3500);
        return;
      }
    }

    if (!targetGroupId) {
      setScanResult({ success: false, message: 'الطالب غير مسجل في مجموعة' });
      playErrorSound();
      setManualInput('');
      setTimeout(() => setScanResult(null), 3500);
      return;
    }

    // Debounce scan for this student in this specific group
    const scanKey = `${student.id}-${targetGroupId}`;
    const lastScanTime = recentScansRef.current[scanKey] || 0;
    if (now - lastScanTime < 6000) {
      return; // Ignore duplicate scans within 6 seconds
    }
    recentScansRef.current[scanKey] = now;

    // Record attendance
    const result = recordQRAttendance(student.id, targetGroupId);
    setScanResult({ ...result, studentName: student.name });

    if (result.success) {
      setScanCount(c => c + 1);
      playSuccessSound();
    } else {
      playErrorSound();
    }

    setManualInput('');
    setTimeout(() => setScanResult(null), 3500);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
    }
  };

  const today = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const groupStudentCount = selectedGroup
    ? getStudentsByGroup(selectedGroup).filter(s => s.status === 'active').length
    : students.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">تسجيل الحضور بـ QR Code</h1>
        <p className="text-gray-500 text-sm mt-1">{today}</p>
      </div>

      {/* Group Selection */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">اختر المجموعة (اختياري)</label>
        <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
          <option value="">كل المجموعات</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Camera Scanner */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="text-center mb-4">
          <h3 className="font-bold text-gray-800 flex items-center justify-center gap-2">
            <Camera size={20} className="text-primary-600" />
            مسح QR Code بالكاميرا
          </h3>
        </div>

        {/* Camera toggle buttons */}
        <div className="flex gap-3 mb-4">
          {!cameraActive ? (
            <button
              onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-medium hover:from-primary-700 hover:to-primary-800 transition shadow-lg"
            >
              <Video size={20} />
              فتح الكاميرا
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition shadow-lg"
            >
              <VideoOff size={20} />
              إغلاق الكاميرا
            </button>
          )}
        </div>

        {/* Camera view */}
        <div
          ref={scannerContainerRef}
          className={`relative overflow-hidden rounded-2xl bg-gray-900 transition-all duration-300 ${cameraActive ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div id="qr-reader" className="w-full" style={{ minHeight: '300px' }}></div>
          {cameraActive && (
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="bg-black/60 text-white text-xs px-4 py-1.5 rounded-full animate-pulse">
                📷 وجه الكاميرا نحو QR Code...
              </span>
            </div>
          )}
        </div>

        {!cameraActive && (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-2xl mb-4">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Scan size={36} className="text-primary-600" />
            </div>
            <p className="text-sm text-gray-500">اضغط "فتح الكاميرا" لمسح QR Code</p>
            <p className="text-xs text-gray-400 mt-1">أو أدخل كود الطالب يدوياً بالأسفل</p>
          </div>
        )}

        {/* Result Display */}
        {scanResult && (
          <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 animate-fade-in ${scanResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {scanResult.success ? (
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="text-white" size={24} />
              </div>
            ) : (
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-white" size={24} />
              </div>
            )}
            <div>
              {scanResult.studentName && (
                <p className={`font-bold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>{scanResult.studentName}</p>
              )}
              <p className={`text-sm ${scanResult.success ? 'text-green-600' : 'text-red-600'}`}>{scanResult.message}</p>
            </div>
          </div>
        )}

        {/* Manual Input */}
        <div className="border-t pt-4 mt-4">
          <p className="text-sm text-gray-600 mb-3 font-medium">أو أدخل الكود يدوياً:</p>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="relative">
              <QrCode className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="أدخل كود الطالب أو امسح QR..."
                className="w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-center"
              />
            </div>
            <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 transition flex items-center justify-center gap-2">
              <Check size={20} /> تسجيل الحضور
            </button>
          </form>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">إحصائيات اليوم</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{groupStudentCount}</p>
            <p className="text-xs text-blue-500">إجمالي الطلاب</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{groupAttendance.filter(a => a.status === 'present').length}</p>
            <p className="text-xs text-green-500">حضروا اليوم</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{scanCount}</p>
            <p className="text-xs text-purple-500">تم مسحهم الآن</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-400">
          💡 يمكنك استخدام قارئ باركود USB لمسح الأكواد مباشرة في حقل الإدخال
        </p>
      </div>
    </div>
  );
}
