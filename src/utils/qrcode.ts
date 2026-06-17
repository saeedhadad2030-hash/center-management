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

export function generateStudentQRData(studentId: string, studentName: string): string {
  return JSON.stringify({
    type: 'student',
    id: studentId,
    name: studentName,
    center: 'السنتر التعليمي',
    timestamp: Date.now(),
  });
}
