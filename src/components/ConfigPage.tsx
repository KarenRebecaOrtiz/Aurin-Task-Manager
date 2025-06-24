'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import SuccessAlert from './SuccessAlert';
import FailAlert from './FailAlert';
import ConfigDropdown from './ui/ConfigDropdown';
import StackInput from './ui/StackInput';
import Table from './Table';
import { gsap } from 'gsap';
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
  status?: string;
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
  role?: string;
  profilePhoto?: string;
}

interface ConfigPageProps {
  userId: string;
  onClose: () => void;
}

const ConfigPage: React.FC<ConfigPageProps> = ({ userId, onClose }) => {
  const { user: currentUser, isLoaded } = useUser();
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
    'React', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'SQL', 'MongoDB', 'PostgreSQL',
    'Figma', 'Adobe XD', 'Sketch', 'Docker', 'Kubernetes', 'AWS', 'Pandas', 'NumPy',
    'TensorFlow', 'Blender', 'Adobe Photoshop', 'No-Code Builders', 'Next.js',
    // Análisis de Datos
    'Airflow', 'Alteryx', 'Apache Spark', 'Dask', 'Databricks', 'DataGrip', 'Domo', 'Google BigQuery',
    'Hadoop', 'Jupyter', 'Kafka', 'Knime', 'Looker', 'Matplotlib', 'Metabase', 'Microsoft Power BI',
    'Mode Analytics', 'Plotly', 'QlikView', 'R', 'RapidMiner', 'Redash', 'Scikit-learn', 'Seaborn',
    'Snowflake', 'Splunk', 'Tableau', 'Talend', 'ThoughtSpot', 'Yellowbrick',
    // Arquitectura
    'Archicad', 'AutoCAD', 'BIM 360', 'Bluebeam', 'Catia', 'Civil 3D', 'Enscape', 'ETABS', 'Fusion 360',
    'Grasshopper', 'InfraWorks', 'Lumion', 'MicroStation', 'Navisworks', 'Orca3D', 'Primavera P6',
    'Revit', 'Rhino', 'Safe', 'SAP2000', 'SketchUp', 'SolidWorks', 'STAAD.Pro', 'Tekla Structures',
    'Trello', 'Trimble Connect', 'Twinmotion', 'Vectorworks', 'V-Ray', 'ZWCAD',
    // Arte
    '3ds Max', 'Affinity Designer', 'After Effects', 'ArtRage', 'Blender', 'Cinema 4D', 'Clip Studio Paint',
    'Corel Painter', 'Houdini', 'Illustrator', 'InDesign', 'Krita', 'Lightroom', 'Mari', 'Marvelous Designer',
    'Maya', 'Mudbox', 'Nuke', 'Photoshop', 'Premiere Pro', 'Procreate', 'Rebelle', 'Sculptris', 'Substance Painter',
    'Toon Boom Harmony', 'Unity', 'Unreal Engine', 'ZBrush', 'Zoner Photo Studio', 'ZWrap',
    // Backend
    'Apollo', 'Deno', 'Django', 'Express.js', 'FastAPI', 'Flask', 'Gin', 'Go', 'GraphQL', 'Hibernate',
    'Java', 'Kotlin', 'Laravel', 'MySQL', 'NestJS', 'Nginx', 'PHP', 'PostgreSQL', 'Prisma', 'RabbitMQ',
    'Redis', 'Ruby on Rails', 'Spring Boot', 'SQL Server', 'SQLite', 'Strapi', 'Supabase', 'Symfony',
    'Traefik', 'Vapor',
    // Cloud Computing
    'AWS', 'Google Cloud Platform', 'Microsoft Azure', 'Firebase', 'Firestore', 'Cloud Functions', 'Cloud Run',
    'Cloud Storage', 'BigQuery', 'Pub/Sub', 'Cloud Build', 'Cloud SQL', 'Cloud Spanner', 'Cloud Bigtable',
    'Compute Engine', 'App Engine', 'Kubernetes Engine', 'Cloud CDN', 'Cloud DNS', 'Cloud IAM',
    'AWS Lambda', 'AWS S3', 'AWS EC2', 'AWS RDS', 'AWS DynamoDB', 'AWS CloudFormation', 'AWS ECS',
    'AWS EKS', 'AWS CloudWatch', 'AWS SNS', 'AWS SQS', 'Azure Functions', 'Azure Blob Storage',
    'Azure SQL Database', 'Azure Cosmos DB', 'Azure Service Bus', 'Azure Event Grid', 'Heroku',
    'Vercel', 'Netlify', 'DigitalOcean', 'Linode', 'Vultr', 'Oracle Cloud', 'IBM Cloud', 'Alibaba Cloud',
    // DevOps
    'Ansible', 'ArgoCD', 'AWS CloudFormation', 'Bamboo', 'Chef', 'CircleCI', 'Datadog', 'Docker Compose',
    'ELK Stack', 'Git', 'GitHub', 'GitHub Actions', 'GitLab', 'GitLab CI', 'Grafana', 'Helm', 'Istio', 
    'Jenkins', 'Nexus', 'New Relic', 'OpenShift', 'Prometheus', 'Puppet', 'SaltStack', 'Sentry', 
    'SonarQube', 'Spinnaker', 'Terraform', 'Travis CI', 'Vault', 'Vagrant', 'Zabbix', 'n8n',
    // Diseño gráfico
    'Adobe Animate', 'Affinity Photo', 'Canva', 'CorelDRAW', 'Crello', 'Figma', 'GIMP', 'Gravit Designer',
    'Illustrator', 'Inkscape', 'Lunacy', 'Photopea', 'PicMonkey', 'Pixelmator', 'Procreate', 'Sketch',
    'Snappa', 'Spark', 'Stencila', 'Vectr', 'Visme', 'VistaCreate', 'Xara Designer', 'Zeplin', 'Adobe Express',
    'Easil', 'DesignCap', 'Genially', 'Krita', 'Photoshop',
    // Frontend
    'Angular', 'Astro', 'Bootstrap', 'Chakra UI', 'Cypress', 'Ember.js', 'ESLint', 'Gatsby', 'Jest',
    'Material UI', 'Next.js', 'Nuxt.js', 'Preact', 'React Native', 'Redux', 'Sass', 'Storybook', 'Svelte',
    'Tailwind CSS', 'Three.js', 'Vite', 'Vue.js', 'Vitest', 'Vuetify', 'WASM', 'WebGL', 'Webpack',
    'Webflow', 'Yarn', 'Zustand', 'Framer Motion', 'Framer', 'GSAP', 'Lottie', 'React Spring',
    'Anime.js', 'Rive', 'Motion One', 'React Transition Group', 'React Hook Form', 'Formik', 'Yup',
    'Zod', 'React Query', 'SWR', 'Apollo Client', 'Relay', 'Recoil', 'Jotai', 'Valtio', 'Styled Components',
    'Emotion', 'Stitches', 'Vanilla Extract', 'Headless UI', 'Radix UI', 'Arco Design', 'Ant Design',
    'Mantine', 'NextUI', 'React Router', 'Reach Router', 'Wouter', 'React Testing Library', 'Enzyme',
    'Playwright', 'Puppeteer', 'Storybook', 'Chromatic', 'Bit', 'Nx', 'Lerna', 'Rush', 'Turbo',
    'Microbundle', 'Rollup', 'Parcel', 'esbuild', 'SWC', 'Babel', 'TypeScript', 'Flow', 'PropTypes',
    // Inteligencia Artificial
    'Caffe', 'FastAI', 'H2O.ai', 'Hugging Face', 'Keras', 'LangChain', 'LightGBM', 'MLflow', 'Neptune.ai',
    'ONNX', 'OpenAI', 'OpenCV', 'PyCaret', 'PyTorch', 'Rasa', 'SageMaker', 'SciPy', 'SHAP', 'Spacy',
    'Stable Diffusion', 'TFLite', 'TorchScript', 'Transformers', 'Vertex AI', 'Wandb', 'XGBoost', 'YOLO',
    'AutoML', 'DeepLearning.AI', 'TensorBoard',
    // No-Code Builders
    'Adalo', 'Airtable', 'AppGyver', 'AppSheet', 'Betty Blocks', 'Bubble', 'Caspio', 'ClickUp', 'Glide',
    'Integromat', 'JotForm', 'Kissflow', 'Mendix', 'Monday.com', 'Nexlify', 'Notion', 'OutSystems',
    'Power Apps', 'QuickBase', 'Retool', 'Softr', 'Stacker', 'Thunkable', 'Tilda', 'Webflow', 'Wix',
    'WordPress', 'Zapier', 'Zoho Creator', 'Zudy Vinyl',
    // Project Management
    'Jira', 'Confluence', 'Asana', 'Monday.com', 'Trello', 'ClickUp', 'Notion', 'Airtable', 'Basecamp',
    'Wrike', 'Smartsheet', 'Microsoft Project', 'Gantt Charts', 'Kanban', 'Scrum', 'Agile', 'Waterfall',
    'Linear', 'Height', 'Todoist', 'Any.do', 'Teamwork', 'Workfront', 'Zoho Projects', 'ProofHub',
    'Paymo', 'TeamGantt', 'GanttProject', 'OpenProject', 'Redmine', 'Taiga', 'Azure DevOps', 'Shortcut',
    'Clubhouse', 'Pivotal Tracker', 'Backlog', 'Favro', 'MeisterTask', 'Freedcamp', 'Hive', 'nTask',
    // UX/UI
    'Abstract', 'Adobe XD', 'Axure', 'Balsamiq', 'Coolors', 'Dribbble', 'FigJam', 'Figma', 'Flinto',
    'Framer', 'InVision', 'Justinmind', 'Lottie', 'Maze', 'Miro', 'Mockflow', 'Origami Studio', 'Penpot',
    'Proto.io', 'Sketch', 'Smaply', 'Storybook', 'Sympli', 'UXPin', 'UsabilityHub', 'UserTesting',
    'Whimsical', 'Wireframe.cc', 'Zeplin', 'ZeroHeight'
  ].sort();
  const uniqueTechnologies = [...new Set(technologies)].sort();
  

  const teamsOptions = [
    'Análisis de Datos', 'Arquitectura', 'Arte', 'Backend', 'Cloud Computing', 'DevOps', 'Diseño gráfico',
    'Frontend', 'Inteligencia Artificial', 'No-Code Builders', 'Project Management', 'UX/UI',
  ].sort();

  const ladaOptions = [
    { value: '+52', label: '+52 (México)' },
    { value: '+1', label: '+1 (EE.UU./Canadá)' },
    { value: '+44', label: '+44 (Reino Unido)' },
    { value: '+33', label: '+33 (Francia)' },
    { value: '+49', label: '+49 (Alemania)' },
  ];

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId || !currentUser) return;

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
            fullName: data.fullName || currentUser.fullName || '',
            role: data.role || '',
            description: data.description || '',
            birthDate: data.birthDate || '',
            phone: data.phone?.startsWith('+') ? data.phone.split(' ').slice(1).join('') : data.phone || '',
            phoneLada: data.phone?.startsWith('+') ? data.phone.split(' ')[0] : '+52',
            city: data.city || '',
            gender: data.gender || '',
            portfolio: data.portfolio || '',
            stack: data.stack || [],
            teams: data.teams || [],
            profilePhoto: data.profilePhoto || currentUser.imageUrl || '',
            coverPhoto: data.coverPhoto || '/empty-cover.png',
            profilePhotoFile: null,
            coverPhotoFile: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            status: data.status || 'Disponible',
          });
        } else {
          setFormData({
            userId,
            notificationsEnabled: false,
            darkMode: false,
            emailAlerts: false,
            taskReminders: false,
            highContrast: false,
            grayscale: false,
            soundEnabled: false,
            fullName: currentUser.fullName || '',
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
            profilePhoto: currentUser.imageUrl || '',
            coverPhoto: '/empty-cover.png',
            profilePhotoFile: null,
            coverPhotoFile: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            status: 'Disponible',
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('[ConfigPage] Error fetching user config:', err);
        setAlert({ type: 'error', message: 'Error al cargar el perfil', error: err.message });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, currentUser, isLoaded]);

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
              role: doc.data().role || 'Sin rol',
              profilePhoto: doc.data().profilePhoto || '',
              teams: doc.data().teams || [],
            }))
            .filter((member) => member.id !== userId);
        }
        setTeamMembers(membersByTeam);
      } catch (err) {
        console.error('[ConfigPage] Error fetching team members:', err);
        setAlert({ type: 'error', message: 'Error al cargar los miembros del equipo', error: err.message });
      }
    };

    fetchTeamMembers();
  }, [formData?.teams, userId]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData?.fullName) newErrors.fullName = 'El nombre es obligatorio';
    if (!formData?.role) newErrors.role = 'El rol es obligatorio';
    if (formData?.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) newErrors.phone = 'El teléfono debe tener 10 dígitos';
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
      if (!formData.currentPassword) newErrors.currentPassword = 'La contraseña actual es obligatoria';
      if (!formData.newPassword) newErrors.newPassword = 'La nueva contraseña es obligatoria';
      else if (formData.newPassword.length < 8) newErrors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres';
      if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) =>
      prev ? { ...prev, [name]: type === 'checkbox' ? checked : value } : null
    );
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handleStackChange = useCallback((selectedValues: string[]) => {
    setFormData((prev) => (prev ? { ...prev, stack: selectedValues.slice(0, 40) } : null));
  }, []);

  const handleTeamsChange = useCallback((selectedTeams: string[]) => {
    setFormData((prev) => (prev ? { ...prev, teams: selectedTeams.slice(0, 3) } : null));
  }, []);

  const handleRemoveTeam = useCallback((team: string) => {
    setFormData((prev) =>
      prev ? { ...prev, teams: prev.teams?.filter((t) => t !== team) || [] } : null
    );
  }, []);

  const handlePhoneLadaChange = useCallback((value: string) => {
    setFormData((prev) => (prev ? { ...prev, phoneLada: value } : null));
    setErrors((prev) => ({ ...prev, phone: undefined }));
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Extraer solo los dígitos del valor actual
    const rawValue = e.target.value.replace(/\D/g, '');
    
    // Limitar a 10 dígitos máximo
    const limitedValue = rawValue.slice(0, 10);
    
    // Guardar solo los dígitos en el estado
    setFormData((prev) => (prev ? { ...prev, phone: limitedValue } : null));
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

  const deleteImageFromGCS = async (filePath: string) => {
    try {
      console.log('[ConfigPage] Attempting to delete image from GCS:', filePath);
      const response = await fetch('/api/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          console.warn('[ConfigPage] Delete failed: File not found in GCS:', filePath);
        } else {
          throw new Error(errorText || 'Error deleting image from GCS');
        }
      } else {
        console.log('[ConfigPage] Image deleted from GCS:', filePath);
      }
    } catch (err) {
      console.error('[ConfigPage] deleteImageFromGCS: Error', err);
    }
  };

  const uploadProfileImage = async (file: File, userId: string) => {
    if (!file) throw new Error('No file provided for upload');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('type', 'profile');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: { 'x-clerk-user-id': userId },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || data.error || 'Error al subir la imagen de perfil');
      }

      const { url } = await response.json();
      if (currentUser) {
        try {
          await currentUser.setProfileImage({ file });
          console.log('[ConfigPage] Profile image updated in Clerk');
        } catch (setError) {
          console.warn('[ConfigPage] Failed to update Clerk profile image:', setError);
        }
      }
      return url;
    } catch (err) {
      console.error('[ConfigPage] uploadProfileImage: Error', err);
      throw err;
    }
  };

  const uploadCoverImage = async (file: File, userId: string) => {
    if (!file) throw new Error('No file provided for upload');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('type', 'cover');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: { 'x-clerk-user-id': userId },
      });

      if (!response.ok) {
        const data = await response.text();
        throw new Error(data || 'Error al subir la imagen de portada');
      }

      const { url } = await response.json();
      return url;
    } catch (err) {
      console.error('[ConfigPage] uploadCoverImage: Error', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !userId || !currentUser) {
      setAlert({ type: 'error', message: 'Datos inválidos, por favor intenta de nuevo' });
      return;
    }

    if (!validateForm()) {
      setAlert({ type: 'error', message: 'Por favor corrige los errores en el formulario' });
      return;
    }

    try {
      setLoading(true);

      let profilePhotoUrl = formData.profilePhoto;
      let coverPhotoUrl = formData.coverPhoto;

      if (formData.profilePhotoFile) {
        if (config?.profilePhoto && !config.profilePhoto.includes('clerk.com') && !config.profilePhoto.includes('default-avatar.png')) {
          const filePath = config.profilePhoto.split('aurin-plattform/')[1];
          if (filePath) {
            await deleteImageFromGCS(filePath);
          }
        }
        profilePhotoUrl = await uploadProfileImage(formData.profilePhotoFile, userId);
      }

      if (formData.coverPhotoFile) {
        if (config?.coverPhoto && config.coverPhoto !== '/empty-cover.png') {
          const filePath = config.coverPhoto.split('aurin-plattform/')[1];
          if (filePath) {
            await deleteImageFromGCS(filePath);
          }
        }
        coverPhotoUrl = await uploadCoverImage(formData.coverPhotoFile, userId);
      }

      if (formData.newPassword && formData.currentPassword) {
        await currentUser.updatePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });
      }

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
        status: formData.status || 'Disponible',
      });

      setAlert({ type: 'success', message: 'Perfil actualizado exitosamente' });
      setIsEditing(false);
      setTimeout(onClose, 1000);
    } catch (err) {
      setAlert({
        type: 'error',
        message: 'Error al guardar los datos, por favor intenta de nuevo',
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    setIsEditing(false);
    setFormData((prev) => {
      if (!prev || !config) return prev;
      return {
        ...prev,
        notificationsEnabled: config.notificationsEnabled || false,
        darkMode: config.darkMode || false,
        emailAlerts: config.emailAlerts || false,
        taskReminders: config.taskReminders || false,
        highContrast: config.highContrast || false,
        grayscale: config.grayscale || false,
        soundEnabled: config.soundEnabled || false,
        fullName: config.fullName || currentUser.fullName || '',
        role: config.role || '',
        description: config.description || '',
        birthDate: config.birthDate || '',
        phone: config.phone?.startsWith('+') ? config.phone.split(' ').slice(1).join('') : config.phone || '',
        phoneLada: config.phone?.startsWith('+') ? config.phone.split(' ')[0] : '+52',
        city: config.city || '',
        gender: config.gender || '',
        portfolio: config.portfolio || '',
        stack: config.stack || [],
        teams: config.teams || [],
        profilePhoto: config.profilePhoto || currentUser.imageUrl || '',
        coverPhoto: config.coverPhoto || '/empty-cover.png',
        profilePhotoFile: null,
        coverPhotoFile: null,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        status: config.status || 'Disponible',
      };
    });
    setErrors({});
    setAlert(null);
    onClose();
  };

  const toggleEdit = () => {
    setIsEditing((prev) => !prev);
    setErrors({});
    setAlert(null);
  };

  const handleAlertClose = () => {
    setAlert(null);
  };

  const formatPhoneNumber = (phone: string) => {
    // Si phone está vacío, mostrar placeholder
    if (!phone) return '';
    
    const digits = phone.replace(/\D/g, '');
    
    // Formatear según la cantidad de dígitos
    if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 5) {
      return `(${digits.slice(0, 2)})-${digits.slice(2)}`;
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)})-${digits.slice(2, 5)}-${digits.slice(5)}`;
    } else {
      return `(${digits.slice(0, 2)})-${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 10)}`;
    }
  };

  useEffect(() => {
    const sections = document.querySelectorAll(`.${styles.section}`);
    sections.forEach((section) => {
      gsap.fromTo(
        section,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    const fields = document.querySelectorAll(`.${styles.fieldGroup}, .${styles.fieldGroupRow}`);
    fields.forEach((field) => {
      gsap.fromTo(
        field,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: field,
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    const tables = document.querySelectorAll(`.${styles.teamTableContainer}`);
    tables.forEach((table) => {
      gsap.fromTo(
        table,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: table,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    });
  }, []);

  if (loading || !isLoaded) {
    return (
      <div className={styles.frame239189}>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  if (!formData || !currentUser) {
    return (
      <div className={styles.frame239189}>
        <p>Configuración no disponible.</p>
        <button className={styles.editButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    );
  }

  const isOwnProfile = currentUser.id === userId;

  // Define columns for the Table component
  const teamTableColumns = [
    {
      key: 'profilePhoto',
      label: 'Foto',
      width: '100px',
      mobileVisible: true,
      render: (member: User) => (
        <Image
          src={member.profilePhoto || ''}
          alt={member.fullName}
          width={40}
          height={40}
          className={styles.teamAvatar}
        />
      ),
    },
    {
      key: 'fullName',
      label: 'Nombre',
      width: 'auto',
      mobileVisible: true,
    },
    {
      key: 'role',
      label: 'Rol',
      width: 'auto',
      mobileVisible: true,
    },
  ];

  return (
    <>
      <div className={styles.frame239189}>
        <div className={styles.frame239197} style={{ backgroundImage: `url(${formData.coverPhoto})` }}>
          {isOwnProfile && isEditing && (
            <button
              className={styles.editCoverButton}
              onClick={() => coverPhotoInputRef.current?.click()}
            >
              <Image
                src="/pencil.svg"
                alt="Editar"
                width={16}
                height={16}
              />
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
                alt="Foto de perfil"
                width={94}
                height={94}
                className={styles.ellipse11}
                onError={(e) => console.error('Image load failed:', e)}
              />
              {isOwnProfile && isEditing && (
                <button
                  className={styles.editProfilePhotoButton}
                  onClick={() => profilePhotoInputRef.current?.click()}
                >
                  <Image
                    src="/pencil.svg"
                    alt="Editar"
                    width={16}
                    height={16}
                  />
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
              <div className={styles.exampleMailCom}>{currentUser.primaryEmailAddress?.emailAddress}</div>
            </div>
          </div>
          {isOwnProfile && (
            <div className={styles.frame239191}>
              <button className={styles.editButton} onClick={isEditing ? handleSubmit : toggleEdit}>
                {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
              </button>
              {isEditing && (
                <button className={styles.discardButton} onClick={handleDiscard}>
                  Descartar Cambios
                </button>
              )}
            </div>
          )}
        </div>
        <div className={styles.content}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Información General</h2>
            <div className={styles.sectionContent}>
              <div className={styles.fieldGroup}>
                <div className={styles.frame239182}>
                  <div className={styles.label}>Nombre Completo</div>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Escribe tu nombre completo"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                  />
                  {errors.fullName && <p className={styles.errorText}>{errors.fullName}</p>}
                </div>
                <div className={styles.frame239183}>
                  <div className={styles.label}>Rol o Cargo</div>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="¿Cuál es tu cargo actual?"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                  />
                  {errors.role && <p className={styles.errorText}>{errors.role}</p>}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.frame239182}>
                  <div className={styles.label}>Acerca de ti</div>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Breve descripción personal"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                  />
                </div>
              </div>
              <div className={styles.fieldGroupRow}>
                <div className={styles.frame239182}>
                  <div className={styles.label}>Correo Electrónico</div>
                  <input
                    type="text"
                    value={currentUser.primaryEmailAddress?.emailAddress || ''}
                    placeholder="correo@ejemplo.com"
                    className={styles.input}
                    disabled
                  />
                </div>
                <div className={styles.frame239183}>
                  <div className={styles.label}>Fecha de Nacimiento</div>
                  <input
                    type="text"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleDateChange}
                    placeholder="DD/MM/AAAA"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                    maxLength={10}
                  />
                  {errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
                </div>
              </div>
              <div className={styles.fieldGroupRow}>
                <div className={styles.frame239182}>
                  <div className={styles.label}>Teléfono de Contacto</div>
                  <div className={styles.phoneInputContainer}>
                    <ConfigDropdown
                      options={ladaOptions}
                      value={formData.phoneLada}
                      onChange={handlePhoneLadaChange}
                      placeholder="Select Lada"
                      disabled={!isOwnProfile || !isEditing}
                      className={styles.ladaSelect}
                    />
                    <input
                      type="text"
                      name="phone"
                      value={formatPhoneNumber(formData.phone || '')}
                      onChange={handlePhoneChange}
                      placeholder="XX-XXX-XX-XX"
                      className={styles.input}
                      disabled={!isOwnProfile || !isEditing}
                      maxLength={15}
                    />
                  </div>
                  {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                </div>
                <div className={styles.frame239183}>
                  <div className={styles.label}>Ciudad de Residencia</div>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Ciudad, País"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                  />
                </div>
              </div>
              <div className={styles.fieldGroupRow}>
                <div className={styles.frame239182}>
                  <div className={styles.label}>Género</div>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={styles.input}
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
                  <div className={styles.label}>Portafolio en Línea</div>
                  <input
                    type="text"
                    name="portfolio"
                    value={formData.portfolio}
                    onChange={handleInputChange}
                    placeholder="https://miportafolio.com"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                  />
                  {errors.portfolio && <p className={styles.errorText}>{errors.portfolio}</p>}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Seguridad</h2>
            <div className={styles.sectionContent}>
              <div className={styles.fieldGroup}>
                <div className={styles.frame239182}>
                  <div className={styles.label}>Contraseña Actual</div>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword || ''}
                    onChange={handleInputChange}
                    placeholder="Ingresa tu contraseña actual"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                  />
                  {errors.currentPassword && <p className={styles.errorText}>{errors.currentPassword}</p>}
                </div>
                <div className={styles.frame239183}>
                  <div className={styles.label}>Nueva Contraseña</div>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword || ''}
                    onChange={handleInputChange}
                    placeholder="Ingresa tu nueva contraseña"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                  />
                  {errors.newPassword && <p className={styles.errorText}>{errors.newPassword}</p>}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.frame239182}>
                  <div className={styles.label}>Confirmar Contraseña</div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword || ''}
                    onChange={handleInputChange}
                    placeholder="Confirma tu nueva contraseña"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                  />
                  {errors.confirmPassword && <p className={styles.errorText}>{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Stack</h2>
            <div className={styles.sectionContent}>
              <div className={styles.fieldGroup}>
                <div className={styles.stackDescription}>
                  Selecciona las tecnologías y herramientas que usas frecuentemente.
                </div>
                <StackInput
                  options={uniqueTechnologies}
                  value={formData.stack || []}
                  onChange={handleStackChange}
                  placeholder="Escribe una tecnología..."
                  disabled={!isOwnProfile || !isEditing}
                  className={styles.stackSelect}
                  maxSelections={40}
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Equipos</h2>
            <div className={styles.sectionContent}>
              <div className={styles.fieldGroup} style={{flexDirection: 'row', justifyContent:'space-between', width:"100%"}}>
                <div className={styles.teamsDescription}>
                  Escribe y selecciona aquí tus equipos (máximo 3)
                </div>
                <ConfigDropdown
                  options={teamsOptions.map((team) => ({ value: team, label: team }))}
                  value={formData.teams || []}
                  onChange={handleTeamsChange}
                  placeholder="Select Teams"
                  isMulti
                  disabled={!isOwnProfile || !isEditing}
                  className={styles.teamsSelect}
                />
              </div>
              {formData.teams?.map((team) => (
                <div key={team} className={styles.teamTableContainer}>
                  <div className={styles.teamHeader}>
                    <h3 className={styles.teamHeading}>{team}</h3>
                    {isOwnProfile && isEditing && (
                      <button
                        className={styles.removeTeamButton}
                        onClick={() => handleRemoveTeam(team)}
                        title="Eliminar equipo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className={styles.teamSubheading}>
                    Lista de miembros del equipo (excluyéndote a ti)
                  </p>
                  <Table
                    data={teamMembers[team] || []}
                    columns={teamTableColumns}
                    itemsPerPage={5}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      {alert?.type === 'success' && (
        <SuccessAlert message={alert.message} onClose={handleAlertClose} />
      )}
      {alert?.type === 'error' && (
        <FailAlert message={alert.message} error={alert.error || 'Error desconocido'} onClose={handleAlertClose} />
      )}
    </>
  );
};

export default ConfigPage;