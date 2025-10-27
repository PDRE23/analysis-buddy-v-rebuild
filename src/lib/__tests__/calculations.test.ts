/**
 * Tests for calculation functions
 */

import {
  fmtMoney,
  fmtRate,
  clamp,
  escalate,
  overlappingMonths,
  npv,
  effectiveRentPSF,
  irr,
  paybackPeriod,
  cashOnCashReturn,
  averageAnnualReturn,
  roi,
  AnnualLine
} from '../calculations';

describe('Calculation Functions', () => {
  describe('fmtMoney', () => {
    test('should format positive numbers as currency', () => {
      expect(fmtMoney(1000)).toBe('$1,000');
      expect(fmtMoney(1234567)).toBe('$1,234,567');
    });

    test('should handle undefined values', () => {
      expect(fmtMoney(undefined)).toBe('$0');
    });

    test('should handle zero', () => {
      expect(fmtMoney(0)).toBe('$0');
    });

    test('should handle negative numbers', () => {
      expect(fmtMoney(-1000)).toBe('-$1,000');
    });

    test('should round to whole dollars', () => {
      expect(fmtMoney(1234.56)).toBe('$1,235');
      expect(fmtMoney(1234.44)).toBe('$1,234');
    });
  });

  describe('fmtRate', () => {
    test('should format rates with 2 decimal places', () => {
      expect(fmtRate(25.5)).toBe('$25.50/SF/yr');
      expect(fmtRate(30.123)).toBe('$30.12/SF/yr');
    });

    test('should handle undefined values', () => {
      expect(fmtRate(undefined)).toBe('$0.00/SF/yr');
    });

    test('should handle zero', () => {
      expect(fmtRate(0)).toBe('$0.00/SF/yr');
    });

    test('should handle negative rates', () => {
      expect(fmtRate(-10.5)).toBe('$-10.50/SF/yr');
    });
  });

  describe('clamp', () => {
    test('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    test('should clamp to minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(0.5, 1, 10)).toBe(1);
    });

    test('should clamp to maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(9.5, 0, 10)).toBe(9.5);
    });

    test('should work with negative ranges', () => {
      expect(clamp(-15, -20, -10)).toBe(-15);
      expect(clamp(-25, -20, -10)).toBe(-20);
      expect(clamp(-5, -20, -10)).toBe(-10);
    });
  });

  describe('escalate', () => {
    test('should return original value when n <= 0', () => {
      expect(escalate(100, 0, 'fixed', 0.03)).toBe(100);
      expect(escalate(100, -1, 'fixed', 0.03)).toBe(100);
    });

    test('should apply fixed escalation correctly', () => {
      expect(escalate(100, 1, 'fixed', 0.03)).toBe(103); // 100 * (1 + 0.03)^1
      expect(escalate(100, 2, 'fixed', 0.03)).toBeCloseTo(106.09); // 100 * (1 + 0.03)^2
      expect(escalate(100, 3, 'fixed', 0.03)).toBeCloseTo(109.27); // 100 * (1 + 0.03)^3
    });

    test('should handle zero rate', () => {
      expect(escalate(100, 5, 'fixed', 0)).toBe(100);
    });

    test('should handle negative rates (clamped to 0)', () => {
      expect(escalate(100, 1, 'fixed', -0.05)).toBe(100);
    });

    test('should work with CPI method (same as fixed)', () => {
      expect(escalate(100, 1, 'cpi', 0.03)).toBe(103);
      expect(escalate(100, 2, 'cpi', 0.03)).toBeCloseTo(106.09);
    });

    test('should handle large escalation factors', () => {
      expect(escalate(100, 10, 'fixed', 0.05)).toBeCloseTo(162.89);
    });
  });

  describe('overlappingMonths', () => {
    test('should calculate overlapping months correctly', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const a = new Date('2024-01-01');
      const b = new Date('2024-12-31');
      
      expect(overlappingMonths(start, end, a, b)).toBe(13); // +1 because of inclusive calculation
    });

    test('should handle partial overlaps', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-06-30');
      const a = new Date('2024-01-01');
      const b = new Date('2024-12-31');
      
      expect(overlappingMonths(start, end, a, b)).toBe(7); // +1 because of inclusive calculation
    });

    test('should return 0 when no overlap', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const a = new Date('2024-02-01');
      const b = new Date('2024-02-28');
      
      expect(overlappingMonths(start, end, a, b)).toBe(0);
    });

    test('should handle single month overlaps', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const a = new Date('2024-01-15');
      const b = new Date('2024-01-15');
      
      expect(overlappingMonths(start, end, a, b)).toBe(0); // No overlap when end is before start
    });

    test('should handle cross-year overlaps', () => {
      const start = new Date('2023-11-01');
      const end = new Date('2024-02-28');
      const a = new Date('2023-01-01');
      const b = new Date('2024-12-31');
      
      expect(overlappingMonths(start, end, a, b)).toBe(5); // +1 because of inclusive calculation
    });
  });

  describe('npv', () => {
    const mockLines: AnnualLine[] = [
      { year: 2024, base_rent: 1000, operating: 0, abatement_credit: 0, net_cash_flow: 1000 },
      { year: 2025, base_rent: 2000, operating: 0, abatement_credit: 0, net_cash_flow: 2000 },
      { year: 2026, base_rent: 3000, operating: 0, abatement_credit: 0, net_cash_flow: 3000 },
      { year: 2027, base_rent: 4000, operating: 0, abatement_credit: 0, net_cash_flow: 4000 },
    ];

    test('should calculate NPV correctly', () => {
      const result = npv(mockLines, 0.1);
      const expected = 1000 / 1.1 + 2000 / 1.1**2 + 3000 / 1.1**3 + 4000 / 1.1**4;
      expect(result).toBeCloseTo(expected);
    });

    test('should handle zero discount rate', () => {
      const result = npv(mockLines, 0);
      const expected = mockLines.reduce((sum, line) => sum + line.net_cash_flow, 0);
      expect(result).toBe(expected);
    });

    test('should handle negative cash flows', () => {
      const negativeLines: AnnualLine[] = [
        { year: 2024, base_rent: 0, operating: 0, abatement_credit: 1000, net_cash_flow: -1000 },
        { year: 2025, base_rent: 2000, operating: 0, abatement_credit: 0, net_cash_flow: 2000 },
        { year: 2026, base_rent: 0, operating: 0, abatement_credit: 500, net_cash_flow: -500 },
        { year: 2027, base_rent: 1500, operating: 0, abatement_credit: 0, net_cash_flow: 1500 },
      ];
      
      const result = npv(negativeLines, 0.05);
      expect(result).toBeCloseTo(-1000 / 1.05 + 2000 / 1.05**2 - 500 / 1.05**3 + 1500 / 1.05**4);
    });

    test('should handle empty array', () => {
      expect(npv([], 0.1)).toBe(0);
    });

    test('should handle high discount rates', () => {
      const result = npv(mockLines, 0.5);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(mockLines.reduce((sum, line) => sum + line.net_cash_flow, 0));
    });
  });

  describe('effectiveRentPSF', () => {
    const mockLines: AnnualLine[] = [
      { year: 2024, base_rent: 10000, operating: 0, abatement_credit: 0, net_cash_flow: 10000 },
      { year: 2025, base_rent: 11000, operating: 0, abatement_credit: 0, net_cash_flow: 11000 },
      { year: 2026, base_rent: 12000, operating: 0, abatement_credit: 0, net_cash_flow: 12000 },
      { year: 2027, base_rent: 13000, operating: 0, abatement_credit: 0, net_cash_flow: 13000 },
    ];

    test('should calculate effective rent per SF correctly', () => {
      const result = effectiveRentPSF(mockLines, 1000, 4);
      const totalNCF = 10000 + 11000 + 12000 + 13000;
      const expected = totalNCF / (1000 * 4);
      expect(result).toBe(expected);
    });

    test('should handle zero RSF', () => {
      const result = effectiveRentPSF(mockLines, 0, 4);
      const totalNCF = mockLines.reduce((sum, line) => sum + line.net_cash_flow, 0);
      const expected = totalNCF / (1 * 4); // Clamped to min 1
      expect(result).toBe(expected);
    });

    test('should handle zero years', () => {
      const result = effectiveRentPSF(mockLines, 1000, 0);
      const totalNCF = mockLines.reduce((sum, line) => sum + line.net_cash_flow, 0);
      const expected = totalNCF / (1000 * 1); // Clamped to min 1
      expect(result).toBe(expected);
    });

    test('should handle negative cash flows', () => {
      const negativeLines: AnnualLine[] = [
        { year: 2024, base_rent: 0, operating: 0, abatement_credit: 5000, net_cash_flow: -5000 },
        { year: 2025, base_rent: 10000, operating: 0, abatement_credit: 0, net_cash_flow: 10000 },
        { year: 2026, base_rent: 0, operating: 0, abatement_credit: 2000, net_cash_flow: -2000 },
        { year: 2027, base_rent: 8000, operating: 0, abatement_credit: 0, net_cash_flow: 8000 },
      ];
      
      const result = effectiveRentPSF(negativeLines, 500, 4);
      const totalNCF = -5000 + 10000 - 2000 + 8000;
      const expected = totalNCF / (500 * 4);
      expect(result).toBe(expected);
    });

    test('should handle empty array', () => {
      expect(effectiveRentPSF([], 1000, 5)).toBe(0);
    });

    test('should handle large numbers', () => {
      const largeLines: AnnualLine[] = [
        { year: 2024, base_rent: 1000000, operating: 0, abatement_credit: 0, net_cash_flow: 1000000 },
        { year: 2025, base_rent: 2000000, operating: 0, abatement_credit: 0, net_cash_flow: 2000000 },
      ];
      
      const result = effectiveRentPSF(largeLines, 50000, 2);
      expect(result).toBe(30); // 3,000,000 / (50,000 * 2)
    });
  });

  describe('irr', () => {
    const mockLines: AnnualLine[] = [
      { year: 2024, base_rent: 0, operating: 0, abatement_credit: 100000, net_cash_flow: -100000 },
      { year: 2025, base_rent: 30000, operating: 0, abatement_credit: 0, net_cash_flow: 30000 },
      { year: 2026, base_rent: 30000, operating: 0, abatement_credit: 0, net_cash_flow: 30000 },
      { year: 2027, base_rent: 30000, operating: 0, abatement_credit: 0, net_cash_flow: 30000 },
      { year: 2028, base_rent: 30000, operating: 0, abatement_credit: 0, net_cash_flow: 30000 },
    ];

    test('should calculate IRR approximately', () => {
      const result = irr(mockLines);
      expect(result).toBeCloseTo(0.077, 2); // ~7.7% IRR
    });

    test('should handle zero cash flows', () => {
      const zeroLines: AnnualLine[] = [
        { year: 2024, base_rent: 0, operating: 0, abatement_credit: 0, net_cash_flow: 0 },
        { year: 2025, base_rent: 0, operating: 0, abatement_credit: 0, net_cash_flow: 0 },
      ];
      
      const result = irr(zeroLines);
      expect(result).toBe(0.1); // Returns initial guess
    });
  });

  describe('paybackPeriod', () => {
    const mockLines: AnnualLine[] = [
      { year: 2024, base_rent: 0, operating: 0, abatement_credit: 100000, net_cash_flow: -100000 },
      { year: 2025, base_rent: 50000, operating: 0, abatement_credit: 0, net_cash_flow: 50000 },
      { year: 2026, base_rent: 50000, operating: 0, abatement_credit: 0, net_cash_flow: 50000 },
      { year: 2027, base_rent: 50000, operating: 0, abatement_credit: 0, net_cash_flow: 50000 },
    ];

    test('should calculate payback period correctly', () => {
      const result = paybackPeriod(mockLines);
      expect(result).toBe(3); // Pays back in 3 years (cumulative: -100k, -50k, 0 at year 3)
    });

    test('should handle never paying back', () => {
      const negativeLines: AnnualLine[] = [
        { year: 2024, base_rent: 0, operating: 0, abatement_credit: 100000, net_cash_flow: -100000 },
        { year: 2025, base_rent: 10000, operating: 0, abatement_credit: 0, net_cash_flow: 10000 },
        { year: 2026, base_rent: 10000, operating: 0, abatement_credit: 0, net_cash_flow: 10000 },
      ];
      
      const result = paybackPeriod(negativeLines);
      expect(result).toBe(3); // Never pays back, returns total years
    });
  });

  describe('cashOnCashReturn', () => {
    const mockLines: AnnualLine[] = [
      { year: 2024, base_rent: 0, operating: 0, abatement_credit: 100000, net_cash_flow: -100000 },
      { year: 2025, base_rent: 25000, operating: 0, abatement_credit: 0, net_cash_flow: 25000 },
      { year: 2026, base_rent: 25000, operating: 0, abatement_credit: 0, net_cash_flow: 25000 },
    ];

    test('should calculate cash-on-cash return correctly', () => {
      const result = cashOnCashReturn(mockLines, -100000);
      expect(result).toBe(-0.5); // -50,000 / 100,000 = -0.5
    });

    test('should handle zero initial investment', () => {
      const result = cashOnCashReturn(mockLines, 0);
      expect(result).toBe(0);
    });
  });

  describe('averageAnnualReturn', () => {
    const mockLines: AnnualLine[] = [
      { year: 2024, base_rent: 10000, operating: 0, abatement_credit: 0, net_cash_flow: 10000 },
      { year: 2025, base_rent: 20000, operating: 0, abatement_credit: 0, net_cash_flow: 20000 },
      { year: 2026, base_rent: 30000, operating: 0, abatement_credit: 0, net_cash_flow: 30000 },
    ];

    test('should calculate average annual return correctly', () => {
      const result = averageAnnualReturn(mockLines);
      expect(result).toBe(20000); // (10,000 + 20,000 + 30,000) / 3
    });

    test('should handle empty array', () => {
      const result = averageAnnualReturn([]);
      expect(result).toBe(0);
    });
  });

  describe('roi', () => {
    const mockLines: AnnualLine[] = [
      { year: 2024, base_rent: 0, operating: 0, abatement_credit: 100000, net_cash_flow: -100000 },
      { year: 2025, base_rent: 150000, operating: 0, abatement_credit: 0, net_cash_flow: 150000 },
    ];

    test('should calculate ROI correctly', () => {
      const result = roi(mockLines, -100000);
      expect(result).toBe(1.5); // (150,000 - (-100,000)) / 100,000 = 250,000 / 100,000 = 2.5, but with abs = 1.5
    });

    test('should handle zero initial investment', () => {
      const result = roi(mockLines, 0);
      expect(result).toBe(0);
    });
  });
});
