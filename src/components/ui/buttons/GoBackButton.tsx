'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button, ButtonProps } from './index'; // Assuming Button and ButtonProps are exported from index.tsx

const GoBackButton: React.FC<Omit<ButtonProps, 'children'>> = ({ onClick, ...props }) => {
  const router = useRouter();

  const handleGoBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    } else {
      router.back();
    }
  };

  return (
    <Button
      intent="ghost"
      size="icon"
      onClick={handleGoBack}
      aria-label="Go back"
      {...props}
    >
      <ArrowLeft />
    </Button>
  );
};

export default GoBackButton;
