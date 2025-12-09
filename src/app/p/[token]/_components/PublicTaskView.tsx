'use client';

import React from 'react';
import { PublicTask } from '@/modules/shareTask/schemas/validation.schemas';
import { PublicChatView } from '@/modules/chat/components/PublicChatView';
import styles from './PublicTaskView.module.scss';

interface GuestSession {
  guestName: string;
  avatar: string;
  taskId: string;
}

interface PublicTaskViewProps {
  task: PublicTask;
  token: string;
  tokenStatus?: 'pending' | 'redeemed';
  guestSession?: GuestSession | null;
}

export function PublicTaskView({ task, token, tokenStatus, guestSession }: PublicTaskViewProps) {
  return (
    <div className={styles.wrapper}>
      <PublicChatView
        task={task}
        token={token}
        initialTokenStatus={tokenStatus}
        initialGuestSession={guestSession}
      />
    </div>
  );
}
