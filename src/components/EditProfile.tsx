'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { gsap } from 'gsap';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { db } from '@/lib/firebase';
import styles from './EditProfile.module.scss';

interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  phone?: string | null | number;
  city?: string;
  birthday?: string;
  gender?: string;
  portfolio?: string;
  about?: string;
  tools?: string[];
  teams?: string[];
  coverPhoto?: string;
  profilePhoto?: string;
  status?: string;
}

interface FormData extends Omit<UserProfile, 'tools' | 'teams' | 'phone'> {
  toolsString?: string;
  teamsString?: string;
  tools?: string[];
  teams?: string[];
  phone?: string;
  password?: string;
}

interface Errors {
  displayName?: string;
  email?: string;
  role?: string;
  phone?: string;
  city?: string;
  birthday?: string;
  gender?: string;
  portfolio?: string;
  about?: string;
  toolsString?: string;
  teamsString?: string;
  coverPhoto?: string;
  profilePhoto?: string;
  password?: string;
}

interface EditProfileProps {
  userId: string;
  imageUrl: string;
  onClose: () => void;
}

const toolOptions = [
  'Adobe Photoshop', 'Adobe Illustrator', 'CorelDRAW', 'Canva', 'Affinity Designer', 'Adobe InDesign', 'GIMP', 'Sketch', 'Figma', 'Adobe XD', 'Microsoft Paint', 'Adobe Fresco', 'Gravit Designer', 'Inkscape', 'Photopea', 'Procreate', 'Adobe Lightroom', 'Vectornator', 'DrawPad', 'ArtRage',
  'InVision', 'Marvel', 'Axure RP', 'Balsamiq', 'Proto.io', 'Framer', 'Zeplin', 'Origami Studio', 'Principle', 'Justinmind', 'Uizard', 'Flinto', 'Craft', 'Moqups', 'UXPin',
  'Visual Studio Code', 'IntelliJ IDEA', 'PyCharm', 'Eclipse', 'Android Studio', 'Xcode', 'WebStorm', 'Sublime Text', 'Atom', 'Notepad++', 'Git', 'Docker', 'Jenkins', 'Postman', 'Sass', 'HTML', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js', 'Python', 'Ruby', 'PHP', 'Go', 'Kubernetes', 'Terraform', 'AWS', 'Azure', 'GCP',
  'Final Cut Pro', 'DaVinci Resolve', 'iMovie', 'Adobe Audition', 'Logic Pro X', 'FL Studio', 'Ableton Live', 'Audacity', 'Blender', 'Cinema 4D', 'Maya', 'Nuke', 'HitFilm Express', 'CapCut', 'Filmora', 'VSDC Free Video Editor', 'Shotcut', 'Adobe After Effects', 'Adobe Premiere Pro',
  'Microsoft Project', 'Basecamp', 'ClickUp', 'Smartsheet', 'Wrike', 'Teamwork', 'Todoist', 'Microsoft Planner', 'Airtable', 'Notion', 'Zoho Projects', 'MeisterTask', 'Redmine', 'ProofHub', 'Bitrix24', 'LiquidPlanner', 'Jira', 'Trello', 'Asana', 'Monday.com',
  'Google Sheets', 'Google Docs', 'Microsoft Teams', 'Slack', 'Zoom', 'Trello', 'Miro', 'Confluence',
  'SketchUp', 'ArchiCAD', 'Rhino', 'Lumion', '3ds Max', 'Vectorworks', 'Chief Architect', 'MicroStation', 'Civil 3D', 'V-Ray', 'Enscape', 'Sweet Home 3D', 'FormIt', 'ARCHICAD', 'Tekla Structures', 'Allplan', 'Revit', 'AutoCAD',
  'SPSS', 'SAS', 'MATLAB', 'Jupyter Notebook', 'Google Data Studio', 'QlikView', 'KNIME', 'RapidMiner', 'Alteryx', 'Stata', 'Apache Spark', 'Pandas', 'NumPy', 'Power Query', 'Tableau', 'Power BI', 'R', 'SQL', 'Excel',
  'Procreate', 'Corel Painter', 'Clip Studio Paint', 'Krita', 'ZBrush', 'Substance Painter', 'Affinity Photo', 'PaintTool SAI', 'Autodesk SketchBook', 'Medibang Paint', 'Rebelle', 'MyPaint', 'OpenCanvas', 'TwistedBrush',
  'Hootsuite', 'Buffer', 'Mailchimp', 'HubSpot', 'Google Analytics', 'SEMRush', 'Ahrefs', 'Canva', 'WordPress',
  'Unity', 'Unreal Engine', 'Arduino', 'Raspberry Pi', 'Linux', 'Windows', 'macOS'
];

