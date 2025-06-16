'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SuccessAlert from './SuccessAlert';
import FailAlert from './FailAlert';
import styles from './OnboardingStepper.module.scss';

// Register GSAP ScrollToPlugin
gsap.registerPlugin(ScrollToPlugin);

const teamOptions = [
  'Diseño Gráfico',
  'Diseño UX/UI',
  'Desarrollo',
  'Stylish',
  'Project Management',
  'Dirección',
  'Arquitectura',
  'Análisis de Datos',
  'Arte',
];

const OnboardingStepper = () => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [portfolio, setPortfolio] = useState<string>('');
  const [isEditingPortfolio, setIsEditingPortfolio] = useState<boolean>(false);
  const [about, setAbout] = useState<string>('');
  const [tools, setTools] = useState<string[]>([]);
  const [toolInput, setToolInput] = useState<string>('');
  const [teams, setTeams] = useState<string[]>(['']);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role: string; imageUrl: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string>('/empty-cover.png');
  const [alerts, setAlerts] = useState<{ id: string; type: 'success' | 'failure'; message?: string; error?: string }[]>([]);
  const stepperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current += 1;
    console.log('[OnboardingStepper] Component rendered, count:', renderCountRef.current);
  });

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const onboardingCompleted = data.onboardingCompleted ?? false; // Treat missing field as false
          console.log('[OnboardingStepper] User data fetched, onboardingCompleted:', onboardingCompleted);
          setIsOpen(!onboardingCompleted); // Show stepper only if not completed
          if (!onboardingCompleted) {
            setName(data.displayName || '');
            setEmail(data.email || user.emailAddresses[0]?.emailAddress || '');
            setRole(data.role || '');
            setPhone(data.phone ? String(data.phone) : '');
            setCity(data.city || '');
            setBirthday(data.birthday || '');
            setGender(data.gender || '');
            setPortfolio(data.portfolio || '');
            setAbout(data.about || '');
            setTools(data.tools || []);
            if (!isSubmittingRef.current) {
              setTeams(data.teams || ['']);
            }
            setCoverPhotoPreview(data.coverPhoto || '/empty-cover.png');
            setStep(data.currentStep || 1);
          }
        } else {
          console.log('[OnboardingStepper] No user document found, assuming first login, showing stepper');
          setIsOpen(true); // No document means first login, show stepper
        }
      },
      (err) => {
        console.error('[OnboardingStepper] Error fetching user data:', err);
        setError('Error al cargar datos del usuario.');
      }
    );

    const stepper = stepperRef.current;
    const content = contentRef.current;
    if (stepper && content && isOpen) {
      gsap.fromTo(
        stepper,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
      if (step === 1) {
        gsap.fromTo(
          content.querySelectorAll(`.${styles.card}, .${styles.inputWrapper}, .${styles.aboutToolsContainer}, .${styles.teamsSection}`),
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 0.3 }
        );
        gsap.fromTo(
          content.querySelectorAll(`.${styles.inputWrapper}`),
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: content,
              start: 'top 80%',
              end: 'bottom 20%',
              scrub: true,
            },
          }
        );
      }
    }

    return () => unsubscribe();
  }, [user, step, isOpen]);

  useEffect(() => {
    if (teams.every((team) => !team)) {
      setTeamMembers([]);
      return;
    }

    const validTeams = teams.filter((team) => team);
    if (validTeams.length === 0) return;

    const q = query(collection(db, 'users'), where('team', 'in', validTeams));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const members = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().displayName || 'Sin nombre',
          role: doc.data().role || 'Sin rol',
          imageUrl: doc.data().profileImageUrl || '/default-avatar.png',
        }));
        setTeamMembers(members);
        console.log('[OnboardingStepper] Team members updated:', { teams: validTeams, memberCount: members.length });
      },
      (error) => {
        console.error('[OnboardingStepper] Error fetching team members:', error);
      }
    );

    return () => unsubscribe();
  }, [teams]);

  const addTool = useCallback(() => {
    if (toolInput.trim() && tools.length < 9) {
      const newTool = toolInput.trim();
      setTools((prev) => [...prev, newTool]);
      setToolInput('');
      if (tagsRef.current) {
        const newTag = tagsRef.current.children[tools.length];
        gsap.fromTo(
          newTag,
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
        );
      }
    } else if (tools.length >= 9) {
      setError('Máximo 9 herramientas permitidas.');
    }
  }, [toolInput, tools]);

  const removeTool = useCallback(
    (index: number) => {
      if (tagsRef.current) {
        const tag = tagsRef.current.children[index];
        gsap.to(tag, {
          opacity: 0,
          scale: 0.5,
          duration: 0.3,
          ease: 'back.in(1.7)',
          onComplete: () => {
            setTools((prev) => prev.filter((_, i) => i !== index));
          },
        });
      } else {
        setTools((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [tools]
  );

  const handleCoverPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const triggerCoverFileInput = useCallback(() => {
    coverFileInputRef.current?.click();
  }, []);

  const handleTeamChange = (index: number, value: string) => {
    setTeams((prev) => {
      const newTeams = [...prev];
      newTeams[index] = value;
      return newTeams;
    });
  };

  const addTeamDropdown = () => {
    if (teams.length < 3) {
      setTeams((prev) => [...prev, '']);
    }
  };

  const removeTeamDropdown = (index: number) => {
    setTeams((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (file: File, userId: string, type: 'cover') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('type', type);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error uploading ${type} image`);
      return data.imageUrl;
    } catch (error) {
      console.error('[OnboardingStepper] Image upload failed:', error);
      throw error;
    }
  };

  const validateBirthday = (value: string): boolean => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(value)) return false;
    const [, day, month, year] = value.match(regex) || [];
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= new Date().getFullYear();
  };

  const validatePhone = (value: string | undefined): boolean => {
    if (!value) return true;
    return /^\+?\d+$/.test(value.replace(/\s/g, ''));
  };

  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    let formatted = '';
    if (value.length > 0) formatted += value.slice(0, 2);
    if (value.length > 2) formatted += '/' + value.slice(2, 4);
    if (value.length > 4) formatted += '/' + value.slice(4, 8);
    setBirthday(formatted);
  };

  const handlePortfolioEdit = async () => {
    if (!user?.id) return;

    if (isEditingPortfolio) {
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.id);
        await setDoc(userDocRef, { portfolio }, { merge: true });
        setIsEditingPortfolio(false);
      } catch (err) {
        console.error('[OnboardingStepper] Portfolio save error:', err);
        setError('Error al guardar el portafolio.');
      } finally {
        setLoading(false);
      }
    } else {
      setIsEditingPortfolio(true);
    }
  };

  const addAlert = (type: 'success' | 'failure', message?: string, error?: string) => {
    const id = `${type}-${Date.now()}`;
    console.log(`[OnboardingStepper] Adding ${type} alert with ID:`, id);
    setAlerts((prev) => [...prev, { id, type, message, error }]);
  };

  const removeAlert = (id: string) => {
    console.log('[OnboardingStepper] Removing alert with ID:', id);
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const advanceToStep2 = async () => {
    if (!user?.id) return;

    try {
      const userDocRef = doc(db, 'users', user.id);
      await setDoc(userDocRef, { currentStep: 2 }, { merge: true });
      console.log('[OnboardingStepper] Step changed to 2');
      setStep(2);
      const stepper = stepperRef.current;
      if (stepper) {
        gsap.to(stepper, {
          opacity: 0,
          scale: 0.95,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            gsap.fromTo(
              stepper,
              { opacity: 0, scale: 0.95 },
              { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
            );
            gsap.to(window, { scrollTo: 0, duration: 0.5, ease: 'power2.out' });
          },
        });
      }
    } catch (err) {
      console.error('[OnboardingStepper] Error advancing to Step 2:', err);
      setError('Error al avanzar al siguiente paso.');
      addAlert('failure', 'No se pudo actualizar el perfil.', err.message || 'Error desconocido');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current) {
      console.log('[OnboardingStepper] Submission already in progress, skipping');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      if (!role || teams.every((team) => !team)) {
        throw new Error('El rol y al menos un equipo son obligatorios');
      }

      if (birthday && !validateBirthday(birthday)) {
        throw new Error('Fecha de nacimiento inválida (DD/MM/AAAA)');
      }

      if (!validatePhone(phone)) {
        throw new Error('Teléfono debe contener solo números y opcionalmente un "+"');
      }

      let coverPhotoUrl = coverPhotoPreview;

      if (coverPhotoFile) {
        coverPhotoUrl = await uploadImage(coverPhotoFile, user.id, 'cover');
      }

      const userDocRef = doc(db, 'users', user.id);
      const userData = {
        displayName: name,
        email,
        role,
        phone: phone ? parseInt(phone.replace(/\s|\+/g, ''), 10) : null,
        city,
        birthday,
        gender,
        portfolio,
        about,
        tools,
        teams: teams.filter((team) => team),
        coverPhoto: coverPhotoUrl,
        currentStep: 2,
      };

      console.log('[OnboardingStepper] Writing to Firestore:', userData);
      await setDoc(userDocRef, userData, { merge: true });

      const updatedDoc = await getDoc(userDocRef);
      if (updatedDoc.exists() && updatedDoc.data().currentStep === 2) {
        console.log('[OnboardingStepper] Firestore update verified, adding success alert');
        addAlert('success', 'Perfil actualizado exitosamente. ¡Tu información está lista para comenzar!');
      } else {
        throw new Error('Datos no actualizados correctamente en Firestore');
      }

      await advanceToStep2();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar los datos';
      console.error('[OnboardingStepper] Submit error:', message);
      setError(message);
      console.log('[OnboardingStepper] Adding failure alert with message:', message);
      addAlert('failure', 'No se pudo actualizar el perfil.', message);
      await advanceToStep2();
    } finally {
      console.log('[OnboardingStepper] Submission complete, resetting loading and isSubmitting');
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  useEffect(() => {
    console.log('[OnboardingStepper] Alerts state changed:', alerts);
  }, [alerts]);

  const handleNext = async () => {
    if (step < 5) {
      const newStep = step + 1;
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.id);
        await setDoc(userDocRef, { currentStep: newStep }, { merge: true });
        console.log('[OnboardingStepper] Step changed to:', newStep);
        setStep(newStep);
        const content = contentRef.current;
        if (content) {
          gsap.to(content, {
            opacity: 0,
            scale: 0.95,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
              gsap.fromTo(
                content,
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
              );
              gsap.fromTo(
                content.querySelectorAll(`.${styles.card}`),
                { opacity: 0, y: 50 },
                { opacity: 1, y: 0, duration: 0.6, stagger: 0.2, ease: 'power2.out', delay: 0.3 }
              );
              gsap.to(window, { scrollTo: 0, duration: 0.5, ease: 'power2.out' });
            },
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al cambiar de paso';
        console.error('[OnboardingStepper] Next step error:', message);
        setError(message);
        console.log('[OnboardingStepper] Adding failure alert for next step error');
        addAlert('failure', 'No se pudo avanzar al siguiente paso.', message);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        if (!user?.id) throw new Error('Usuario no autenticado.');

        const userDocRef = doc(db, 'users', user.id);
        await setDoc(userDocRef, { onboardingCompleted: true, currentStep: 5 }, { merge: true });
        console.log('[OnboardingStepper] Onboarding completed, set onboardingCompleted: true');

        const stepper = stepperRef.current;
        if (stepper) {
          gsap.to(stepper, {
            opacity: 0,
            scale: 0.8,
            duration: 0.5,
            ease: 'power2.in',
            onComplete: () => {
              console.log('[OnboardingStepper] Stepper closed');
              setIsOpen(false);
            },
          });
        } else {
          console.log('[OnboardingStepper] Stepper closed (no ref)');
          setIsOpen(false);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al completar el onboarding';
        console.error('[OnboardingStepper] Onboarding completion error:', message);
        setError(message);
        console.log('[OnboardingStepper] Adding failure alert for onboarding completion error');
        addAlert('failure', 'No se pudo completar el onboarding.', message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen || !user) {
    console.log('[OnboardingStepper] Not rendering stepper, isOpen:', isOpen, 'user:', !!user);
    return null;
  }

  const userName = name || 'Usuario';
  const avatarUrl = user.imageUrl && !user.imageUrl.includes('default') ? user.imageUrl : null;

  const renderStepIndicator = () => (
    <div className={styles.frame7}>
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          className={step === num ? styles.frame2147225883 : styles.frame2147225882}
          onClick={async () => {
            const newStep = num;
            setLoading(true);
            try {
              await setDoc(doc(db, 'users', user.id), { currentStep: newStep }, { merge: true });
              console.log('[OnboardingStepper] Step changed to:', newStep);
              setStep(newStep);
              gsap.to(window, { scrollTo: 0, duration: 0.5, ease: 'power2.out' });
            } catch (err) {
              console.error('[OnboardingStepper] Step indicator error:', err);
              setError(err.message);
              console.log('[OnboardingStepper] Adding failure alert for step indicator error');
              addAlert('failure', 'No se pudo cambiar de paso.', err.message || 'Error desconocido');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          <div className={styles.stepNumber}>{num}</div>
        </button>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className={styles.frame2147225915}>
            <div className={`${styles.coverPhoto} ${coverPhotoPreview === '/empty-cover.png' ? styles.emptyState : ''}`}>
              <Image
                src={coverPhotoPreview}
                alt="Foto de portada"
                fill
                style={{ objectFit: 'cover' }}
                priority
                onError={() => setCoverPhotoPreview('/empty-cover.png')}
              />
            </div>
            <div className={styles.frame2147225938}>
              <div className={styles.frame2147225943}>
                <div className={styles.frame2147225942}>
                  <div className={styles.frame2147225939} onClick={triggerCoverFileInput}>
                    <Image src="/pencil.svg" alt="Subir portada" width={17} height={17} />
                    <input
                      type="file"
                      ref={coverFileInputRef}
                      accept="image/*"
                      onChange={handleCoverPhotoChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
                {coverPhotoPreview === '/empty-cover.png' && (
                  <div className={styles.frame2147225928}>
                    <div className={styles.frame2147225941}>
                      <div className={styles.antesQueNadaComencemosConfigurandoTuPerfil}>
                        Configura tu perfil profesional
                      </div>
                    </div>
                    <div className={styles.siemprePuedesPersonalizarTuPerfilDesdeConfiguraciN}>
                      Personaliza tu información para optimizar tu experiencia en la plataforma. Puedes actualizar estos datos en cualquier momento desde la configuración.
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.contentWrapper}>
                <div className={styles.card}>
                  <div className={styles.avatar}>
                    {avatarUrl ? (
                      <Image
                        draggable="false"
                        src={avatarUrl}
                        alt={userName}
                        width={105}
                        height={105}
                        style={{ borderRadius: '1000px' }}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <span>Sin foto</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.inputColumns}>
                    <div className={styles.inputColumn}>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Nombre</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ingresa tu nombre completo"
                          className={styles.input}
                          disabled={loading}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Rol *</label>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="Especifica tu rol profesional"
                          className={styles.input}
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>
                    <div className={styles.inputColumn}>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Correo</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Ingresa tu correo electrónico"
                          className={styles.input}
                          disabled={loading}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Cumpleaños</label>
                        <input
                          type="text"
                          value={birthday}
                          onChange={handleBirthdayChange}
                          placeholder="DD/MM/AAAA"
                          className={styles.input}
                          disabled={loading}
                          maxLength={10}
                        />
                      </div>
                    </div>
                    <div className={styles.inputColumn}>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Teléfono</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ingresa tu número de teléfono"
                          className={styles.input}
                          disabled={loading}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Género</label>
                        <input
                          type="text"
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          placeholder="Especifica tu género (opcional)"
                          className={styles.input}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className={styles.inputColumn}>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Ciudad</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Especifica tu ciudad"
                          className={styles.input}
                          disabled={loading}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Portafolio</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isEditingPortfolio ? (
                            <input
                              type="url"
                              value={portfolio}
                              onChange={(e) => setPortfolio(e.target.value)}
                              placeholder="Ingresa la URL de tu portafolio"
                              className={styles.input}
                              disabled={loading}
                            />
                          ) : (
                            <a
                              href={portfolio.startsWith('http') ? portfolio : `https://${portfolio}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.portfolioLink}
                            >
                              {portfolio || 'Sin portafolio'}
                            </a>
                          )}
                          <button
                            type="button"
                            className={styles.portfolioEditButton}
                            onClick={handlePortfolioEdit}
                            disabled={loading}
                          >
                            {isEditingPortfolio ? 'Guardar' : 'Editar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.aboutToolsContainer}>
                    <div className={styles.aboutSection}>
                      <div className={styles.inputWrapper} >
                        <label className={styles.label}>Sobre mí</label>
                        <textarea
                          value={about}
                          onChange={(e) => setAbout(e.target.value)}
                          placeholder="Describe tu experiencia y habilidades"
                          className={styles.textarea}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className={styles.toolsSection}>
                      <div className={styles.inputWrapper}>
                        <label className={styles.label}>Herramientas</label>
                        <div className={styles.toolsWrapper}>
                          <input
                            type="text"
                            value={toolInput}
                            onChange={(e) => setToolInput(e.target.value)}
                            placeholder="Añade una herramienta (ej. Figma)"
                            className={styles.input}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            className={styles.addToolButton}
                            onClick={addTool}
                            disabled={loading || !toolInput.trim() || tools.length >= 9}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className={styles.tags} ref={tagsRef}>
                        {tools.map((tool, index) => (
                          <div key={index} className={styles.tag}>
                            {tool}
                            <button
                              type="button"
                              className={styles.removeTagButton}
                              onClick={() => removeTool(index)}
                              disabled={loading}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={styles.teamsSection} style={{ minWidth: '100%' }}>
                    <div className={styles.inputWrapper} style={{ minWidth: '100%' }}>
                      <label className={styles.label}>Seleccionar equipo *</label>
                      {teams.map((team, index) => (
                        <div key={index} className={styles.teamDropdownWrapper}>
                          <select
                            value={team}
                            onChange={(e) => handleTeamChange(index, e.target.value)}
                            className={styles.dropdown}
                            disabled={loading}
                            required
                          >
                            <option value="">Selecciona tu equipo</option>
                            {teamOptions.map((t) => (
                              <option key={t} value={t} disabled={teams.includes(t) && t !== team}>
                                {t}
                              </option>
                            ))}
                          </select>
                          {teams.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeTeamButton}
                              onClick={() => removeTeamDropdown(index)}
                              disabled={loading}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {teams.length < 3 && teams.some((t) => t) && (
                        <button
                          type="button"
                          className={styles.addTeamButton}
                          onClick={addTeamDropdown}
                          disabled={loading}
                        >
                          + Añadir otro equipo
                        </button>
                      )}
                      {teams.some((t) => t) && teamMembers.length > 0 && (
                        <div className={styles.teamMembers}>
                          {teamMembers.map((member) => (
                            <div key={member.id} className={styles.teamMember}>
                              <Image
                                src={member.imageUrl}
                                alt={member.name}
                                width={40}
                                height={40}
                                style={{ borderRadius: '50%' }}
                              />
                              <div className={styles.memberInfo}>
                                <div className={styles.memberName}>{member.name}</div>
                                <div className={styles.memberRole}>{member.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.frame1000005615}>
                  <button
                    type="submit"
                    className={styles.continuar}
                    disabled={loading || !role || teams.every((team) => !team)}
                  >
                    {loading ? 'Guardando...' : 'Guardar y Continuar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className={styles.frame2147225879}>
            {renderStepIndicator()}
            <div className={styles.frame3}>
              <div className={styles.creaYAsignaTareas}>🗂️ Crea y asigna tareas</div>
              <Image
                src="/OnboardingStepper/Step2.png"
                alt="Paso 2"
                width={216}
                height={131}
                className={styles.stepImage}
              />
              <div className={styles.puedesCrearTareas}>
                <span>
                  Puedes crear tareas y asignarlas a quienes estén involucrados. Solo los miembros asignados podrán verlas, comentarlas y actualizarlas.
                  <br />
                </span>
                <span className={styles.bold}>¡Así mantenemos cada proyecto claro y enfocado!</span>
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button type="button" className={styles.continuar} onClick={handleNext} disabled={loading}>
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className={styles.frame2147225879}>
            {renderStepIndicator()}
            <div className={styles.frame3}>
              <div className={styles.actualizaYComenta}>💬 Actualiza y comenta</div>
              <Image
                src="/OnboardingStepper/Step3.png"
                alt="Paso 3"
                width={233}
                height={302}
                className={styles.stepImage}
              />
              <div className={styles.cadaTareaTiene}>
                <span>
                  Cada tarea tiene su propio chat para que el equipo pueda conversar directamente allí.
                  <br />
                </span>
                <span className={styles.bold}>
                  También puedes actualizar el estado de la tarea fácilmente desde los botones superiores.
                </span>
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button type="button" className={styles.continuar} onClick={handleNext} disabled={loading}>
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className={styles.frame2147225879}>
            {renderStepIndicator()}
            <div className={styles.frame3}>
              <div className={styles.registraTuTiempo}>⏱️ Registra tu tiempo</div>
              <Image
                src="/OnboardingStepper/Step4.png"
                alt="Paso 4"
                width={285}
                height={158}
                className={styles.stepImage}
              />
              <div className={styles.quieresSaber}>
                <span>
                  ¿Quieres saber cuánto tiempo dedicas a una tarea?
                  <br />
                  Inicia un contador individual y lleva el control preciso de tu trabajo dentro del sistema.
                  <br />
                </span>
                <span className={styles.bold}>Puedes detener el contador presionando el mismo botón, de nuevo.</span>
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button type="button" className={styles.continuar} onClick={handleNext} disabled={loading}>
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className={styles.frame2147225879}>
            {renderStepIndicator()}
            <div className={styles.frame3}>
              <div className={styles.conectaConTuEquipo}>🤝 Conecta con tu equipo y clientes</div>
              <Image
                src="/OnboardingStepper/Step5.png"
                alt="Paso 5"
                width={202}
                height={177}
                className={styles.stepImage}
              />
              <div className={styles.desdeElPanel}>
                Desde el panel de miembros podrás ver a todo tu equipo. También puedes crear cuentas de clientes para asociarlas con tareas.
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button type="button" className={styles.continuar} onClick={handleNext} disabled={loading}>
                {loading ? 'Guardando...' : '¡Vamos Allá! 🚀'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.overlay}>
      {alerts.map((alert) =>
        alert.type === 'success' ? (
          <SuccessAlert
            key={alert.id}
            message={alert.message || ''}
            onClose={() => removeAlert(alert.id)}
          />
        ) : (
          <FailAlert
            key={alert.id}
            message={alert.message || ''}
            error={alert.error || ''}
            onClose={() => removeAlert(alert.id)}
          />
        )
      )}
      <form onSubmit={step === 1 ? handleSubmit : undefined}>
        <div ref={stepperRef} className={styles.frame2147225831}>
          <div ref={contentRef}>{renderStepContent()}</div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </form>
    </div>
  );
};

export default OnboardingStepper;