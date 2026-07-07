import {describe, expect, it} from 'vitest';
import {isEmployeeEmail, isStudentEmail} from '@/lib/config/email-domains';

describe('email domain helpers', () => {
  it('detects student emails on the student domain', () => {
    expect(isStudentEmail('someone@mail.sbu.ac.ir')).toBe(true);
    expect(isStudentEmail('  Someone@MAIL.SBU.AC.IR  ')).toBe(true);
    expect(isStudentEmail('someone@sbu.ac.ir')).toBe(false);
    expect(isStudentEmail('someone@gmail.com')).toBe(false);
  });

  it('detects employee emails on the employee domain', () => {
    expect(isEmployeeEmail('staff@sbu.ac.ir')).toBe(true);
    expect(isEmployeeEmail('STAFF@SBU.AC.IR')).toBe(true);
    expect(isEmployeeEmail('someone@mail.sbu.ac.ir')).toBe(false);
    expect(isEmployeeEmail('staff@gmail.com')).toBe(false);
  });
});
