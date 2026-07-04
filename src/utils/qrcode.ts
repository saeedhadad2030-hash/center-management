import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<string> {
  try {
    const url = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return url;
  } catch (err) {
    console.error('QR Code generation error:', err);
    return '';
  }
}

export function formatStudentCode(id: string): string {
  if (!id) return '';
  if (id.startsWith('00000000-0000-0000-0000-')) {
    const numStr = id.slice(24).replace(/^0+/, '');
    return numStr || '0';
  }
  if (/^\d+$/.test(id)) {
    return id;
  }
  return id.slice(0, 6).toUpperCase();
}

export function generateStudentQRData(studentId: string, studentName: string): string {
  return JSON.stringify({
    type: 'student',
    id: studentId,
    code: formatStudentCode(studentId),
    name: studentName,
    center: 'السنتر التعليمي',
    timestamp: Date.now(),
  });
}
