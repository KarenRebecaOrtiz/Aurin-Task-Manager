'use client';
import { useState, useEffect, useRef } from 'react';
import Table from './Table';
import Image from 'next/image';
import styles from './MembersTable.module.scss';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
}

const MembersTable = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<string>('fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const profilePopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const clerkUsers = await response.json();
        const formattedUsers: User[] = clerkUsers.map((user: any) => ({
          id: user.id,
          imageUrl: user.imageUrl || '/default-avatar.png',
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre',
          role: user.publicMetadata.role || 'Sin rol',
          description: user.publicMetadata.description || 'Sin descripción',
        }));
        setUsers(formattedUsers);
        setFilteredUsers(formattedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(null);
      }
      if (profilePopupRef.current && !profilePopupRef.current.contains(event.target as Node)) {
        setIsProfileOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleActionClick = (userId: string) => {
    setIsActionMenuOpen(isActionMenuOpen === userId ? null : userId);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (!response.ok) throw new Error('Failed to send invite');
      alert(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
      setIsInviteOpen(false);
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Error al enviar la invitación');
    }
  };

  const handleProfileClick = (userId: string) => {
    setIsProfileOpen(userId);
    setIsActionMenuOpen(null);
  };

  const handleDeleteRequest = async (user: User) => {
    try {
      const response = await fetch('/api/request-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, fullName: user.fullName }),
      });
      if (!response.ok) throw new Error('Failed to request deletion');
      alert(`Solicitud de eliminación enviada para ${user.fullName}`);
    } catch (error) {
      console.error('Error requesting deletion:', error);
      alert('Error al solicitar la eliminación');
    }
    setIsActionMenuOpen(null);
  };

  const columns = [
    {
      key: 'imageUrl',
      label: '',
      width: '10%',
      render: (user: User) => (
        <Image
          src={user.imageUrl}
          alt={user.fullName}
          width={38}
          height={38}
          className={styles.profileImage}
        />
      ),
    },
    {
      key: 'fullName',
      label: 'Nombre',
      width: '60%',
    },
    {
      key: 'role',
      label: 'Rol',
      width: '20%',
    },
    {
      key: 'action',
      label: 'Acciones',
      width: '10%',
      render: (user: User) => (
        <div className={styles.actionContainer}>
          <button onClick={() => handleActionClick(user.id)} className={styles.actionButton}>
            <Image src="/elipsis.svg" alt="Actions" width={16} height={16} />
          </button>
          {isActionMenuOpen === user.id && (
            <div ref={actionMenuRef} className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownTitle}>Acciones</div>
              </div>
              <div className={styles.dropdownItem} onClick={() => handleProfileClick(user.id)}>
                <Image src="/user-round.svg" alt="Profile" width={16} height={16} />
                <span>Perfil</span>
              </div>
              <div className={styles.dropdownItem} onClick={() => handleDeleteRequest(user)}>
                <Image src="/trash-2.svg" alt="Delete" width={16} height={16} />
                <span className={styles.deleteText}>Solicitar Eliminar Miembro</span>
              </div>
            </div>
          )}
          {isProfileOpen === user.id && (
            <div className={styles.profilePopupOverlay} style={{ position: 'fixed' }}>
              <div ref={profilePopupRef} className={styles.profilePopup}>
                <button className={styles.closeButton} onClick={() => setIsProfileOpen(null)}>
                  <Image src="/arrow-left.svg" alt="Close" width={16} height={16} />
                </button>
                <div className={styles.profileContent}>
                  <h2 className={styles.profileTitle}>Información de Perfil</h2>
                  <Image
                    src={user.imageUrl}
                    alt={user.fullName}
                    width={109}
                    height={109}
                    className={styles.profileAvatar}
                  />
                  <div className={styles.profileUsername}>{user.fullName}</div>
                  <div className={styles.profileField}>
                    <span className={styles.profileLabel}>Nombre completo:</span>
                    <span className={styles.profileValue}>{user.fullName}</span>
                  </div>
                  <div className={styles.profileField}>
                    <span className={styles.profileLabel}>Descripción breve:</span>
                    <span className={styles.profileValue}>{user.description}</span>
                  </div>
                  <div className={styles.profileField}>
                    <span className={styles.profileLabel}>Rol o área de trabajo:</span>
                    <span className={styles.profileValue}>{user.role}</span>
                  </div>
                  <button className={styles.confirmButton} onClick={() => setIsProfileOpen(null)}>
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Buscar Miembros"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.inviteButtonWrapper}>
          <button onClick={() => setIsInviteOpen(true)} className={styles.inviteButton}>
            <Image src="/wallet-cards.svg" alt="Invite" width={17} height={17} />
            Invitar Miembro
          </button>
        </div>
      </div>
      <Table
        data={filteredUsers}
        columns={columns}
        itemsPerPage={10}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
      {isInviteOpen && (
        <div className={styles.invitePopupOverlay} style={{ position: 'fixed' }}>
          <div className={styles.invitePopup}>
            <div className={styles.inviteContent}>
              <h2 className={styles.inviteTitle}>Invita a un nuevo miembro</h2>
              <p className={styles.inviteSubtitle}>
                Escribe el correo electrónico de la persona que quieres invitar a esta cuenta.
              </p>
              <form onSubmit={handleInviteSubmit}>
                <div className={styles.inviteField}>
                  <label className={styles.inviteLabel}>Correo electrónico:</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="mail@dominio.com"
                    className={styles.inviteInput}
                    required
                  />
                </div>
                <button type="submit" className={styles.inviteSubmitButton}>
                  Enviar Invitación
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersTable;
