'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  updateDoc,
  orderBy,
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
import AISidebar from '@/components/AISidebar';
import ChatSidebar from '@/components/ChatSidebar';
import ClientPopup from '@/components/ClientSidebar';
import InviteSidebar from '@/components/InviteSidebar';
import MessageSidebar from '@/components/MessageSidebar';
import ProfileSidebar from '@/components/ProfileSidebar';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import styles from '@/components/TasksPage.module.scss';
import clientStyles from '@/components/ClientsTable.module.scss';
import { v4 as uuidv4 } from 'uuid';

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
  message: string;
  timestamp: Timestamp;
  read: boolean;
  recipientId: string;
  conversationId?: string;
  taskId?: string;
  type?: string;
}

interface Sidebar {
  id: string;
  type: 'message' | 'chat';
  data: User | Task;
}

export default function TasksPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedContainer, setSelectedContainer] = useState<'tareas' | 'cuentas' | 'miembros'>('tareas');
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState<string | null>(null);
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState<string | null>(null);
  const [isInviteSidebarOpen, setIsInviteSidebarOpen] = useState(false);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState<string | null>(null);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [openSidebars, setOpenSidebars] = useState<Sidebar[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [clientForm, setClientForm] = useState<{
    id?: string;
    name: string;
    imageFile: File | null;
    imagePreview: string;
    projects: string[];
    deleteProjectIndex: number | null;
    deleteConfirm: string;
  }>({
    name: '',
    imageFile: null,
    imagePreview: '/default-avatar.png',
    projects: [''],
    deleteProjectIndex: null,
    deleteConfirm: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const createEditPopupRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const memoizedClients = useMemo(() => clients, [clients]);
  const memoizedUsers = useMemo(() => users, [users]);
  const memoizedTasks = useMemo(() => tasks, [tasks]);

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
      const usersData: User[] = clerkUsers.map((user) => ({
        id: user.id,
        imageUrl: user.imageUrl || '/default-avatar.png',
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre',
        role: user.publicMetadata.role || 'Sin rol',
        description: user.publicMetadata.description || 'Sin descripción',
      }));
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
        createdAt: doc.data().createdAt || '',
      }));
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'tasks'));
      const tasksData: Task[] = querySnapshot.docs
        .map((doc) => ({
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
        }))
        .filter(
          (task) =>
            task.AssignedTo.includes(user?.id || '') ||
            task.LeadedBy.includes(user?.id || '') ||
            task.CreatedBy === user?.id,
        );
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    }
  }, [user?.id]);

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
    );
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationsData: Notification[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          userId: doc.data().userId,
          message: doc.data().message,
          timestamp: doc.data().timestamp,
          read: doc.data().read || false,
          recipientId: doc.data().recipientId,
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

  useEffect(() => {
    if (user?.id) {
      fetchUsers();
      fetchClients();
      fetchTasks();
      const unsubscribe = fetchNotifications();
      return () => unsubscribe && unsubscribe();
    }
  }, [fetchUsers, fetchClients, fetchTasks, fetchNotifications, user?.id]);

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
    setIsCreateClientOpen(true);
    setIsEditClientOpen(null);
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
    setIsEditClientOpen(client.id);
    setIsCreateClientOpen(false);
  }, []);

  const handleClientSubmit = useCallback(
    async (e: React.FormEvent, clientId?: string) => {
      e.preventDefault();
      if (!user || !clientForm.name.trim()) {
        alert('El nombre de la cuenta es obligatorio.');
        return;
      }

      setIsClientLoading(true);
      try {
        let imageUrl = clientForm.imagePreview;
        if (clientForm.imageFile) {
          const formData = new FormData();
          formData.append('file', clientForm.imageFile);
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error('Failed to upload image');
          const data = await response.json();
          imageUrl = data.imageUrl;
        }

        const clientData: Client = {
          id: clientId || doc(collection(db, 'clients')).id,
          name: clientForm.name.trim(),
          imageUrl: imageUrl || '/default-avatar.png',
          projectCount: clientForm.projects.filter((p) => p.trim()).length,
          projects: clientForm.projects.filter((p) => p.trim()),
          createdBy: clientId
            ? clients.find((c) => c.id === clientId)?.createdBy || user.id
            : user.id,
          createdAt: clientId
            ? clients.find((c) => c.id === clientId)?.createdAt || new Date().toISOString()
            : new Date().toISOString(),
        };

        await setDoc(doc(db, 'clients', clientData.id), clientData);
        setClients((prev) =>
          clientId
            ? prev.map((c) => (c.id === clientId ? clientData : c))
            : [...prev, clientData],
        );
        gsap.to(createEditPopupRef.current, {
          opacity: 0,
          y: 50,
          scale: 0.95,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            setIsCreateClientOpen(false);
            setIsEditClientOpen(null);
            setIsClientLoading(false);
          },
        });
        setClientForm({
          name: '',
          imageFile: null,
          imagePreview: '/default-avatar.png',
          projects: [''],
          deleteProjectIndex: null,
          deleteConfirm: '',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Error saving client:', error);
        alert('Error al guardar la cuenta.');
        setIsClientLoading(false);
      }
    },
    [user, clientForm, clients],
  );

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Image selected:', file.name);
      const previewUrl = URL.createObjectURL(file);
      setClientForm((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: previewUrl,
      }));
    }
  }, []);

  const handleAddProject = useCallback(() => {
    setClientForm((prev) => ({ ...prev, projects: [...prev.projects, ''] }));
  }, []);

  const handleProjectChange = useCallback((index: number, value: string) => {
    setClientForm((prev) => {
      const newProjects = [...prev.projects];
      newProjects[index] = value;
      return { ...prev, projects: newProjects };
    });
  }, []);

  const handleDeleteProjectClick = useCallback((index: number) => {
    setClientForm((prev) => ({ ...prev, deleteProjectIndex: index }));
  }, []);

  const handleDeleteProjectConfirm = useCallback(() => {
    if (clientForm.deleteProjectIndex !== null) {
      setClientForm((prev) => ({
        ...prev,
        projects: prev.projects.filter((_, i) => i !== clientForm.deleteProjectIndex),
        deleteProjectIndex: null,
        deleteConfirm: '',
      }));
    }
  }, [clientForm.deleteProjectIndex]);

  const handleClientPopupClose = useCallback(() => {
    gsap.to(createEditPopupRef.current, {
      opacity: 0,
      y: 50,
      scale: 0.95,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        setIsCreateClientOpen(false);
        setIsEditClientOpen(null);
      },
    });
  }, []);

  const handleNewTaskOpen = useCallback(() => {
    router.push('/dashboard/new-task');
  }, [router]);

  const handleAISidebarOpen = useCallback(() => {
    setIsAISidebarOpen(true);
  }, []);

  const handleInviteSidebarOpen = useCallback(() => {
    setIsInviteSidebarOpen(true);
  }, []);

  const handleChatSidebarOpen = useCallback((task: Task) => {
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'chat', data: task },
    ]);
  }, []);

  const handleMessageSidebarOpen = useCallback((user: User) => {
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'message', data: user },
    ]);
  }, []);

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
        if (notification.type === 'private_message' && notification.conversationId) {
          const receiverId = notification.userId === user?.id ? notification.recipientId : notification.userId;
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
  }, [selectedContainer]);

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
        />
      </div>
      <OnboardingStepper />
      <div ref={selectorRef} className={styles.selector}>
        <Selector
          selectedContainer={selectedContainer}
          setSelectedContainer={setSelectedContainer}
        />
      </div>
      <div ref={contentRef} className={styles.content}>
        {selectedContainer === 'tareas' && (
          <TasksTable
            tasks={memoizedTasks}
            clients={memoizedClients}
            onCreateClientOpen={handleCreateClientOpen}
            onInviteMemberOpen={handleInviteSidebarOpen}
            onNewTaskOpen={handleNewTaskOpen}
            onAISidebarOpen={handleAISidebarOpen}
            onChatSidebarOpen={handleChatSidebarOpen}
            setTasks={setTasks}
          />
        )}
        {selectedContainer === 'cuentas' && (
          <ClientsTable
            clients={memoizedClients}
            onCreateOpen={handleCreateClientOpen}
            onEditOpen={handleEditClientOpen}
            onDeleteOpen={(clientId) => setIsDeleteClientOpen(clientId)}
            setClients={setClients}
          />
        )}
        {selectedContainer === 'miembros' && (
          <MembersTable
            users={memoizedUsers}
            onInviteSidebarOpen={handleInviteSidebarOpen}
            onProfileSidebarOpen={setIsProfileSidebarOpen}
            onMessageSidebarOpen={handleMessageSidebarOpen}
            setUsers={setUsers}
          />
        )}
      </div>
      <ClientPopup
        isOpen={isCreateClientOpen || !!isEditClientOpen}
        isEdit={!!isEditClientOpen}
        clientForm={clientForm}
        setClientForm={setClientForm}
        fileInputRef={fileInputRef}
        handleImageChange={handleImageChange}
        handleProjectChange={handleProjectChange}
        handleAddProject={handleAddProject}
        handleDeleteProjectClick={handleDeleteProjectClick}
        handleDeleteProjectConfirm={handleDeleteProjectConfirm}
        handleClientSubmit={handleClientSubmit}
        onClose={handleClientPopupClose}
        isClientLoading={isClientLoading}
      />
      {isDeleteClientOpen && (
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
      <InviteSidebar isOpen={isInviteSidebarOpen} onClose={() => setIsInviteSidebarOpen(false)} />
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
  sidebar.type === 'message' && user?.id ? ( // Asegúrate de que user.id exista
    <MessageSidebar
      key={sidebar.id}
      sidebarId={sidebar.id}
      isOpen={true}
      onClose={() => handleCloseSidebar(sidebar.id)}
      senderId={user.id} // Usa user.id directamente
      receiver={sidebar.data as User}
      onOpenSidebar={handleOpenSidebar}
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
  ) : null,
)}
      <div className={styles.vignetteTop} />
      <div className={styles.vignetteBottom} />
    </div>
  );
}