const EditProfile = ({ userId, imageUrl, onClose }: EditProfileProps) => {
  const { user: currentUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [toolSuggestions, setToolSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const toolInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: userId, ...docSnap.data() } as UserProfile;
          let normalizedPhone = '';
          if (data.phone) {
            const phoneStr = typeof data.phone === 'string' ? data.phone : data.phone.toString();
            normalizedPhone = phoneStr.startsWith('+')
              ? phoneStr
              : `+52${phoneStr.replace(/\D/g, '').slice(0, 10)}`;
          }
          setProfile(data);
          setFormData({
            ...data,
            phone: normalizedPhone,
            toolsString: data.tools?.join(', ') || '',
            teamsString: data.teams?.join(', ') || '',
            tools: data.tools || [],
            teams: data.teams || [], // Ensure teams is always an array
            profilePhoto: data.profilePhoto || imageUrl,
            password: '',
          });
          setCoverPhotoPreview(data.coverPhoto || '/empty-cover.png');
          setProfilePhotoPreview(data.profilePhoto || imageUrl || '/default-avatar.png');
          console.log('[EditProfile] User profile fetched:', docSnap.data());
        } else {
          console.log('[EditProfile] No user document found for ID:', userId);
          setProfile(null);
          setFormData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[EditProfile] Error fetching user profile:', err);
        setProfile(null);
        setFormData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, imageUrl]);

  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      gsap.fromTo(
        modal,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node) && actionButtonRef.current && !actionButtonRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const textarea = document.querySelector(`.${styles.EditProfileTextarea}`) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      });
    }
  }, [formData?.about]);

  const validateForm = (): Errors => {
    const newErrors: Errors = {};

    if (!formData?.displayName) newErrors.displayName = 'El nombre es obligatorio';
    if (!formData?.email || !/^[^@]+@(sodio\.net|aurin\.com)$/.test(formData.email)) {
      newErrors.email = 'El correo debe terminar en @sodio.net o @aurin.com';
    }
    if (!formData?.role) newErrors.role = 'El rol es obligatorio';
    if (formData?.phone) {
      const phoneNumber = formData.phone.replace(/\D/g, '');
      if (phoneNumber.startsWith('52') && phoneNumber.length !== 12) {
        newErrors.phone = 'El teléfono con lada +52 debe tener 12 dígitos';
      } else if (!/^\+\d{1,3}\d+$/.test(formData.phone)) {
        newErrors.phone = 'El teléfono debe ser un número válido';
      }
    }
    if (formData?.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthday)) {
      newErrors.birthday = 'La fecha debe tener el formato AAAA-MM-DD';
    }
    if (formData?.portfolio && !/^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})?$/.test(formData.portfolio)) {
      newErrors.portfolio = 'El portafolio debe ser un dominio válido (e.g., karenortiz.space)';
    }
    if (coverPhotoFile && coverPhotoFile.size > 10 * 1024 * 1024) {
      newErrors.coverPhoto = 'La foto de portada no debe exceder 10MB';
    }
    if (profilePhotoFile && profilePhotoFile.size > 5 * 1024 * 1024) {
      newErrors.profilePhoto = 'La foto de perfil no debe exceder 5MB';
    }
    if (formData?.password && formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    return newErrors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            [name]: value,
            ...(name === 'toolsString' && { tools: value ? value.split(',').map((tool) => tool.trim()).filter(Boolean) : [] }),
            ...(name === 'teamsString' && { teams: value ? value.split(',').map((team) => team.trim()).filter(Boolean) : [] }),
          }
        : null
    );
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    const formatted = value
      ? value.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1-$2-$3-$4')
      : '';
    setFormData((prev) => (prev ? { ...prev, phone: value || '' } : null));
    setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const uploadImage = async (file: File, userId: string, type: 'cover' | 'profile') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('type', type);

      console.log('[EditProfile] Sending upload request:', {
        userId,
        type,
        fileName: file.name,
        fileSize: file.size,
      });

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'x-clerk-user-id': userId,
        },
      });

      console.log('[EditProfile] API response:', {
        status: response.status,
        statusText: response.statusText,
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[EditProfile] API error data:', data);
        throw new Error(data.error || `Error uploading ${type} image`);
      }
      return data.imageUrl;
    } catch (error) {
      console.error(`[EditProfile] ${type} image upload failed:`, error);
      throw error;
    }
  };

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, coverPhoto: 'La foto de portada no debe exceder 10MB' }));
        return;
      }
      setCoverPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPhotoPreview(reader.result as string);
        setActionMenuOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, profilePhoto: 'La foto de perfil no debe exceder 5MB' }));
        return;
      }
      setProfilePhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverPhotoEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    coverFileInputRef.current?.click();
  };

  const handleProfilePhotoEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    profileFileInputRef.current?.click();
  };

  const handleRemoveCoverPhoto = () => {
    setCoverPhotoPreview('/empty-cover.png');
    setCoverPhotoFile(null);
    setFormData((prev) => (prev ? { ...prev, coverPhoto: '/empty-cover.png' } : null));
    setActionMenuOpen(false);
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhotoPreview('/default-avatar.png');
    setProfilePhotoFile(null);
    setFormData((prev) => (prev ? { ...prev, profilePhoto: '/default-avatar.png' } : null));
  };

  const handleToolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => (prev ? { ...prev, toolsString: value } : null));
    if (value) {
      const suggestions = toolOptions
        .filter((tool) => tool.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setToolSuggestions(suggestions.length > 0 ? suggestions : ['No se encontraron coincidencias']);
    } else {
      setToolSuggestions([]);
    }
  };

  const addTool = useCallback(() => {
    if (toolInputRef.current && toolSuggestions.length > 0 && toolSuggestions[0] !== 'No se encontraron coincidencias') {
      const selectedTool = toolSuggestions[0];
      if (formData?.tools && formData.tools.length < 20 && !formData.tools.includes(selectedTool)) {
        setFormData((prev) => (prev ? { ...prev, tools: [...(prev.tools || []), selectedTool], toolsString: '' } : null));
        setToolSuggestions([]);
        toolInputRef.current.value = '';
      }
    }
  }, [toolSuggestions, formData?.tools]);

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion !== 'No se encontraron coincidencias' && formData?.tools && formData.tools.length < 20 && !formData.tools.includes(suggestion)) {
      setFormData((prev) => (prev ? { ...prev, tools: [...(prev.tools || []), suggestion], toolsString: '' } : null));
      setToolSuggestions([]);
      if (toolInputRef.current) toolInputRef.current.value = '';
    }
  };

  const removeTool = useCallback((index: number) => {
    setFormData((prev) =>
      prev ? { ...prev, tools: prev.tools?.filter((_, i) => i !== index) || [] } : null
    );
  }, []);

  const handleTeamInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            teams: prev.teams?.map((team, i) => (i === index ? value : team)) || [],
            teamsString: prev.teams?.join(', ') || '',
          }
        : null
    );
  };

  const addTeam = useCallback(() => {
    if (formData?.teams && formData.teams.length < 3 && formData.teams[formData.teams.length - 1]) {
      setFormData((prev) => {
        const currentTeams = Array.isArray(prev?.teams) ? prev.teams : [];
        return prev ? { ...prev, teams: [...currentTeams, ''] } : null;
      });
    }
  }, [formData?.teams]);

  const removeTeam = useCallback((index: number) => {
    setFormData((prev) =>
      prev ? { ...prev, teams: prev.teams?.filter((_, i) => i !== index) || [] } : null
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !userId || !currentUser) return;

    // Check if the only change is a file upload and skip if not intentional
    const hasOtherChanges = Object.keys(formData).some(
      (key) =>
        key !== 'profilePhotoFile' &&
        key !== 'coverPhotoFile' &&
        formData[key as keyof FormData] !== (profile?.[key as keyof UserProfile] || '')
    );
    if (!hasOtherChanges && (profilePhotoFile || coverPhotoFile)) {
      console.log('[EditProfile] Skipping save: Only file upload detected, not intentional.');
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      // Subir foto de portada si existe
      let coverPhotoUrl = formData.coverPhoto || '/empty-cover.png';
      if (coverPhotoFile) {
        coverPhotoUrl = await uploadImage(coverPhotoFile, userId, 'cover');
      }

      // Subir foto de perfil si existe
      let profilePhotoUrl = formData.profilePhoto || '/default-avatar.png';
      if (profilePhotoFile) {
        profilePhotoUrl = await uploadImage(profilePhotoFile, userId, 'profile');
        await currentUser.setProfileImage({ file: profilePhotoFile });
      }

      // Actualizar contraseña en Clerk si se proporcionó
      if (formData.password) {
        await currentUser.updatePassword({
          newPassword: formData.password,
        });
      }

      // Actualizar datos en Firestore
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        displayName: formData.displayName || '',
        email: formData.email || '',
        role: formData.role || '',
        phone: formData.phone || null,
        city: formData.city || '',
        birthday: formData.birthday || '',
        gender: formData.gender || '',
        portfolio: formData.portfolio || '',
        about: formData.about || '',
        tools: formData.tools || [],
        teams: formData.teams || [],
        coverPhoto: coverPhotoUrl,
        profilePhoto: profilePhotoUrl,
        status: formData.status || 'Disponible',
      });

      console.log('[EditProfile] Profile updated successfully');
      if (modalRef.current) {
        gsap.to(modalRef.current, {
          opacity: 0,
          scale: 0.8,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      } else {
        console.error('[EditProfile] modalRef.current is null, cannot animate close');
        onClose();
      }
    } catch (err) {
      console.error('[EditProfile] Error updating profile:', err);
      setErrors((prev) => ({
        ...prev,
        coverPhoto: err.message.includes('cover') ? 'Error al subir la foto de portada' : prev.coverPhoto,
        profilePhoto: err.message.includes('profile') ? 'Error al subir la foto de perfil' : prev.profilePhoto,
        password: err.message.includes('password') ? 'Error al actualizar la contraseña' : prev.password,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (modalRef.current) {
        gsap.to(modalRef.current, {
          opacity: 0,
          scale: 0.8,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      } else {
        console.error('[EditProfile] modalRef.current is null, cannot animate close');
        onClose();
      }
    }
  };

  const handleCloseButtonClick = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      console.error('[EditProfile] modalRef.current is null, cannot animate close');
      onClose();
    }
  };

  if (loading) {
    return createPortal(
      <div className={styles.EditProfileOverlay} onClick={handleOverlayClick}>
        <div ref={modalRef} className={styles.EditProfileFrameMain}>
          <div className={styles.EditProfileFrameInner}>
            <p>Cargando perfil...</p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!profile || !formData) {
    return createPortal(
      <div className={styles.EditProfileOverlay} onClick={handleOverlayClick}>
        <div ref={modalRef} className={styles.EditProfileFrameMain}>
          <div className={styles.EditProfileFrameInner}>
            <p>Perfil no encontrado.</p>
            <button className={styles.EditProfileButton} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const userName = formData.displayName || 'Usuario';
  const avatarUrl = profilePhotoPreview || '/default-avatar.png';

  return createPortal(
    <div className={styles.EditProfileOverlay} onClick={handleOverlayClick}>
      <div ref={modalRef} className={styles.EditProfileFrameMain}>
        <button
          onClick={handleCloseButtonClick}
          className={styles.EditProfileCloseButton}
          aria-label="Cerrar perfil"
        >
          ✕
        </button>
        {/* File inputs moved outside the form */}
        <input
          type="file"
          ref={profileFileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleProfilePhotoChange}
        />
        <input
          type="file"
          ref={coverFileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleCoverPhotoChange}
        />
        <form onSubmit={handleSubmit}>
          <div className={styles.EditProfileFrameInner}>
            <div className={`${styles.EditProfileCoverPhoto} ${!coverPhotoPreview || coverPhotoPreview === '/empty-cover.png' ? styles.EditProfileEmptyState : ''}`}>
              <Image
                src={coverPhotoPreview || '/empty-cover.png'}
                alt="Foto de portada"
                fill
                style={{ objectFit: 'cover' }}
                priority
                onError={() => {
                  setCoverPhotoPreview('/empty-cover.png');
                  setFormData((prev) => (prev ? { ...prev, coverPhoto: '/empty-cover.png' } : null));
                }}
              />
              {isOwnProfile && (
                <>
                  <button
                    ref={actionButtonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenuOpen(!actionMenuOpen);
                    }}
                    className={styles.EditProfileCoverPhotoButton}
                    aria-label="Editar foto de portada"
                  >
                    <Image src="/pencil.svg" alt="Editar" width={16} height={16} />
                  </button>
                  {actionMenuOpen && (
                    <div ref={actionMenuRef} className={styles.EditProfileCoverPhotoDropdown}>
                      <div
                        className={styles.EditProfileCoverPhotoDropdownItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCoverPhotoEditClick(e);
                          gsap.fromTo(
                            actionMenuRef.current,
                            { opacity: 0, y: -10 },
                            { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
                          );
                        }}
                      >
                        <Image src="/pencil.svg" alt="Editar" width={16} height={16} />
                        <span>Editar foto de portada</span>
                      </div>
                      <div
                        className={styles.EditProfileCoverPhotoDropdownItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCoverPhoto();
                          gsap.fromTo(
                            actionMenuRef.current,
                            { opacity: 0, y: -10 },
                            { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
                          );
                        }}
                      >
                        <Image src="/trash-2.svg" alt="Eliminar" width={16} height={16} />
                        <span>Eliminar foto de portada</span>
                      </div>
                    </div>
                  )}
                </>
              )}
              {errors.coverPhoto && <p className={styles.EditProfileError}>{errors.coverPhoto}</p>}
            </div>
            <div className={styles.EditProfileFrameContent}>
              <div className={styles.EditProfileContentWrapper}>
                <div className={styles.EditProfile}>
                  <div className={styles.EditProfileAvatar}>
                    {avatarUrl ? (
                      <>
                        <Image
                          draggable="false"
                          src={avatarUrl}
                          alt={userName}
                          width={120}
                          height={120}
                          style={{ borderRadius: '1000px' }}
                        />
                        {isOwnProfile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProfilePhotoEditClick(e);
                            }}
                            className={styles.EditProfileAvatarEditButton}
                            aria-label="Editar foto de perfil"
                          >
                            <Image src="/pencil.svg" alt="Editar" width={16} height={16} />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className={styles.EditProfileAvatarPlaceholder}>
                        <span>Sin foto</span>
                        {isOwnProfile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProfilePhotoEditClick(e);
                            }}
                            className={styles.EditProfileAvatarEditButton}
                            aria-label="Editar foto de perfil"
                          >
                            <Image src="/pencil.svg" alt="Editar" width={16} height={16} />
                          </button>
                        )}
                      </div>
                    )}
                    {errors.profilePhoto && <p className={styles.EditProfileError}>{errors.profilePhoto}</p>}
                  </div>
                  <div className={styles.EditProfileInputColumns}>
                    <div className={styles.EditProfileInputColumn}>
                      <div className={styles.EditProfileInputWrapper}>
                        <p className={styles.EditProfileInputName}>{formData.displayName || 'Sin nombre'}</p>
                      </div>
                      <div className={styles.EditProfileInputWrapper}>
                        <p className={styles.EditProfileInputRole}>{formData.role || 'Sin rol'}</p>
                        <div className={styles.EditProfileAboutSection}>
                          <div className={styles.EditProfileInputWrapper}>
                            <label className={styles.EditProfileLabelLarge}>Sobre mí</label>
                            <p className={styles.EditProfileTextarea}>{formData.about || 'No especificado'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.EditProfileAboutToolsContainer}>
                    <div className={styles.EditProfileToolsSection}>
                      <div className={styles.EditProfileInputWrapper}>
                        <label className={styles.EditProfileLabel}>Herramientas</label>
                        <div className={styles.EditProfileTags}>
                          {formData.tools && formData.tools.length > 0 ? (
                            formData.tools.map((tool, index) => (
                              <div key={index} className={styles.EditProfileTag}>
                                {tool}
                              </div>
                            ))
                          ) : (
                            <p>No especificado</p>
                          )}
                        </div>
                      </div>
                      <div className={styles.EditProfileInputWrapper}>
                        <label className={styles.EditProfileLabel}>Equipos</label>
                        <div className={styles.EditProfileTags}>
                          {formData.teams && formData.teams.length > 0 ? (
                            formData.teams.map((team, index) => (
                              <div key={index} className={styles.EditProfileTag}>
                                {team}
                              </div>
                            ))
                          ) : (
                            <p>No especificado</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.EditProfileInputColumns}>
                    <div className={styles.EditProfileInputColumn}>
                      <div className={styles.EditProfileInputWrapper}>
                        <input
                          type="text"
                          name="displayName"
                          value={formData.displayName || ''}
                          onChange={handleInputChange}
                          className={styles.EditProfileInput}
                          placeholder="Nombre"
                        />
                        {errors.displayName && <p className={styles.EditProfileError}>{errors.displayName}</p>}
                      </div>
                      <div className={styles.EditProfileInputWrapper}>
                        <input
                          type="text"
                          name="role"
                          value={formData.role || ''}
                          onChange={handleInputChange}
                          className={styles.EditProfileInput}
                          placeholder="Rol"
                        />
                        {errors.role && <p className={styles.EditProfileError}>{errors.role}</p>}
                        <div className={styles.EditProfileAboutSection}>
                          <div className={styles.EditProfileInputWrapper}>
                            <label className={styles.EditProfileLabelLarge}>Sobre mí</label>
                            <textarea
                              name="about"
                              value={formData.about || ''}
                              onChange={handleInputChange}
                              className={styles.EditProfileTextarea}
                              placeholder="Describe tu experiencia y habilidades"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.EditProfileInfoGrid}>
                      <div className={styles.EditProfileInputColumn}>
                        <div className={styles.EditProfileInputWrapperSmall}>
                          <Image
                            src="/mail.svg"
                            alt="Correo"
                            width={16}
                            height={16}
                            onError={(e) => {
                              e.currentTarget.src = '/default-icon.svg';
                            }}
                          />
                          <div>
                            <label className={styles.EditProfileLabel}>Correo</label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email || ''}
                              onChange={handleInputChange}
                              className={styles.EditProfileInput}
                              placeholder="karen@sodio.net"
                            />
                            {errors.email && <p className={styles.EditProfileError}>{errors.email}</p>}
                          </div>
                        </div>
                        <div className={styles.EditProfileInputWrapperSmall}>
                          <Image
                            src="/birthday.svg"
                            alt="Cumpleaños"
                            width={16}
                            height={16}
                            onError={(e) => {
                              e.currentTarget.src = '/default-icon.svg';
                            }}
                          />
                          <div>
                            <label className={styles.EditProfileLabel}>Cumpleaños</label>
                            <input
                              type="date"
                              name="birthday"
                              value={formData.birthday || ''}
                              onChange={handleInputChange}
                              className={styles.EditProfileInput}
                              placeholder="AAAA-MM-DD"
                            />
                            {errors.birthday && <p className={styles.EditProfileError}>{errors.birthday}</p>}
                          </div>
                        </div>
                      </div>
                      <div className={styles.EditProfileInputColumn}>
                        <div className={styles.EditProfileInputWrapperSmall}>
                          <Image
                            src="/phone.svg"
                            alt="Teléfono"
                            width={16}
                            height={16}
                            onError={(e) => {
                              e.currentTarget.src = '/default-icon.svg';
                            }}
                          />
                          <div>
                            <label className={styles.EditProfileLabel}>Teléfono</label>
                            <PhoneInput
                              international
                              countryCallingCodeEditable={false}
                              defaultCountry="MX"
                              value={formData.phone || ''}
                              onChange={handlePhoneChange}
                              className={styles.EditProfilePhoneInput}
                              placeholder="55-123-45-67"
                            />
                            {errors.phone && <p className={styles.EditProfileError}>{errors.phone}</p>}
                          </div>
                        </div>
                        <div className={styles.EditProfileInputWrapperSmall}>
                          <Image
                            src="/gender.svg"
                            alt="Género"
                            width={16}
                            height={16}
                            onError={(e) => {
                              e.currentTarget.src = '/default-icon.svg';
                            }}
                          />
                          <div>
                            <label className={styles.EditProfileLabel}>Género</label>
                            <input
                              type="text"
                              name="gender"
                              value={formData?.gender || ''}
                              onChange={handleInputChange}
                              className={styles.EditProfileInput}
                              placeholder="Género"
                            />
                          </div>
                        </div>
                      </div>
                      <div className={styles.EditProfileInputColumn}>
                        <div className={styles.EditProfileInputWrapperSmall}>
                          <Image
                            src="/location.svg"
                            alt="Ciudad"
                            width={16}
                            height={16}
                            onError={(e) => {
                              e.currentTarget.src = '/default-icon.svg';
                            }}
                          />
                          <div>
                            <label className={styles.EditProfileLabel}>Ciudad</label>
                            <input
                              type="text"
                              name="city"
                              value={formData?.city || ''}
                              onChange={handleInputChange}
                              className={styles.EditProfileInput}
                              placeholder="Ciudad"
                            />
                          </div>
                        </div>
                        <div className={styles.EditProfileInputWrapperSmall}>
                          <Image
                            src="/link.svg"
                            alt="Portafolio"
                            width={16}
                            height={16}
                            onError={(e) => {
                              e.currentTarget.src = '/default-icon.svg';
                            }}
                          />
                          <div>
                            <label className={styles.EditProfileLabel}>Portafolio</label>
                            <input
                              type="text"
                              name="portfolio"
                              value={formData?.portfolio || ''}
                              onChange={handleInputChange}
                              className={styles.EditProfileInput}
                              placeholder="karenortiz.space"
                            />
                            {errors.portfolio && <p className={styles.EditProfileError}>{errors.portfolio}</p>}
                          </div>
                        </div>
                      </div>
                      <div className={styles.EditProfileInputColumn}>
                        <div className={styles.EditProfileInputWrapperSmall}>
                          <Image
                            src="/lock.svg"
                            alt="Contraseña"
                            width={16}
                            height={16}
                            onError={(e) => {
                              e.currentTarget.src = '/default-icon.svg';
                            }}
                          />
                          <div>
                            <label className={styles.EditProfileLabel}>Contraseña</label>
                            <input
                              type="password"
                              name="password"
                              value={formData.password || ''}
                              onChange={handleInputChange}
                              className={styles.EditProfileInput}
                              placeholder="Nueva contraseña"
                            />
                            {errors.password && <p className={styles.EditProfileError}>{errors.password}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.EditProfileAboutToolsContainer}>
                    <div className={styles.EditProfileToolsSection}>
                      <div className={styles.EditProfileInputWrapper}>
                        <label className={styles.EditProfileLabel}>Herramientas</label>
                        <div className={styles.EditProfileToolsWrapper}>
                          <input
                            type="text"
                            ref={toolInputRef}
                            value={formData?.toolsString || ''}
                            onChange={handleToolInputChange}
                            onKeyPress={(e) => e.key === 'Enter' && addTool()}
                            placeholder="Añade una herramienta (ej. Figma)"
                            className={styles.EditProfileInput}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            className={styles.EditProfileAddToolButton}
                            onClick={addTool}
                            disabled={loading || toolSuggestions.length === 0 || toolSuggestions[0] === 'No se encontraron coincidencias' || (formData?.tools?.length || 0) >= 20}
                          >
                            +
                          </button>
                        </div>
                        {toolSuggestions.length > 0 && (
                          <div className={styles.EditProfileSuggestions}>
                            {toolSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className={`${styles.EditProfileSuggestionItem} ${suggestion === 'No se encontraron coincidencias' ? styles.EditProfileDisabledSuggestion : ''}`}
                                onClick={() => suggestion !== 'No se encontraron coincidencias' && handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={styles.EditProfileTags} ref={(el) => {
                        if (el) {
                          Array.from(el.children).forEach((child, index) => {
                            gsap.fromTo(child, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
                          });
                        }
                      }}>
                        {formData?.tools?.map((tool, index) => (
                          <div key={index} className={styles.EditProfileTag}>
                            {tool}
                            <button
                              type="button"
                              className={styles.EditProfileRemoveTagButton}
                              onClick={() => removeTool(index)}
                              disabled={loading}
                            >
                              ×
                            </button>
                          </div>
                        )) || []}
                      </div>
                    </div>
                    <div className={styles.EditProfileTeamsSection}>
                      <div className={styles.EditProfileInputWrapper}>
                        <label className={styles.EditProfileLabel}>Equipos</label>
                        {formData?.teams?.map((team, index) => (
                          <div key={index} className={styles.EditProfileTeamDropdownWrapper}>
                            <input
                              type="text"
                              value={team || ''}
                              onChange={(e) => handleTeamInputChange(e, index)}
                              className={styles.EditProfileInput}
                              placeholder="Añade un equipo"
                              disabled={loading}
                            />
                            {formData.teams.length > 1 && (
                              <button
                                type="button"
                                className={styles.EditProfileRemoveTeamButton}
                                onClick={() => removeTeam(index)}
                                disabled={loading}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {formData?.teams && formData.teams.length < 3 && formData.teams.some((t) => t) && (
                          <button
                            type="button"
                            className={styles.EditProfileAddTeamButton}
                            onClick={addTeam}
                            disabled={loading}
                          >
                            + Añadir otro equipo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <div className={styles.EditProfileButtonWrapper}>
                      <button type="submit" className={styles.EditProfileSaveButton} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Perfil'}
                      </button>
                      <button type="button" className={styles.EditProfileButton} onClick={handleCloseButtonClick}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditProfile;