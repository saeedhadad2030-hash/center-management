import { errorResponse, getAdminClient, handleOptions, readBody, setCorsHeaders } from './_shared.js';

function phoneVariants(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  const variants = new Set([raw, digits]);

  if (digits.startsWith('20') && digits.length > 2) variants.add(`0${digits.slice(2)}`);
  if (digits.startsWith('2') && digits.length > 1) variants.add(`0${digits.slice(1)}`);
  if (digits.startsWith('0')) {
    variants.add(`2${digits}`);
    variants.add(`20${digits.slice(1)}`);
    variants.add(`+2${digits}`);
  }

  return Array.from(variants).filter(Boolean);
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

    const body = await readBody(req);
    const phones = phoneVariants(body.phone);
    if (phones.length === 0) return res.status(400).json({ error: 'Phone is required.' });

    const admin = getAdminClient();
    const { data: students, error: studentsError } = await admin
      .from('students')
      .select('*')
      .in('parent_phone', phones)
      .neq('status', 'archived');
    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      return res.status(200).json({
        students: [],
        groups: [],
        enrollments: [],
        attendance: [],
        payments: [],
        examResults: [],
        exams: [],
        subscriptions: [],
      });
    }

    const studentIds = students.map(student => student.id);

    const [
      enrollmentsResult,
      attendanceResult,
      paymentsResult,
      examResultsResult,
      subscriptionsResult,
    ] = await Promise.all([
      admin.from('enrollments').select('*').in('student_id', studentIds),
      admin.from('attendance').select('*').in('student_id', studentIds),
      admin.from('payments').select('*').in('student_id', studentIds),
      admin.from('exam_results').select('*').in('student_id', studentIds),
      admin.from('subscriptions').select('*').in('student_id', studentIds),
    ]);

    for (const result of [enrollmentsResult, attendanceResult, paymentsResult, examResultsResult, subscriptionsResult]) {
      if (result.error) throw result.error;
    }

    const groupIds = new Set(students.map(student => student.group_id).filter(Boolean));
    (enrollmentsResult.data || []).forEach(enrollment => groupIds.add(enrollment.group_id));
    (paymentsResult.data || []).forEach(payment => groupIds.add(payment.group_id));
    (subscriptionsResult.data || []).forEach(subscription => {
      if (subscription.group_id) groupIds.add(subscription.group_id);
    });

    const { data: groups, error: groupsError } = groupIds.size > 0
      ? await admin.from('groups').select('*').in('id', Array.from(groupIds))
      : { data: [], error: null };
    if (groupsError) throw groupsError;

    const examIds = Array.from(new Set((examResultsResult.data || []).map(result => result.exam_id).filter(Boolean)));
    const { data: exams, error: examsError } = examIds.length > 0
      ? await admin.from('exams').select('*').in('id', examIds)
      : { data: [], error: null };
    if (examsError) throw examsError;

    return res.status(200).json({
      students,
      groups: groups || [],
      enrollments: enrollmentsResult.data || [],
      attendance: attendanceResult.data || [],
      payments: paymentsResult.data || [],
      examResults: examResultsResult.data || [],
      exams: exams || [],
      subscriptions: subscriptionsResult.data || [],
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}
