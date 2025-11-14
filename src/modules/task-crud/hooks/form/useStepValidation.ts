/**
 * useStepValidation Hook
 * Handles wizard step validation
 */

import { UseFormReturn } from 'react-hook-form';
import { FormValues } from '../../types/form';
import { showRequiredFieldsError } from '../../utils/validation';

interface UseStepValidationOptions {
  form: UseFormReturn<FormValues>;
  includeMembers: boolean;
}

export const useStepValidation = ({ form, includeMembers }: UseStepValidationOptions) => {
  const validateStep = async (fields: (keyof FormValues | string)[]): Promise<boolean> => {
    // Special validation for team step with members
    if (fields.includes('teamInfo.AssignedTo') && includeMembers) {
      const assignedTo = form.getValues('teamInfo.AssignedTo');
      if (!assignedTo || assignedTo.length === 0) {
        form.setError('teamInfo.AssignedTo', {
          type: 'manual',
          message: 'Selecciona al menos un colaborador*',
        });
        showRequiredFieldsError();
        return false;
      }
    }

    // Trigger validation for step fields
    const result = await form.trigger(fields as (keyof FormValues)[]);

    if (!result) {
      showRequiredFieldsError();
    }

    return result;
  };

  return { validateStep };
};
