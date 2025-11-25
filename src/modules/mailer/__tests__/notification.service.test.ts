/**
 * @jest-environment node
 */
import { NotificationData } from '../services/notification.service';
import { User, Task } from '../../../../types/types';
import * as firebase from '@/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { isMailConfigured } from '../config'; // Import isMailConfigured

// Mock the entire transporter module at the top level
const mockSendEmailInternal = jest.fn().mockResolvedValue({ success: true });
jest.mock('../transporter', () => ({
  sendEmailInternal: mockSendEmailInternal,
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(),
  doc: jest.fn(),
}));

describe('NotificationService', () => {
  let NotificationService: typeof import('../services/notification.service').NotificationService;

  const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    image: '',
    emailVerified: new Date(),
    hashedPassword: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    role: 'USER',
    provider: 'credentials',
  };

  const mockTask: Task = {
    id: 'task-1',
    name: 'Test Task',
    description: 'This is a test task.',
    status: 'in-progress',
    priority: 'medium',
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user-1',
    isPrivate: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-import NotificationService here to ensure it gets the mocked transporter
    NotificationService = require('../services/notification.service').NotificationService;

    // console.log('isMailConfigured in test:', isMailConfigured()); // Log the value
    (getDoc as jest.Mock).mockImplementation((docRef) => {
      if (docRef.path.startsWith('users/')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            email: mockUser.email,
            fullName: mockUser.name,
          }),
        });
      }
      if (docRef.path.startsWith('tasks/')) {
        return Promise.resolve({
          exists: () => true,
          data: () => mockTask,
        });
      }
      return Promise.resolve({ exists: () => false });
    });
  });

  it('should send a task creation notification', async () => {
    const data: NotificationData = {
      recipientIds: ['user-2'],
      taskId: mockTask.id,
      actorId: mockUser.id,
      type: 'task_created',
    };

    await NotificationService.sendTaskNotification(data);

    expect(sendEmailInternal).toHaveBeenCalledTimes(1);
    expect(sendEmailInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: `Nueva tarea asignada: ${mockTask.name}`,
      })
    );
  });

  it('should send a task update notification', async () => {
    const data: NotificationData = {
      recipientIds: ['user-2'],
      taskId: mockTask.id,
      actorId: mockUser.id,
      type: 'task_updated',
    };

    await NotificationService.sendTaskNotification(data);

    expect(sendEmailInternal).toHaveBeenCalledTimes(1);
    expect(sendEmailInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: `Tarea actualizada: ${mockTask.name}`,
      })
    );
  });

  it('should send a task deletion notification', async () => {
    const data: NotificationData = {
      recipientIds: ['user-2'],
      taskId: mockTask.id,
      actorId: mockUser.id,
      type: 'task_deleted',
    };

    await NotificationService.sendTaskNotification(data);

    expect(sendEmailInternal).toHaveBeenCalledTimes(1);
    expect(sendEmailInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: `Tarea eliminada: ${mockTask.name}`,
      })
    );
  });

  it('should send a task archived notification', async () => {
    const data: NotificationData = {
        recipientIds: ['user-2'],
        taskId: mockTask.id,
        actorId: mockUser.id,
        type: 'task_archived',
    };

    await NotificationService.sendTaskNotification(data);

    expect(sendEmailInternal).toHaveBeenCalledTimes(1);
    expect(sendEmailInternal).toHaveBeenCalledWith(
        expect.objectContaining({
            subject: `Tarea archivada: ${mockTask.name}`,
        })
    );
  });

  it('should send a task unarchived notification', async () => {
      const data: NotificationData = {
          recipientIds: ['user-2'],
          taskId: mockTask.id,
          actorId: mockUser.id,
          type: 'task_unarchived',
      };

      await NotificationService.sendTaskNotification(data);

      expect(sendEmailInternal).toHaveBeenCalledTimes(1);
      expect(sendEmailInternal).toHaveBeenCalledWith(
          expect.objectContaining({
              subject: `Tarea reactivada: ${mockTask.name}`,
          })
      );
  });
});