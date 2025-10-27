/**
 * Tests for validation utilities
 */

import { 
  validateDate, 
  validatePositiveNumber, 
  validateDateRange, 
  validateLeaseTerm, 
  validateRSF, 
  validateDiscountRate,
  getFieldDisplayName 
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateDate', () => {
    test('should validate required date', () => {
      const errors = validateDate(undefined, 'Test Date');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test Date is required');
      expect(errors[0].type).toBe('required');
    });

    test('should validate invalid date format', () => {
      const errors = validateDate('invalid-date', 'Test Date');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test Date must be a valid date');
      expect(errors[0].type).toBe('format');
    });

    test('should accept valid date', () => {
      const errors = validateDate('2024-01-01', 'Test Date');
      expect(errors).toHaveLength(0);
    });
  });

  describe('validatePositiveNumber', () => {
    test('should validate required number', () => {
      const errors = validatePositiveNumber(undefined, 'Test Number');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test Number is required');
    });

    test('should validate NaN', () => {
      const errors = validatePositiveNumber(NaN, 'Test Number');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test Number must be a valid number');
    });

    test('should validate negative numbers', () => {
      const errors = validatePositiveNumber(-5, 'Test Number');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test Number must be at least 0');
    });

    test('should accept positive numbers', () => {
      const errors = validatePositiveNumber(10, 'Test Number');
      expect(errors).toHaveLength(0);
    });

    test('should validate custom minimum', () => {
      const errors = validatePositiveNumber(5, 'Test Number', 10);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test Number must be at least 10');
    });
  });

  describe('validateDateRange', () => {
    test('should validate end date after start date', () => {
      const errors = validateDateRange('2024-01-01', '2024-01-01', 'Start', 'End');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('End must be after Start');
    });

    test('should accept valid date range', () => {
      const errors = validateDateRange('2024-01-01', '2024-01-02', 'Start', 'End');
      expect(errors).toHaveLength(0);
    });

    test('should handle missing dates', () => {
      const errors = validateDateRange(undefined, '2024-01-01', 'Start', 'End');
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateLeaseTerm', () => {
    test('should validate minimum lease term', () => {
      const errors = validateLeaseTerm('2024-01-01', '2024-01-01');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Lease term must be at least 1 year');
    });

    test('should validate maximum lease term', () => {
      const errors = validateLeaseTerm('2024-01-01', '2080-01-01');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Lease term cannot exceed 50 years');
    });

    test('should accept valid lease term', () => {
      const errors = validateLeaseTerm('2024-01-01', '2034-01-01');
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateRSF', () => {
    test('should validate minimum RSF', () => {
      const errors = validateRSF(50);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('RSF must be at least 100 square feet');
    });

    test('should validate maximum RSF', () => {
      const errors = validateRSF(20000000);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('RSF cannot exceed 10,000,000 square feet');
    });

    test('should accept valid RSF', () => {
      const errors = validateRSF(50000);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateDiscountRate', () => {
    test('should validate required discount rate', () => {
      const errors = validateDiscountRate(undefined);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Discount rate is required');
    });

    test('should validate negative discount rate', () => {
      const errors = validateDiscountRate(-0.1);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Discount rate cannot be negative');
    });

    test('should validate excessive discount rate', () => {
      const errors = validateDiscountRate(1.5);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Discount rate cannot exceed 100%');
    });

    test('should accept valid discount rate', () => {
      const errors = validateDiscountRate(0.08);
      expect(errors).toHaveLength(0);
    });
  });

  describe('getFieldDisplayName', () => {
    test('should return display names for known fields', () => {
      expect(getFieldDisplayName('tenant_name')).toBe('Tenant Name');
      expect(getFieldDisplayName('rsf')).toBe('RSF');
      expect(getFieldDisplayName('discount_rate')).toBe('Discount Rate');
    });

    test('should return field name for unknown fields', () => {
      expect(getFieldDisplayName('unknown_field')).toBe('unknown_field');
    });
  });
});
