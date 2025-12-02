'use client';

import { useCallback } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '../DialogPrimitives';
import { TimeEntryFormNew } from '@/modules/chat/timer/components/molecules/TimeEntryFormNew';

export interface ManualTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskName: string;
  taskDescription?: string;
  userId: string;
  userName: string;
  onSuccess?: () => void;
}

export function ManualTimeDialog({
  open,
  onOpenChange,
  taskId,
  taskName,
  taskDescription,
  userId,
  userName,
  onSuccess,
}: ManualTimeDialogProps) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        size="sm"
        closeOnOverlayClick={true}
        closeOnEscape={true}
        showCloseButton={true}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Añadir Tiempo Manual a {taskName}
          </ResponsiveDialogTitle>
          {taskDescription && (
            <ResponsiveDialogDescription>
              {taskDescription}
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <TimeEntryFormNew
            taskId={taskId}
            userId={userId}
            userName={userName}
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export default ManualTimeDialog;
