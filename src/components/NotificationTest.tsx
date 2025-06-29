'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@clerk/nextjs';

export default function NotificationTest() {
  const { user } = useUser();
  const { notifications, unreadCount } = useNotifications();
  const [testMessage, setTestMessage] = useState('');

  const sendTestNotification = async () => {
    if (!user?.id || !testMessage.trim()) return;

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        taskId: 'test-task-id',
        message: testMessage,
        timestamp: Timestamp.now(),
        read: false,
        recipientId: user.id,
        type: 'test',
      });
      console.log('[NotificationTest] Test notification sent');
      setTestMessage('');
    } catch (error) {
      console.error('[NotificationTest] Error sending test notification:', error);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Notification System Test</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Current User: {user?.id || 'Not logged in'}</h4>
        <h4>Unread Count: {unreadCount}</h4>
        <h4>Total Notifications: {notifications.length}</h4>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder="Test notification message"
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <button onClick={sendTestNotification} style={{ padding: '5px 10px' }}>
          Send Test Notification
        </button>
      </div>

      <div>
        <h4>Recent Notifications:</h4>
        {notifications.slice(0, 5).map((notification) => (
          <div key={notification.id} style={{ 
            border: '1px solid #ddd', 
            padding: '10px', 
            margin: '5px 0',
            backgroundColor: notification.read ? '#f9f9f9' : '#fff3cd'
          }}>
            <div><strong>Message:</strong> {notification.message}</div>
            <div><strong>Type:</strong> {notification.type || 'none'}</div>
            <div><strong>Read:</strong> {notification.read ? 'Yes' : 'No'}</div>
            <div><strong>Time:</strong> {notification.timestamp.toDate().toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 