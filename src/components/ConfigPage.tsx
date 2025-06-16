'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import Select from 'react-select';
import { db } from '@/lib/firebase';
import SuccessAlert from './SuccessAlert';
import FailAlert from './FailAlert';
import styles from './ConfigPage.module.scss';

interface Config {
  id: string;
  notificationsEnabled: boolean;
  darkMode: boolean;
  emailAlerts: boolean;
  taskReminders: boolean;
  highContrast: boolean;
  grayscale: boolean;
  soundEnabled: boolean;
  fullName?: string;
  role?: string;
  description?: string;
  birthDate?: string;
  phone?: string;
  city?: string;
  gender?: string;
  portfolio?: string;
  stack?: string[];
  teams?: string[];
  profilePhoto?: string;
  coverPhoto?: string;
}

interface ConfigForm extends Omit<Config, 'id'> {
  userId: string;
  profilePhotoFile?: File | null;
  coverPhotoFile?: File | null;
  phoneLada?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface User {
  id: string;
  fullName: string;
  teams?: string[];
}

interface ConfigPageProps {
  userId: string;
  onClose: () => void;
}

const ConfigPage: React.FC<ConfigPageProps> = ({ userId, onClose }) => {
  const { user: currentUser } = useUser();
  const [config, setConfig] = useState<Config | null>(null);
  const [formData, setFormData] = useState<ConfigForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ [team: string]: User[] }>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string; error?: string } | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    fullName?: string;
    role?: string;
    phone?: string;
    birthDate?: string;
    portfolio?: string;
    profilePhoto?: string;
    coverPhoto?: string;
  }>({});

  const technologies = [
    'React', // Frontend
    'Node.js', // Backend
    'TypeScript', // Frontend/Backend
    'JavaScript', // Frontend/Backend
    'Python', // Backend/Análisis de Datos/Inteligencia Artificial
    'SQL', // Análisis de Datos/Backend
    'MongoDB', // Backend
    'PostgreSQL', // Backend
    'Figma', // Diseño gráfico/UX/UI
    'Adobe XD', // Diseño gráfico/UX/UI
    'Sketch', // Diseño gráfico/UX/UI
    'Docker', // DevOps/Arquitectura
    'Kubernetes', // DevOps/Arquitectura
    'AWS', // DevOps/Arquitectura
    'Pandas', // Análisis de Datos
    'NumPy', // Análisis de Datos
    'TensorFlow', // Inteligencia Artificial
    'Blender', // Arte
    'Adobe Photoshop', // Arte/Diseño gráfico
    'No-Code Builders' // No-Code Builders
  ].sort();

  const teamsOptions = [
    'Análisis de Datos', 'Arquitectura', 'Arte', 'Backend', 'DevOps', 'Diseño gráfico',
    'Frontend', 'Inteligencia Artificial', 'No-Code Builders', 'UX/UI'
  ].sort();

  const ladaOptions = [
    { value: '+52', label: '+52 (México)' },
    { value: '+1', label: '+1 (EE.UU./Canadá)' },
    { value: '+44', label: '+44 (Reino Unido)' },
    { value: '+33', label: '+33 (Francia)' },
    { value: '+49', label: '+49 (Alemania)' }
  ];

  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Config & { id: string };
          setConfig(data);
          setFormData({
            userId,
            notificationsEnabled: data.notificationsEnabled || false,
            darkMode: data.darkMode || false,
            emailAlerts: data.emailAlerts || false,
            taskReminders: data.taskReminders || false,
            highContrast: data.highContrast || false,
            grayscale: data.grayscale || false,
            soundEnabled: data.soundEnabled || false,
            fullName: data.fullName || currentUser?.fullName || '',
            role: data.role || '',
            description: data.description || '',
            birthDate: data.birthDate || '',
            phone: data.phone?.startsWith('+') ? data.phone.split(' ').slice(1).join('') : '',
            phoneLada: data.phone?.startsWith('+') ? data.phone.split(' ')[0] : '+52',
            city: data.city || '',
            gender: data.gender || '',
            portfolio: data.portfolio || '',
            stack: data.stack || [],
            teams: data.teams || [],
            profilePhoto: data.profilePhoto || currentUser?.imageUrl || '/default-image.png',
            coverPhoto: data.coverPhoto || '/default-cover.png',
            profilePhotoFile: null,
            coverPhotoFile: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          console.log('[ConfigPage] User config fetched:', docSnap.data());
        } else {
          console.log('[ConfigPage] No user document found for ID:', userId);
          setConfig(null);
          setFormData({
            userId,
            notificationsEnabled: false,
            darkMode: false,
            emailAlerts: false,
            taskReminders: false,
            highContrast: false,
            grayscale: false,
            soundEnabled: false,
            fullName: currentUser?.fullName || '',
            role: '',
            description: '',
            birthDate: '',
            phone: '',
            phoneLada: '+52',
            city: '',
            gender: '',
            portfolio: '',
            stack: [],
            teams: [],
            profilePhoto: currentUser?.imageUrl || '/default-image.png',
            coverPhoto: '/default-cover.png',
            profilePhotoFile: null,
            coverPhotoFile: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('[ConfigPage] Error fetching user config:', err);
        setConfig(null);
        setFormData({
          userId,
          notificationsEnabled: false,
          darkMode: false,
          emailAlerts: false,
          taskReminders: false,
          highContrast: false,
          grayscale: false,
          soundEnabled: false,
          fullName: currentUser?.fullName || '',
          role: '',
          description: '',
          birthDate: '',
          phone: '',
          phoneLada: '+52',
          city: '',
          gender: '',
          portfolio: '',
          stack: [],
          teams: [],
          profilePhoto: currentUser?.imageUrl || '/default-image.png',
          coverPhoto: '/default-cover.png',
          profilePhotoFile: null,
          coverPhotoFile: null,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, currentUser]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!formData?.teams?.length) {
        setTeamMembers({});
        return;
      }

      try {
        const membersByTeam: { [team: string]: User[] } = {};
        for (const team of formData.teams) {
          const q = query(collection(db, 'users'), where('teams', 'array-contains', team));
          const querySnapshot = await getDocs(q);
          membersByTeam[team] = querySnapshot.docs
            .map((doc) => ({
              id: doc.id,
              fullName: doc.data().fullName || '',
              teams: doc.data().teams || [],
            }))
            .filter((member) => member.id !== userId);
        }
        setTeamMembers(membersByTeam);
      } catch (err) {
        console.error('[ConfigPage] Error fetching team members:', err);
      }
    };

    fetchTeamMembers();
  }, [formData?.teams, userId]);

  const validateForm = () => {
    const newErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
      fullName?: string;
      role?: string;
      phone?: string;
      birthDate?: string;
      portfolio?: string;
      profilePhoto?: string;
      coverPhoto?: string;
    } = {};

    if (!formData?.fullName) newErrors.fullName = 'El nombre es obligatorio';
    if (!formData?.role) newErrors.role = 'El rol es obligatorio';
    if (formData?.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        newErrors.phone = 'El teléfono debe tener 10 dígitos';
      }
    }
    if (formData?.birthDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(formData.birthDate)) {
      newErrors.birthDate = 'La fecha debe tener el formato DD/MM/AAAA';
    }
    if (formData?.portfolio && !/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(formData.portfolio)) {
      newErrors.portfolio = 'El portafolio debe ser una URL válida';
    }
    if (formData?.profilePhotoFile && formData.profilePhotoFile.size > 5 * 1024 * 1024) {
      newErrors.profilePhoto = 'La foto de perfil no debe exceder 5MB';
    }
    if (formData?.coverPhotoFile && formData.coverPhotoFile.size > 10 * 1024 * 1024) {
      newErrors.coverPhoto = 'La foto de portada no debe exceder 10MB';
    }
    if (formData?.newPassword || formData?.confirmPassword || formData?.currentPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'La contraseña actual es obligatoria para actualizar la contraseña';
      }
      if (!formData.newPassword) {
        newErrors.newPassword = 'La nueva contraseña es obligatoria';
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
          }
        : null
    );
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handleStackChange = useCallback((selectedOptions: { value: string; label: string }[]) => {
    const selectedValues = selectedOptions.map((option) => option.value).slice(0, 20);
    setFormData((prev) => (prev ? { ...prev, stack: selectedValues } : null));
  }, []);

  const handleTeamsChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map((option) => option.value).slice(0, 3);
    setFormData((prev) => (prev ? { ...prev, teams: selectedOptions } : null));
  }, []);

  const handlePhoneLadaChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => (prev ? { ...prev, phoneLada: e.target.value, phone: '' } : null));
    setErrors((prev) => ({ ...prev, phone: undefined }));
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.slice(0, 10);
    setFormData((prev) => (prev ? { ...prev, phone: value } : null));
    setErrors((prev) => ({ ...prev, phone: undefined }));
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    let formatted = '';
    if (value.length > 0) formatted += value.slice(0, 2);
    if (value.length > 2) formatted += '/' + value.slice(2, 4);
    if (value.length > 4) formatted += '/' + value.slice(4, 8);
    setFormData((prev) => (prev ? { ...prev, birthDate: formatted } : null));
    setErrors((prev) => ({ ...prev, birthDate: undefined }));
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'profilePhoto' | 'coverPhoto') => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) =>
        prev
          ? {
              ...prev,
              [`${type}File`]: file,
              [type]: URL.createObjectURL(file),
            }
          : null
      );
      setErrors((prev) => ({ ...prev, [type]: undefined }));
    }
  }, []);

  const uploadImage = async (file: File, userId: string, type: 'cover' | 'profile') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('type', type);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'x-clerk-user-id': userId,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Error uploading ${type} image`);
    }

    const data = await response.json();
    return data.imageUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !userId || !currentUser) return;

    if (!validateForm()) {
      setAlert({
        type: 'error',
        message: 'Por favor corrige los errores en el formulario',
        error: 'Validation failed',
      });
      return;
    }

    try {
      setLoading(true);

      let profilePhotoUrl = formData.profilePhoto;
      let coverPhotoUrl = formData.coverPhoto;

      // Upload profile photo if changed
      if (formData.profilePhotoFile) {
        profilePhotoUrl = await uploadImage(formData.profilePhotoFile, userId, 'profile');
        await currentUser.setProfileImage({ file: formData.profilePhotoFile });
      }

      // Upload cover photo if changed
      if (formData.coverPhotoFile) {
        coverPhotoUrl = await uploadImage(formData.coverPhotoFile, userId, 'cover');
      }

      // Update password in Clerk if provided
      if (formData.newPassword && formData.currentPassword) {
        await currentUser.updatePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });
      }

      // Update data in Firestore
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        notificationsEnabled: formData.notificationsEnabled,
        darkMode: formData.darkMode,
        emailAlerts: formData.emailAlerts,
        taskReminders: formData.taskReminders,
        highContrast: formData.highContrast,
        grayscale: formData.grayscale,
        soundEnabled: formData.soundEnabled,
        fullName: formData.fullName,
        role: formData.role,
        description: formData.description,
        birthDate: formData.birthDate,
        phone: formData.phone ? `${formData.phoneLada} ${formData.phone}` : '',
        city: formData.city,
        gender: formData.gender,
        portfolio: formData.portfolio,
        stack: formData.stack,
        teams: formData.teams,
        profilePhoto: profilePhotoUrl,
        coverPhoto: coverPhotoUrl,
      });

      setAlert({
        type: 'success',
        message: 'Campos guardados exitosamente',
      });
      setIsEditing(false);
      setTimeout(onClose, 1000); // Delay close to show success alert
    } catch (err) {
      console.error('[ConfigPage] Error updating config:', err);
      setAlert({
        type: 'error',
        message: 'Hubo un error al guardar los datos, por favor intenta más tarde',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEdit = () => {
    setIsEditing((prev) => !prev);
    setErrors({});
    setAlert(null);
  };

  const handleAlertClose = () => {
    setAlert(null);
  };

  if (loading) {
    return (
      <div className={styles.frame239189}>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className={styles.frame239189}>
        <p>Configuración no disponible.</p>
        <button className={styles.editButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <>
      <div className={styles.frame239189}>
        <div className={styles.frame239197} style={{ backgroundImage: `url(${formData.coverPhoto})` }}>
          {isOwnProfile && isEditing && (
            <button
              className={styles.editCoverButton}
              onClick={() => coverPhotoInputRef.current?.click()}
            >
              Editar Portada
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            ref={coverPhotoInputRef}
            style={{ display: 'none' }}
            onChange={(e) => handleImageChange(e, 'coverPhoto')}
          />
        </div>
        <div className={styles.frame2}>
          <div className={styles.frame1}>
            <div className={styles.profilePhotoContainer}>
              <Image
                src={formData.profilePhoto}
                alt="Profile Photo"
                width={94}
                height={94}
                className={styles.ellipse11}
              />
              {isOwnProfile && isEditing && (
                <button
                  className={styles.editProfilePhotoButton}
                  onClick={() => profilePhotoInputRef.current?.click()}
                >
                  Editar
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                ref={profilePhotoInputRef}
                style={{ display: 'none' }}
                onChange={(e) => handleImageChange(e, 'profilePhoto')}
              />
            </div>
            <div className={styles.frame239179}>
              <div className={styles.mainName}>{formData.fullName}</div>
              <div className={styles.exampleMailCom}>{currentUser?.primaryEmailAddress?.emailAddress}</div>
            </div>
          </div>
          {isOwnProfile && (
            <div className={styles.frame239191}>
              <button className={styles.editButton} onClick={toggleEdit}>
                {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
              </button>
            </div>
          )}
        </div>
        <div className={styles.frame239194}>
          <div className={styles.frame239193}>
            <div className={styles.frame239186}>
              <form onSubmit={handleSubmit}>
                <div  className={styles.form}>
                <div className={styles.informacionGeneral}>Información General:</div>
                <div className={styles.frame239184}>
                  <div className={styles.frame239182}>
                    <div className={styles.nombreCompleto}>Nombre Completo</div>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Escribe tu nombre completo"
                      className={styles.frame239180}
                      disabled={!isOwnProfile || !isEditing}
                    />
                    {errors.fullName && <p className={styles.errorText}>{errors.fullName}</p>}
                  </div>
                  <div className={styles.frame239183}>
                    <div className={styles.rolOCargo}>Rol o cargo</div>
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      placeholder="¿Cuál es tu cargo actual?"
                      className={styles.frame239181}
                      disabled={!isOwnProfile || !isEditing}
                    />
                    {errors.role && <p className={styles.errorText}>{errors.role}</p>}
                  </div>
                </div>
                <div className={styles.frame239188}>
                  <div className={styles.frame239182}>
                    <div className={styles.acercaDeTi}>Acerca de ti</div>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Breve descripción personal"
                      className={styles.frame239180}
                      disabled={!isOwnProfile || !isEditing}
                    />
                  </div>
                </div>
                <div className={styles.frame239186}>
                  <div className={styles.frame239182}>
                    <div className={styles.correoElectronicoNoEsEditable}>Correo electrónico</div>
                    <input
                      type="text"
                      value={currentUser?.primaryEmailAddress?.emailAddress || ''}
                      placeholder="correo@ejemplo.com"
                      className={styles.frame239180}
                      disabled
                    />
                  </div>
                  <div className={styles.frame239183}>
                    <div className={styles.fechaDeNacimiento}>Fecha de Nacimiento</div>
                    <input
                      type="text"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleDateChange}
                      placeholder="DD/MM/AAAA"
                      className={styles.frame239181}
                      disabled={!isOwnProfile || !isEditing}
                      maxLength={10}
                    />
                    {errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
                  </div>
                </div>
                <div className={styles.frame239187}>
                  <div className={styles.frame239182}>
                    <div className={styles.telefonoDeContacto}>Teléfono de contacto</div>
                    <div className={styles.phoneInputContainer}>
                      <select
                        name="phoneLada"
                        value={formData.phoneLada}
                        onChange={handlePhoneLadaChange}
                        className={styles.ladaSelect}
                        disabled={!isOwnProfile || !isEditing}
                      >
                        {ladaOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="phone"
                        value={formatPhoneNumber(formData.phone, formData.phoneLada)}
                        onChange={handlePhoneChange}
                        placeholder="(XX)-XXX-XX-XX"
                        className={styles.frame239180}
                        disabled={!isOwnProfile || !isEditing}
                        maxLength={14}
                      />
                    </div>
                    {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                  </div>
                  <div className={styles.frame239183}>
                    <div className={styles.ciudadDeResidencia}>Ciudad de residencia</div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Ciudad, País"
                      className={styles.frame239181}
                      disabled={!isOwnProfile || !isEditing}
                    />
                  </div>
                </div>
                <div className={styles.frame239185}>
                  <div className={styles.frame239182}>
                    <div className={styles.genero}>Género</div>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className={styles.frame239180}
                      disabled={!isOwnProfile || !isEditing}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                      <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                    </select>
                  </div>
                  <div className={styles.frame239183}>
                    <div className={styles.portafolioEnLinea}>Portafolio en línea</div>
                    <input
                      type="text"
                      name="portfolio"
                      value={formData.portfolio}
                      onChange={handleInputChange}
                      placeholder="https://miportafolio.com"
                      className={styles.frame239181}
                      disabled={!isOwnProfile || !isEditing}
                    />
                    {errors.portfolio && <p className={styles.errorText}>{errors.portfolio}</p>}
                  </div>
                </div>
                <div className={styles.seguridad}>
                  <div className={styles.informacionGeneral}>Seguridad:</div>
                  <div className={styles.frame239184}>
                    <div className={styles.frame239182}>
                      <div className={styles.contrasenaActual}>Contraseña actual</div>
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword || ''}
                        onChange={handleInputChange}
                        placeholder="Ingresa tu contraseña actual"
                        className={styles.frame239180}
                        disabled={!isOwnProfile || !isEditing}
                      />
                      {errors.currentPassword && <p className={styles.errorText}>{errors.currentPassword}</p>}
                    </div>
                    <div className={styles.frame239183}>
                      <div className={styles.nuevaContrasena}>Nueva Contraseña</div>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword || ''}
                        onChange={handleInputChange}
                        placeholder="Ingresa tu nueva contraseña"
                        className={styles.frame239181}
                        disabled={!isOwnProfile || !isEditing}
                      />
                      {errors.newPassword && <p className={styles.errorText}>{errors.newPassword}</p>}
                    </div>
                  </div>
                  <div className={styles.frame239184}>
                    <div className={styles.frame239182}>
                      <div className={styles.confirmarContrasena}>Confirmar Contraseña</div>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword || ''}
                        onChange={handleInputChange}
                        placeholder="Confirma tu nueva contraseña"
                        className={styles.frame239180}
                        disabled={!isOwnProfile || !isEditing}
                      />
                      {errors.confirmPassword && <p className={styles.errorText}>{errors.confirmPassword}</p>}
                    </div>
                    <div className={styles.frame239183}></div>
                  </div>
                </div>
                <div className={styles.frame239195}>
                  <div className={styles.stack}>Stack</div>
                  <div className={styles.seleccionaLasTecnologias}>
                    Selecciona las tecnologías y herramientas que usas frecuentemente.
                  </div>
                </div>
                <div className={styles.frame239189}>
                  <div className={styles.frame239182}>
                    <Select
                      isMulti
                      name="stack"
                      options={technologies.map((tech) => ({ value: tech, label: tech }))}
                      value={formData.stack.map((tech) => ({ value: tech, label: tech }))}
                      onChange={handleStackChange}
                      placeholder="Escribe y selecciona aquí tu stack"
                      className={styles.stackSelect}
                      isDisabled={!isOwnProfile || !isEditing}
                      noOptionsMessage={() => 'No se encontraron coincidencias'}
                      maxMenuHeight={200}
                      menuPlacement="auto"
                    />
                  </div>
                </div>
                <div className={styles.frame239196}>
                  <div className={styles.equiposALosQuePerteneces}>Equipos a los que perteneces</div>
                  <div className={styles.escribeYSeleccionaEquipos}>Escribe y selecciona aquí tus equipos</div>
                </div>
                <div className={styles.frame239190}>
                  <div className={styles.frame239182}>
                    <select
                      name="teams"
                      multiple
                      value={formData.teams}
                      onChange={handleTeamsChange}
                      className={styles.frame239180}
                      disabled={!isOwnProfile || !isEditing}
                    >
                      {teamsOptions.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                    {formData.teams.map((team) => (
                      <div key={team} className={styles.teamMembers}>
                        <h4>{team}</h4>
                        {teamMembers[team]?.length ? (
                          <ul>
                            {teamMembers[team].map((member) => (
                              <li key={member.id}>{member.fullName}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>No hay otros miembros en este equipo.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
            </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      {alert?.type === 'success' && (
        <SuccessAlert
          message={alert.message}
          onClose={handleAlertClose}
        />
      )}
      {alert?.type === 'error' && (
        <FailAlert
          message={alert.message}
          error={alert.error || 'Unknown error'}
          onClose={handleAlertClose}
        />
      )}
    </>
  );
};

const formatPhoneNumber = (phone: string, lada: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 2) return `${lada} (${digits})`;
  if (digits.length <= 5) return `${lada} (${digits.slice(0, 2)})-${digits.slice(2)}`;
  if (digits.length <= 7) return `${lada} (${digits.slice(0, 2)})-${digits.slice(2, 5)}-${digits.slice(5)}`;
  return `${lada} (${digits.slice(0, 2)})-${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 10)}`;
};

export default ConfigPage;
