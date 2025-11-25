'use client';

import React from 'react';
import { ProfileSection } from '../profile';

interface ConfigFormProps {
  userId: string;
  onSuccess: (message: string) => void;
  onError: (message: string, error?: string) => void;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({
  userId,
  onSuccess,
  onError,
}) => {
  const isOwnProfile = true; // Assuming this is always for the current user in the modal

  return (
    <ProfileSection
      userId={userId}
      isOwnProfile={isOwnProfile}
      onSuccess={onSuccess}
      onError={onError}
    />
  );
};
