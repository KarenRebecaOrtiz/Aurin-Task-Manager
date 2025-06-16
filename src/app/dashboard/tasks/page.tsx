'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { gsap } from 'gsap';
import Header from '@/components/ui/Header';
import SyncUserToFirestore from '@/components/SyncUserToFirestore';
import OnboardingStepper from '@/components/OnboardingStepper';
import Selector from '@/components/Selector';
import MembersTable from '@/components/MembersTable';
import ClientsTable from '@/components/ClientsTable';
import TasksTable from '@/components/TasksTable';
import CreateTask from '@/components/CreateTask';
import EditTask from '@/components/EditTask';
import AISidebar from '@/components/AISidebar';
import ChatSidebar from '@/components/ChatSidebar';
import ClientSidebar from '@/components/ClientSidebar';
import InviteSidebar from '@/components/InviteSidebar';
import MessageSidebar from '@/components/MessageSidebar';
import ProfileSidebar from '@/components/ProfileSidebar';
import ProfileCard from '@/components/ProfileCard';
import ConfigPage from '@/components/ConfigPage';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import styles from '@/components/TasksPage.module.scss';
import clientStyles from '@/components/ClientsTable.module.scss';
import { v4 as uuidv4 } from 'uuid';
import Dock from '@/components/Dock';

// Define types
type SelectorContainer = 'tareas' | 'cuentas' | 'miembros'; // Matches Selector.tsx Container type
type Container = SelectorContainer | 'config'; // Includes 'config' for TasksPage

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projectCount: number;
  projects: string[];
  createdBy: string;
  createdAt: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
  status?: string;
}

interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
  CreatedBy?: string;
}

interface Notification {
  id: string;
  userId: string;
  message: string | null;
  timestamp: Timestamp | null;
  read: boolean;
  recipientId: string;
  conversationId?: string;
  taskId?: string;
  type?: string;
}

interface Sidebar {
  id: string;
  type: 'message' | 'chat' | 'client-sidebar' | 'invite-sidebar';
  data?: User | Task | { client?: Client };
}

