/**
 * Custom hook for form validation
 */

import { useState, useCallback } from 'react';
import { ValidationError } from '@/lib/validation';

export interface UseFormValidationOptions<T> {
  onSubmit?: (data: T) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export const useFormValidation = <T extends Record<string, unknown> = Record<string, unknown>>(
  initialData: T,
  validationRules: (data: T) => ValidationError[],
  options: UseFormValidationOptions<T> = {}
) => {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { validateOnChange = false, validateOnBlur = true, onSubmit } = options;

  // Validate current data
  const validate = useCallback(() => {
    const validationErrors = validationRules(data);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  }, [data, validationRules]);

  // Update field value
  const updateField = useCallback((field: keyof T, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    if (validateOnChange) {
      // Validate only the changed field
      const newData = { ...data, [field]: value };
      const fieldErrors = validationRules(newData).filter(error => error.field === field);
      
      setErrors(prev => [
        ...prev.filter(error => error.field !== field),
        ...fieldErrors
      ]);
    }
  }, [data, validateOnChange, validationRules]);

  // Handle field blur
  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (validateOnBlur) {
      // Validate only the blurred field
      const fieldErrors = validationRules(data).filter(error => error.field === field);
      
      setErrors(prev => [
        ...prev.filter(error => error.field !== field),
        ...fieldErrors
      ]);
    }
  }, [data, validateOnBlur, validationRules]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setIsSubmitting(true);
    setTouched(Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    const isValid = validate();
    
    if (isValid && onSubmit) {
      try {
        await onSubmit(data);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
    
    return isValid;
  }, [data, validate, onSubmit]);

  // Reset form
  const reset = useCallback((newData?: T) => {
    setData(newData || initialData);
    setErrors([]);
    setTouched({});
    setIsSubmitting(false);
  }, [initialData]);

  // Get field error
  const getFieldError = useCallback((field: keyof T) => {
    return errors.find(error => error.field === field && error.severity === 'error');
  }, [errors]);

  // Get field warning
  const getFieldWarning = useCallback((field: keyof T) => {
    return errors.find(error => error.field === field && error.severity === 'warning');
  }, [errors]);

  // Get field error message
  const getFieldErrorMessage = useCallback((field: keyof T) => {
    const error = getFieldError(field);
    return error?.message || '';
  }, [getFieldError]);

  // Get field warning message
  const getFieldWarningMessage = useCallback((field: keyof T) => {
    const warning = getFieldWarning(field);
    return warning?.message || '';
  }, [getFieldWarning]);

  // Check if field is invalid
  const isFieldInvalid = useCallback((field: keyof T) => {
    const error = getFieldError(field);
    const isTouched = touched[field as string];
    return Boolean(error && isTouched);
  }, [getFieldError, touched]);

  // Check if field has warning
  const isFieldWarning = useCallback((field: keyof T) => {
    const warning = getFieldWarning(field);
    const isTouched = touched[field as string];
    return Boolean(warning && isTouched);
  }, [getFieldWarning, touched]);

  // Check if field should show error
  const shouldShowFieldError = useCallback((field: keyof T) => {
    const error = getFieldError(field);
    const isTouched = touched[field as string];
    return Boolean(error && (isTouched || errors.length > 0));
  }, [getFieldError, touched, errors]);

  // Check if field should show warning
  const shouldShowFieldWarning = useCallback((field: keyof T) => {
    const warning = getFieldWarning(field);
    const isTouched = touched[field as string];
    return Boolean(warning && (isTouched || errors.length > 0));
  }, [getFieldWarning, touched, errors]);

  return {
    data,
    errors,
    touched,
    isSubmitting,
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    updateField,
    handleBlur,
    handleSubmit,
    reset,
    validate,
    getFieldError,
    getFieldWarning,
    getFieldErrorMessage,
    getFieldWarningMessage,
    isFieldInvalid,
    isFieldWarning,
    shouldShowFieldError,
    shouldShowFieldWarning,
    setData,
  };
};