export default function TasksPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedContainer, setSelectedContainer] = useState<Container>('tareas');
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState<string | null>(null);
  const [isInviteSidebarOpen, setIsInviteSidebarOpen] = useState<boolean>(false);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState<string | null>(null);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState<boolean>(false);
  const [openSidebars, setOpenSidebars] = useState<Sidebar[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState<boolean>(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState<boolean>(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState<boolean>(false);
  const [pendingContainer, setPendingContainer] = useState<Container | null>(null);
  const [clientForm, setClientForm] = useState<{
    id?: string;
    name: string;
    imageFile: File | null;
    imagePreview: string;
    projects: string[];
    deleteProjectIndex: number | null;
    deleteConfirm: string;
    email?: string;
  }>({
    name: '',
    imageFile: null,
    imagePreview: '/default-avatar.png',
    projects: [''],
    deleteProjectIndex: null,
    deleteConfirm: '',
  });
  const [isClientLoading, setIsClientLoading] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{ id: string; imageUrl: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmExitPopupRef = useRef<HTMLDivElement>(null);

  const memoizedClients = useMemo(() => clients, [clients]);
  const memoizedUsers = useMemo(() => users, [users]);
  const memoizedTasks = useMemo(() => tasks, [tasks]);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!user?.id) {
        console.warn('[TasksPage] No userId provided, skipping admin status fetch');
        setIsAdmin(false);
        return;
      }
      try {
        console.log('[TasksPage] Fetching admin status for user:', user.id);
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const access = userDoc.data().access;
          setIsAdmin(access === 'admin');
          console.log('[TasksPage] Admin status fetched:', {
            userId: user.id,
            access,
            isAdmin: access === 'admin',
          });
        } else {
          setIsAdmin(false);
          console.warn('[TasksPage] User document not found for ID:', user.id);
        }
      } catch (error) {
        console.error('[TasksPage] Error fetching admin status:', {
          error: error instanceof Error ? error.message : JSON.stringify(error),
          userId: user.id,
        });
        setIsAdmin(false);
      }
    };
    fetchAdminStatus();
  }, [user?.id]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const clerkUsers: {
        id: string;
        imageUrl?: string;
        firstName?: string;
        lastName?: string;
        publicMetadata: { role?: string; description?: string };
      }[] = await response.json();

      const usersData: User[] = await Promise.all(
        clerkUsers.map(async (clerkUser) => {
          const userDoc = await getDoc(doc(db, 'users', clerkUser.id));
          const status = userDoc.exists() ? userDoc.data().status || 'Disponible' : 'Disponible';
          return {
            id: clerkUser.id,
            imageUrl: clerkUser.imageUrl || '/default-avatar.png',
            fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
            role: clerkUser.publicMetadata.role || 'Sin rol',
            description: clerkUser.publicMetadata.description || 'Sin descripción',
            status,
          };
        })
      );
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData: Client[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || '',
        imageUrl: doc.data().imageUrl || '/default-avatar.png',
        projectCount: doc.data().projectCount || 0,
        projects: doc.data().projects || [],
        createdBy: doc.data().createdBy || '',
        createdAt: doc.data().createdAt || new Date().toISOString(),
      }));
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!user?.id) {
      console.warn('[TasksPage] No user ID, skipping tasks fetch');
      return;
    }
    try {
      console.log('[TasksPage] Fetching tasks for user:', { userId: user.id, isAdmin });
      const querySnapshot = await getDocs(collection(db, 'tasks'));
      let tasksData: Task[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        clientId: doc.data().clientId || '',
        project: doc.data().project || '',
        name: doc.data().name || '',
        description: doc.data().description || '',
        status: doc.data().status || '',
        priority: doc.data().priority || '',
        startDate: doc.data().startDate ? doc.data().startDate.toDate().toISOString() : null,
        endDate: doc.data().endDate ? doc.data().endDate.toDate().toISOString() : null,
        LeadedBy: doc.data().LeadedBy || [],
        AssignedTo: doc.data().AssignedTo || [],
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        CreatedBy: doc.data().CreatedBy || '',
      }));

      if (!isAdmin) {
        tasksData = tasksData.filter(
          (task) =>
            task.AssignedTo.includes(user.id) ||
            task.LeadedBy.includes(user.id) ||
            task.CreatedBy === user.id,
        );
      }

      console.log('[TasksPage] Tasks fetched:', {
        totalTasks: tasksData.length,
        taskIds: tasksData.map((t) => t.id),
        userId: user.id,
        isAdmin,
      });
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    }
  }, [user?.id, isAdmin]);

  const fetchNotifications = useCallback(() => {
    if (!user?.id) {
      console.warn('No user ID, skipping notifications fetch');
      return;
    }

    console.log('Setting up notifications listener for user:', user.id);
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(20),
    );
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationsData: Notification[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          userId: doc.data().userId || '',
          message: doc.data().message || null,
          timestamp: doc.data().timestamp || null,
          read: doc.data().read || false,
          recipientId: doc.data().recipientId || '',
          conversationId: doc.data().conversationId,
          taskId: doc.data().taskId,
          type: doc.data().type,
        }));
        console.log('Notifications fetched:', notificationsData.length);
        setNotifications(notificationsData);
      },
      (err) => {
        console.error('Error fetching notifications:', err);
      },
    );

    return unsubscribe;
  }, [user?.id]);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) {
      console.warn('No user ID, skipping notification deletion');
      return;
    }

    try {
      console.log('Deleting notification:', { notificationId, userId: user.id });
      await deleteDoc(doc(db, 'notifications', notificationId));
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      console.log('Notification deleted successfully:', notificationId);
    } catch (error) {
      console.error('Error deleting notification:', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        notificationId,
        userId: user.id,
      });
      alert('Error al eliminar la notificación');
    }
  }, [user?.id]);

  const handleLimitNotifications = useCallback(async (currentNotifications: Notification[]) => {
    if (!user?.id || currentNotifications.length <= 20) return;

    try {
      const sortedNotifications = [...currentNotifications].sort(
        (a, b) => a.timestamp!.toMillis() - b.timestamp!.toMillis(),
      );
      const notificationsToDelete = sortedNotifications.slice(0, currentNotifications.length - 20);

      const deletePromises = notificationsToDelete.map((notification) =>
        deleteDoc(doc(db, 'notifications', notification.id)),
      );
      await Promise.all(deletePromises);

      const updatedNotifications = sortedNotifications.slice(-20);
      setNotifications(updatedNotifications);
      console.log('Notifications limited:', updatedNotifications.length);
    } catch (error) {
      console.error('Error limiting notifications:', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        userId: user.id,
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchUsers();
      fetchClients();
      fetchTasks();
      const unsubscribe = fetchNotifications();
      return () => unsubscribe && unsubscribe();
    }
  }, [fetchUsers, fetchClients, fetchTasks, fetchNotifications, user?.id]);

  useEffect(() => {
    const currentHeaderRef = headerRef.current;
    const currentSelectorRef = selectorRef.current;
    const currentContentRef = contentRef.current;
    if (currentHeaderRef && currentSelectorRef && currentContentRef) {
      gsap.fromTo(
        [currentHeaderRef, currentSelectorRef, currentContentRef],
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
      );
    }
    return () => {
      if (currentHeaderRef && currentSelectorRef && currentContentRef) {
        gsap.killTweensOf([currentHeaderRef, currentSelectorRef, currentContentRef]);
      }
    };
  }, []);

  useEffect(() => {
    const currentContentRef = contentRef.current;
    if (currentContentRef) {
      gsap.fromTo(
        currentContentRef,
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' },
      );
    }
    return () => {
      if (currentContentRef) {
        gsap.killTweensOf(currentContentRef);
      }
    };
  }, [selectedContainer, isCreateTaskOpen, isEditTaskOpen]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setClientForm((prev) => ({ ...prev, imageFile: file }));
      const reader = new FileReader();
      reader.onload = () => setClientForm((prev) => ({ ...prev, imagePreview: reader.result as string }));
      reader.readAsDataURL(file);
    }
  }, []);

  const handleProjectChange = useCallback((index: number, value: string) => {
    setClientForm((prev) => {
      const newProjects = [...prev.projects];
      newProjects[index] = value;
      return { ...prev, projects: newProjects };
    });
  }, []);

  const handleAddProject = useCallback(() => {
    setClientForm((prev) => ({ ...prev, projects: [...prev.projects, ''] }));
  }, []);

  const handleDeleteProjectClick = useCallback((index: number) => {
    setClientForm((prev) => ({ ...prev, deleteProjectIndex: index }));
  }, []);

  const handleDeleteProjectConfirm = useCallback(() => {
    if (clientForm.deleteConfirm.toLowerCase() === 'eliminar') {
      setClientForm((prev) => ({
        ...prev,
        projects: prev.projects.filter((_, i) => i !== prev.deleteProjectIndex),
        deleteProjectIndex: null,
        deleteConfirm: '',
      }));
    }
  }, [clientForm.deleteConfirm]);

  const handleClientSubmit = useCallback(
    async (form: {
      id?: string;
      name: string;
      imageFile: File | null;
      imagePreview: string;
      projects: string[];
    }) => {
      if (!user?.id || !form.name.trim()) {
        alert('El nombre de la cuenta es obligatorio.');
        return;
      }

      setIsClientLoading(true);
      try {
        let imageUrl = form.imagePreview;
        if (form.imageFile) {
          const formData = new FormData();
          formData.append('file', form.imageFile);
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error('Failed to upload image');
          const data = await response.json();
          imageUrl = data.imageUrl;
        }

        const clientData: Client = {
          id: form.id || doc(collection(db, 'clients')).id,
          name: form.name.trim(),
          imageUrl: imageUrl || '/default-avatar.png',
          projectCount: form.projects.length,
          projects: form.projects,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'clients', clientData.id), clientData);
        setClients((prev) =>
          form.id
            ? prev.map((c) => (c.id === form.id ? clientData : c))
            : [...prev, clientData],
        );
        setOpenSidebars((prev) => prev.filter((sidebar) => sidebar.type !== 'client-sidebar'));
      } catch (error) {
        console.error('Error saving client:', error);
        alert('Error al guardar la cuenta.');
      } finally {
        setIsClientLoading(false);
      }
    },
    [user?.id],
  );

  const handleInviteSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        console.log('Invite email:', clientForm.email);
        alert(`Invitación enviada a ${clientForm.email}`);
        setOpenSidebars((prev) => prev.filter((sidebar) => sidebar.type !== 'invite-sidebar'));
      } catch (error) {
        console.error('Error sending invite:', error);
        alert('Error al enviar la invitación');
      }
    },
    [clientForm.email],
  );

  const handleCreateClientOpen = useCallback(() => {
    setClientForm({
      name: '',
      imageFile: null,
      imagePreview: '/default-avatar.png',
      projects: [''],
      deleteProjectIndex: null,
      deleteConfirm: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'client-sidebar', data: {} },
    ]);
  }, []);

  const handleEditClientOpen = useCallback((client: Client) => {
    setClientForm({
      id: client.id,
      name: client.name,
      imageFile: null,
      imagePreview: client.imageUrl,
      projects: client.projects.length ? client.projects : [''],
      deleteProjectIndex: null,
      deleteConfirm: '',
    });
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'client-sidebar', data: { client } },
    ]);
  }, []);

  const handleDeleteClientOpen = useCallback((clientId: string) => {
    if (!isAdmin) {
      console.warn('[TasksPage] Non-admin user attempted to delete client:', { clientId, userId: user?.id });
      alert('Solo los administradores pueden eliminar clientes.');
      return;
    }
    setIsDeleteClientOpen(clientId);
  }, [isAdmin, user?.id]);

  const handleInviteSidebarOpen = useCallback(() => {
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'invite-sidebar' },
    ]);
  }, []);

  const handleNewTaskOpen = useCallback(() => {
    setIsCreateTaskOpen(true);
    setIsEditTaskOpen(false);
    setEditTaskId(null);
  }, []);

  const handleEditTaskOpen = useCallback((taskId: string) => {
    setIsEditTaskOpen(true);
    setEditTaskId(taskId);
    setIsCreateTaskOpen(false);
  }, []);

  const handleAISidebarOpen = useCallback(() => {
    setIsAISidebarOpen(true);
  }, []);

  const handleChatSidebarOpen = useCallback((task: Task) => {
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'chat', data: task },
    ]);
  }, []);

  const handleMessageSidebarOpen = useCallback((userData: User) => {
    if (!user?.id || !userData?.id) {
      console.error('No authenticated user or invalid user data, cannot open message sidebar');
      return;
    }
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'message', data: userData },
    ]);
  }, [user?.id]);

  const handleOpenSidebar = useCallback(
    (receiverId: string) => {
      const selectedUser = users.find((u) => u.id === receiverId);
      if (selectedUser) {
        handleMessageSidebarOpen(selectedUser);
      }
    },
    [users, handleMessageSidebarOpen],
  );

  const handleCloseSidebar = useCallback((sidebarId: string) => {
    setOpenSidebars((prev) => prev.filter((sidebar) => sidebar.id !== sidebarId));
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
        if (notification.type === 'private_message' && notification.conversationId && user?.id) {
          const receiverId = notification.userId === user.id ? notification.recipientId : notification.userId;
          handleOpenSidebar(receiverId);
        } else if (notification.taskId) {
          const task = tasks.find((t) => t.id === notification.taskId);
          if (task) {
            handleChatSidebarOpen(task);
          }
        }
      } catch (err) {
        console.error('Error handling notification click:', err);
      }
    },
    [user?.id, tasks, handleOpenSidebar, handleChatSidebarOpen],
  );

  const handleContainerChange = useCallback(
    (newContainer: Container) => {
      if ((isCreateTaskOpen || isEditTaskOpen) && hasUnsavedChanges && selectedContainer !== newContainer) {
        setPendingContainer(newContainer);
        setIsConfirmExitOpen(true);
      } else {
        setSelectedContainer(newContainer);
        setIsCreateTaskOpen(false);
        setIsEditTaskOpen(false);
        setEditTaskId(null);
      }
    },
    [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, selectedContainer],
  );

  const handleConfirmExit = useCallback(() => {
    if (pendingContainer) {
      setSelectedContainer(pendingContainer);
      setIsCreateTaskOpen(false);
      setIsEditTaskOpen(false);
      setEditTaskId(null);
      setIsConfirmExitOpen(false);
      setPendingContainer(null);
      setHasUnsavedChanges(false);
    }
  }, [pendingContainer]);

  const handleCancelExit = useCallback(() => {
    setIsConfirmExitOpen(false);
    setPendingContainer(null);
  }, []);

  const handleOpenProfile = useCallback((user: { id: string; imageUrl: string }) => {
    setSelectedProfileUser(user);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setSelectedProfileUser(null);
  }, []);

  return (
    <div className={styles.container}>
      <SyncUserToFirestore />
      <div ref={headerRef}>
        <Header
          selectedContainer={selectedContainer}
          onChatSidebarOpen={handleChatSidebarOpen}
          tasks={memoizedTasks}
          users={memoizedUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onDeleteNotification={handleDeleteNotification}
          onLimitNotifications={handleLimitNotifications}
          onChangeContainer={handleContainerChange}
        />
      </div>
      <OnboardingStepper />
      <div ref={selectorRef} className={styles.selector}>
        <Selector
          selectedContainer={selectedContainer as SelectorContainer} // Cast to SelectorContainer
          setSelectedContainer={(c: SelectorContainer) => handleContainerChange(c)} // Restrict to SelectorContainer
          options={[
            { value: 'tareas', label: 'Tareas' },
            { value: 'cuentas', label: 'Cuentas' },
            { value: 'miembros', label: 'Miembros' },
          ]}
        />
      </div>
      <div ref={contentRef} className={styles.content}>
        {selectedContainer === 'tareas' && !isCreateTaskOpen && !isEditTaskOpen && (
          <TasksTable
            tasks={memoizedTasks}
            clients={memoizedClients}
            onCreateClientOpen={handleCreateClientOpen}
            onInviteMemberOpen={handleInviteSidebarOpen}
            onNewTaskOpen={handleNewTaskOpen}
            onEditTaskOpen={handleEditTaskOpen}
            onAISidebarOpen={handleAISidebarOpen}
            onChatSidebarOpen={handleChatSidebarOpen}
            setTasks={setTasks}
            onOpenProfile={handleOpenProfile}
          />
        )}
        {selectedContainer === 'cuentas' && !isCreateTaskOpen && !isEditTaskOpen && (
          <ClientsTable
            clients={memoizedClients}
            onCreateOpen={handleCreateClientOpen}
            onEditOpen={handleEditClientOpen}
            onDeleteOpen={handleDeleteClientOpen}
            setClients={setClients}
          />
        )}
        {selectedContainer === 'miembros' && !isCreateTaskOpen && !isEditTaskOpen && (
          <MembersTable
            users={memoizedUsers}
            tasks={memoizedTasks}
            onInviteSidebarOpen={handleInviteSidebarOpen}
            onProfileSidebarOpen={setIsProfileSidebarOpen}
            onMessageSidebarOpen={handleMessageSidebarOpen}
            setUsers={setUsers}
          />
        )}
        {selectedContainer === 'config' && !isCreateTaskOpen && !isEditTaskOpen && (
          <ConfigPage userId={user?.id || ''} onClose={() => handleContainerChange('tareas')} />
        )}
        {isCreateTaskOpen && (
          <CreateTask
            isOpen={isCreateTaskOpen}
            onToggle={() => setIsCreateTaskOpen(false)}
            onHasUnsavedChanges={setHasUnsavedChanges}
            onCreateClientOpen={handleCreateClientOpen}
            onEditClientOpen={handleEditClientOpen}
            onInviteSidebarOpen={handleInviteSidebarOpen}
          />
        )}
        {isEditTaskOpen && editTaskId && (
          <EditTask
            isOpen={isEditTaskOpen}
            onToggle={() => {
              setIsEditTaskOpen(false);
              setEditTaskId(null);
            }}
            taskId={editTaskId}
            onHasUnsavedChanges={setHasUnsavedChanges}
            onCreateClientOpen={handleCreateClientOpen}
            onEditClientOpen={handleEditClientOpen}
            onInviteSidebarOpen={handleInviteSidebarOpen}
          />
        )}
      </div>
      {isDeleteClientOpen && isAdmin && (
        <div className={clientStyles.popupOverlay}>
          <div className={clientStyles.deletePopup} ref={deletePopupRef}>
            <h2>Confirmar Eliminación</h2>
            <p>Escribe 'Eliminar' para confirmar:</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={clientStyles.deleteConfirmInput}
              placeholder="Escribe 'Eliminar'"
            />
            <button
              onClick={async () => {
                if (deleteConfirm.toLowerCase() === 'eliminar') {
                  try {
                    await deleteDoc(doc(db, 'clients', isDeleteClientOpen));
                    setClients((prev) => prev.filter((c) => c.id !== isDeleteClientOpen));
                    setIsDeleteClientOpen(null);
                    setDeleteConfirm('');
                  } catch (error) {
                    console.error('Error deleting client:', error);
                    alert('Error al eliminar la cuenta');
                  }
                }
              }}
              disabled={deleteConfirm.toLowerCase() !== 'eliminar'}
              className={clientStyles.deleteConfirmButton}
            >
              Sí, eliminar
            </button>
            <button
              onClick={() => {
                setIsDeleteClientOpen(null);
                setDeleteConfirm('');
              }}
              className={clientStyles.cancelButton}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {isConfirmExitOpen && (
        <div className={clientStyles.popupOverlay}>
          <div className={clientStyles.deletePopup} ref={confirmExitPopupRef}>
            <h2>¿Salir sin guardar?</h2>
            <p>¿Estás seguro de que quieres salir sin guardar los cambios? Perderás todo el progreso no guardado.</p>
            <div className={clientStyles.popupActions}>
              <button
                onClick={handleConfirmExit}
                className={clientStyles.deleteConfirmButton}
              >
                Salir
              </button>
              <button
                onClick={handleCancelExit}
                className={clientStyles.cancelButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {isProfileSidebarOpen && (
        <ProfileSidebar
          isOpen={!!isProfileSidebarOpen}
          onClose={() => setIsProfileSidebarOpen(null)}
          userId={isProfileSidebarOpen}
          users={memoizedUsers}
        />
      )}
      <AISidebar isOpen={isAISidebarOpen} onClose={() => setIsAISidebarOpen(false)} />
      {openSidebars.map((sidebar) =>
        sidebar.type === 'message' && user?.id ? (
          <MessageSidebar
            key={sidebar.id}
            sidebarId={sidebar.id}
            isOpen={true}
            onClose={() => handleCloseSidebar(sidebar.id)}
            senderId={user.id}
            receiver={sidebar.data as User}
            onOpenSidebar={handleOpenSidebar}
            conversationId={[user.id, (sidebar.data as User).id].sort().join('_')}
          />
        ) : sidebar.type === 'chat' ? (
          <ChatSidebar
            key={sidebar.id}
            sidebarId={sidebar.id}
            isOpen={true}
            onClose={() => handleCloseSidebar(sidebar.id)}
            task={sidebar.data as Task}
            clientName={clients.find((c) => c.id === (sidebar.data as Task).clientId)?.name || 'Sin cuenta'}
            users={memoizedUsers}
          />
        ) : sidebar.type === 'client-sidebar' ? (
          <ClientSidebar
            key={sidebar.id}
            isOpen={true}
            isEdit={sidebar.type === 'client-sidebar' && !!(sidebar.data as { client?: Client })?.client}
            initialForm={
              sidebar.type === 'client-sidebar' && (sidebar.data as { client?: Client })?.client
                ? {
                    id: (sidebar.data as { client?: Client }).client!.id,
                    name: (sidebar.data as { client?: Client }).client!.name,
                    imageFile: null,
                    imagePreview: (sidebar.data as { client?: Client }).client!.imageUrl,
                    projects: (sidebar.data as { client?: Client }).client!.projects.length
                      ? (sidebar.data as { client?: Client }).client!.projects
                      : [''],
                    deleteProjectIndex: null,
                    deleteConfirm: '',
                  }
                : {
                    name: '',
                    imageFile: null,
                    imagePreview: '/default-avatar.png',
                    projects: [''],
                    deleteProjectIndex: null,
                    deleteConfirm: '',
                  }
            }
            onFormSubmit={handleClientSubmit}
            onClose={() => handleCloseSidebar(sidebar.id)}
            isClientLoading={isClientLoading}
          />
        ) : sidebar.type === 'invite-sidebar' ? (
          <InviteSidebar
            key={sidebar.id}
            isOpen={true}
            onClose={() => handleCloseSidebar(sidebar.id)}
          />
        ) : null,
      )}
      {selectedProfileUser && (
        <ProfileCard
          userId={selectedProfileUser.id}
          imageUrl={selectedProfileUser.imageUrl}
          onClose={handleCloseProfile}
        />
      )}
      <div className={styles.vignetteTop} />
      <div className={styles.vignetteBottom} />
      <Dock />
    </div>
  );
}