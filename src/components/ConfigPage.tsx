'use client';

import { useUser, useSession } from '@clerk/nextjs';
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import ConfigDropdown from './ui/ConfigDropdown';
import SearchableDropdown from './ui/SearchableDropdown';
import PhoneCountrySelect from './ui/PhoneCountrySelect';
import TeamsTable from './TeamsTable';
import SkeletonLoader from '@/components/SkeletonLoader';
import { gsap } from 'gsap';
import { WebsiteInput } from './ui/WebsiteInput';
import { BiographyInput } from './ui/BiographyInput';
import LocationDropdown from './ui/LocationDropdown';
import styles from './ConfigPage.module.scss';
import { useTasksPageStore } from '@/stores/tasksPageStore';

// Componentes de iconos de redes sociales con soporte para dark mode
const SocialIcon: React.FC<{ icon: string; alt: string; className?: string }> = ({ icon, alt, className }) => (
  <div className={`${styles.socialIcon} ${className || ''}`}>
    <Image
      src={icon}
      alt={alt}
      width={16}
      height={16}
      className={styles.socialIconSvg}
    />
  </div>
);

export interface PersonalLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
}

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
  // Ubicaciones personalizadas
  personalLocations?: {
    home?: PersonalLocation;
    secondary?: PersonalLocation;
  };
  // Redes sociales
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    dribbble?: string;
  };
}

interface ConfigForm extends Omit<Config, 'id'> {
  userId: string;
  profilePhotoFile?: File | null;
  coverPhotoFile?: File | null;
  phoneLada?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  // Ubicaciones personalizadas para el formulario
  homeLocation?: PersonalLocation;
  secondaryLocation?: PersonalLocation;
  // Redes sociales individuales para el formulario
  github?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  dribbble?: string;
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
  onShowSuccessAlert?: (message: string) => void;
  onShowFailAlert?: (message: string, error?: string) => void;
}

// Variantes de animación para Framer Motion
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

const tableVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: -20,
    transition: { duration: 0.3 }
  }
};

const ConfigPage: React.FC<ConfigPageProps> = ({ userId, onClose, onShowSuccessAlert, onShowFailAlert }) => {
  const { user: currentUser, isLoaded } = useUser();
  const { session: currentSession } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [formData, setFormData] = useState<ConfigForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ [team: string]: User[] }>({});
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{
    fullName?: string;
    role?: string;
    phone?: string;
    birthDate?: string;
    portfolio?: string;
    profilePhoto?: string;
    coverPhoto?: string;
    description?: string;
  }>({});

  const technologies = [
    'React', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'SQL', 'MongoDB', 'PostgreSQL',
    'Figma (Básico)', 'Figma (Intermedio)', 'Figma (Avanzado)', 'Adobe XD (Básico)', 'Adobe XD (Intermedio)', 'Adobe XD (Avanzado)', 'Sketch (Básico)', 'Sketch (Intermedio)', 'Sketch (Avanzado)', 'Docker', 'Kubernetes', 'AWS', 'Pandas', 'NumPy',
    'TensorFlow', 'Blender (Básico)', 'Blender (Intermedio)', 'Blender (Avanzado)', 'Adobe Photoshop (Básico)', 'Adobe Photoshop (Intermedio)', 'Adobe Photoshop (Avanzado)', 'No-Code Builders', 'Next.js',
    // Análisis de Datos
    'Airflow', 'Alteryx', 'Apache Spark', 'Dask', 'Databricks', 'DataGrip', 'Domo', 'Google BigQuery',
    'Hadoop', 'Jupyter', 'Kafka', 'Knime', 'Looker', 'Matplotlib', 'Metabase', 'Microsoft Power BI',
    'Mode Analytics', 'Plotly', 'QlikView', 'R', 'RapidMiner', 'Redash', 'Scikit-learn', 'Seaborn',
    'Snowflake', 'Splunk', 'Tableau', 'Talend', 'ThoughtSpot', 'Yellowbrick',
    // Arquitectura
    'Archicad (Básico)', 'Archicad (Intermedio)', 'Archicad (Avanzado)', 'AutoCAD (Básico)', 'AutoCAD (Intermedio)', 'AutoCAD (Avanzado)', 'BIM 360 (Básico)', 'BIM 360 (Intermedio)', 'BIM 360 (Avanzado)', 'Bluebeam (Básico)', 'Bluebeam (Intermedio)', 'Bluebeam (Avanzado)', 'Catia (Básico)', 'Catia (Intermedio)', 'Catia (Avanzado)', 'Civil 3D (Básico)', 'Civil 3D (Intermedio)', 'Civil 3D (Avanzado)', 'Enscape (Básico)', 'Enscape (Intermedio)', 'Enscape (Avanzado)', 'ETABS (Básico)', 'ETABS (Intermedio)', 'ETABS (Avanzado)', 'Fusion 360 (Básico)', 'Fusion 360 (Intermedio)', 'Fusion 360 (Avanzado)',
    'Grasshopper (Básico)', 'Grasshopper (Intermedio)', 'Grasshopper (Avanzado)', 'InfraWorks (Básico)', 'InfraWorks (Intermedio)', 'InfraWorks (Avanzado)', 'Lumion (Básico)', 'Lumion (Intermedio)', 'Lumion (Avanzado)', 'MicroStation (Básico)', 'MicroStation (Intermedio)', 'MicroStation (Avanzado)', 'Navisworks (Básico)', 'Navisworks (Intermedio)', 'Navisworks (Avanzado)', 'Orca3D (Básico)', 'Orca3D (Intermedio)', 'Orca3D (Avanzado)', 'Primavera P6 (Básico)', 'Primavera P6 (Intermedio)', 'Primavera P6 (Avanzado)',
    'Revit (Básico)', 'Revit (Intermedio)', 'Revit (Avanzado)', 'Rhino (Básico)', 'Rhino (Intermedio)', 'Rhino (Avanzado)', 'Safe (Básico)', 'Safe (Intermedio)', 'Safe (Avanzado)', 'SAP2000 (Básico)', 'SAP2000 (Intermedio)', 'SAP2000 (Avanzado)', 'SketchUp (Básico)', 'SketchUp (Intermedio)', 'SketchUp (Avanzado)', 'SolidWorks (Básico)', 'SolidWorks (Intermedio)', 'SolidWorks (Avanzado)', 'STAAD.Pro (Básico)', 'STAAD.Pro (Intermedio)', 'STAAD.Pro (Avanzado)', 'Tekla Structures (Básico)', 'Tekla Structures (Intermedio)', 'Tekla Structures (Avanzado)',
    'Trello', 'Trimble Connect (Básico)', 'Trimble Connect (Intermedio)', 'Trimble Connect (Avanzado)', 'Twinmotion (Básico)', 'Twinmotion (Intermedio)', 'Twinmotion (Avanzado)', 'Vectorworks (Básico)', 'Vectorworks (Intermedio)', 'Vectorworks (Avanzado)', 'V-Ray (Básico)', 'V-Ray (Intermedio)', 'V-Ray (Avanzado)', 'ZWCAD (Básico)', 'ZWCAD (Intermedio)', 'ZWCAD (Avanzado)',
    // Arte
    '3ds Max (Básico)', '3ds Max (Intermedio)', '3ds Max (Avanzado)', 'Affinity Designer (Básico)', 'Affinity Designer (Intermedio)', 'Affinity Designer (Avanzado)', 'After Effects (Básico)', 'After Effects (Intermedio)', 'After Effects (Avanzado)', 'ArtRage (Básico)', 'ArtRage (Intermedio)', 'ArtRage (Avanzado)', 'Cinema 4D (Básico)', 'Cinema 4D (Intermedio)', 'Cinema 4D (Avanzado)', 'Clip Studio Paint (Básico)', 'Clip Studio Paint (Intermedio)', 'Clip Studio Paint (Avanzado)',
    'Corel Painter (Básico)', 'Corel Painter (Intermedio)', 'Corel Painter (Avanzado)', 'Houdini (Básico)', 'Houdini (Intermedio)', 'Houdini (Avanzado)', 'Illustrator (Básico)', 'Illustrator (Intermedio)', 'Illustrator (Avanzado)', 'InDesign (Básico)', 'InDesign (Intermedio)', 'InDesign (Avanzado)', 'Krita (Básico)', 'Krita (Intermedio)', 'Krita (Avanzado)', 'Lightroom (Básico)', 'Lightroom (Intermedio)', 'Lightroom (Avanzado)', 'Mari (Básico)', 'Mari (Intermedio)', 'Mari (Avanzado)', 'Marvelous Designer (Básico)', 'Marvelous Designer (Intermedio)', 'Marvelous Designer (Avanzado)',
    'Maya (Básico)', 'Maya (Intermedio)', 'Maya (Avanzado)', 'Mudbox (Básico)', 'Mudbox (Intermedio)', 'Mudbox (Avanzado)', 'Nuke (Básico)', 'Nuke (Intermedio)', 'Nuke (Avanzado)', 'Premiere Pro (Básico)', 'Premiere Pro (Intermedio)', 'Premiere Pro (Avanzado)', 'Procreate (Básico)', 'Procreate (Intermedio)', 'Procreate (Avanzado)', 'Rebelle (Básico)', 'Rebelle (Intermedio)', 'Rebelle (Avanzado)', 'Sculptris (Básico)', 'Sculptris (Intermedio)', 'Sculptris (Avanzado)', 'Substance Painter (Básico)', 'Substance Painter (Intermedio)', 'Substance Painter (Avanzado)',
    'Toon Boom Harmony (Básico)', 'Toon Boom Harmony (Intermedio)', 'Toon Boom Harmony (Avanzado)', 'Unity', 'Unreal Engine', 'ZBrush (Básico)', 'ZBrush (Intermedio)', 'ZBrush (Avanzado)', 'Zoner Photo Studio (Básico)', 'Zoner Photo Studio (Intermedio)', 'Zoner Photo Studio (Avanzado)', 'ZWrap (Básico)', 'ZWrap (Intermedio)', 'ZWrap (Avanzado)',
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
    'Adobe Animate (Básico)', 'Adobe Animate (Intermedio)', 'Adobe Animate (Avanzado)', 'Affinity Photo (Básico)', 'Affinity Photo (Intermedio)', 'Affinity Photo (Avanzado)', 'Canva (Básico)', 'Canva (Intermedio)', 'Canva (Avanzado)', 'CorelDRAW (Básico)', 'CorelDRAW (Intermedio)', 'CorelDRAW (Avanzado)', 'Crello (Básico)', 'Crello (Intermedio)', 'Crello (Avanzado)', 'GIMP (Básico)', 'GIMP (Intermedio)', 'GIMP (Avanzado)', 'Gravit Designer (Básico)', 'Gravit Designer (Intermedio)', 'Gravit Designer (Avanzado)',
    'Inkscape (Básico)', 'Inkscape (Intermedio)', 'Inkscape (Avanzado)', 'Lunacy (Básico)', 'Lunacy (Intermedio)', 'Lunacy (Avanzado)', 'Photopea (Básico)', 'Photopea (Intermedio)', 'Photopea (Avanzado)', 'PicMonkey (Básico)', 'PicMonkey (Intermedio)', 'PicMonkey (Avanzado)', 'Pixelmator (Básico)', 'Pixelmator (Intermedio)', 'Pixelmator (Avanzado)', 'Snappa (Básico)', 'Snappa (Intermedio)', 'Snappa (Avanzado)', 'Spark (Básico)', 'Spark (Intermedio)', 'Spark (Avanzado)', 'Stencila (Básico)', 'Stencila (Intermedio)', 'Stencila (Avanzado)', 'Vectr (Básico)', 'Vectr (Intermedio)', 'Vectr (Avanzado)', 'Visme (Básico)', 'Visme (Intermedio)', 'Visme (Avanzado)', 'VistaCreate (Básico)', 'VistaCreate (Intermedio)', 'VistaCreate (Avanzado)', 'Xara Designer (Básico)', 'Xara Designer (Intermedio)', 'Xara Designer (Avanzado)', 'Zeplin (Básico)', 'Zeplin (Intermedio)', 'Zeplin (Avanzado)', 'Adobe Express (Básico)', 'Adobe Express (Intermedio)', 'Adobe Express (Avanzado)',
    'Easil (Básico)', 'Easil (Intermedio)', 'Easil (Avanzado)', 'DesignCap (Básico)', 'DesignCap (Intermedio)', 'DesignCap (Avanzado)', 'Genially (Básico)', 'Genially (Intermedio)', 'Genially (Avanzado)',
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
    // Productivity Tools
    'Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Microsoft Access',
    // Apple Tools
    'Final Cut Pro (Básico)', 'Final Cut Pro (Intermedio)', 'Final Cut Pro (Avanzado)',
    'Logic Pro (Básico)', 'Logic Pro (Intermedio)', 'Logic Pro (Avanzado)',
    'GarageBand (Básico)', 'GarageBand (Intermedio)', 'GarageBand (Avanzado)',
    'Motion (Básico)', 'Motion (Intermedio)', 'Motion (Avanzado)',
    'Compressor (Básico)', 'Compressor (Intermedio)', 'Compressor (Avanzado)',
    'MainStage (Básico)', 'MainStage (Intermedio)', 'MainStage (Avanzado)',
    'Xcode (Básico)', 'Xcode (Intermedio)', 'Xcode (Avanzado)',
    'Swift (Básico)', 'Swift (Intermedio)', 'Swift (Avanzado)',
    'SwiftUI (Básico)', 'SwiftUI (Intermedio)', 'SwiftUI (Avanzado)',
    'Pages (Básico)', 'Pages (Intermedio)', 'Pages (Avanzado)',
    'Numbers (Básico)', 'Numbers (Intermedio)', 'Numbers (Avanzado)',
    'Keynote (Básico)', 'Keynote (Intermedio)', 'Keynote (Avanzado)',
    'iMovie (Básico)', 'iMovie (Intermedio)', 'iMovie (Avanzado)',
    'Photos (Básico)', 'Photos (Intermedio)', 'Photos (Avanzado)',
    'Sketch (Básico)', 'Sketch (Intermedio)', 'Sketch (Avanzado)',
    'Figma (Básico)', 'Figma (Intermedio)', 'Figma (Avanzado)', 'Adobe XD (Básico)', 'Adobe XD (Intermedio)', 'Adobe XD (Avanzado)', 'Sketch (Básico)', 'Sketch (Intermedio)', 'Sketch (Avanzado)', 'Docker', 'Kubernetes', 'AWS', 'Pandas', 'NumPy',
    // UX/UI
    'Abstract (Básico)', 'Abstract (Intermedio)', 'Abstract (Avanzado)', 'Axure (Básico)', 'Axure (Intermedio)', 'Axure (Avanzado)', 'Balsamiq (Básico)', 'Balsamiq (Intermedio)', 'Balsamiq (Avanzado)', 'Coolors (Básico)', 'Coolors (Intermedio)', 'Coolors (Avanzado)', 'Dribbble (Básico)', 'Dribbble (Intermedio)', 'Dribbble (Avanzado)', 'FigJam (Básico)', 'FigJam (Intermedio)', 'FigJam (Avanzado)', 'Flinto (Básico)', 'Flinto (Intermedio)', 'Flinto (Avanzado)',
    'Framer (Básico)', 'Framer (Intermedio)', 'Framer (Avanzado)', 'InVision (Básico)', 'InVision (Intermedio)', 'InVision (Avanzado)', 'Justinmind (Básico)', 'Justinmind (Intermedio)', 'Justinmind (Avanzado)', 'Lottie (Básico)', 'Lottie (Intermedio)', 'Lottie (Avanzado)', 'Maze (Básico)', 'Maze (Intermedio)', 'Maze (Avanzado)', 'Miro (Básico)', 'Miro (Intermedio)', 'Miro (Avanzado)', 'Mockflow (Básico)', 'Mockflow (Intermedio)', 'Mockflow (Avanzado)', 'Origami Studio (Básico)', 'Origami Studio (Intermedio)', 'Origami Studio (Avanzado)', 'Penpot (Básico)', 'Penpot (Intermedio)', 'Penpot (Avanzado)',
    'Proto.io (Básico)', 'Proto.io (Intermedio)', 'Proto.io (Avanzado)', 'Smaply (Básico)', 'Smaply (Intermedio)', 'Smaply (Avanzado)', 'Sympli (Básico)', 'Sympli (Intermedio)', 'Sympli (Avanzado)', 'UXPin (Básico)', 'UXPin (Intermedio)', 'UXPin (Avanzado)', 'UsabilityHub (Básico)', 'UsabilityHub (Intermedio)', 'UsabilityHub (Avanzado)', 'UserTesting (Básico)', 'UserTesting (Intermedio)', 'UserTesting (Avanzado)',
    'Whimsical (Básico)', 'Whimsical (Intermedio)', 'Whimsical (Avanzado)', 'Wireframe.cc (Básico)', 'Wireframe.cc (Intermedio)', 'Wireframe.cc (Avanzado)', 'ZeroHeight (Básico)', 'ZeroHeight (Intermedio)', 'ZeroHeight (Avanzado)'
  ].sort();
  
  const uniqueTechnologies = [...new Set(technologies)].sort();
  

  const teamsOptions = [
    'Análisis de Datos', 'Arquitectura', 'Arte', 'Desarrollo', 'Cloud Computing', 'DevOps', 'Diseño gráfico',
    'Inteligencia Artificial', 'No-Code Builders', 'Project Management', 'UX/UI',
  ].sort();



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
            portfolio: data.portfolio?.replace(/^https?:\/\//, '') || '',
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
            // Ubicaciones personalizadas
            homeLocation: data.personalLocations?.home,
            secondaryLocation: data.personalLocations?.secondary,
            // Redes sociales
            github: data.socialLinks?.github || '',
            linkedin: data.socialLinks?.linkedin || '',
            twitter: data.socialLinks?.twitter || '',
            instagram: data.socialLinks?.instagram || '',
            dribbble: data.socialLinks?.dribbble || '',
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
            // Ubicaciones personalizadas
            homeLocation: undefined,
            secondaryLocation: undefined,
            // Redes sociales
            github: '',
            linkedin: '',
            twitter: '',
            instagram: '',
            dribbble: '',
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('[ConfigPage] Error fetching user config:', err);
        if (onShowFailAlert) {
          onShowFailAlert('Error al cargar el perfil', err.message);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, currentUser, isLoaded, onShowFailAlert]);

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
              fullName: doc.data().fullName || 'Sin nombre',
              role: doc.data().role || 'Sin rol',
              profilePhoto: doc.data().profilePhoto || '',
            }));
        }
        setTeamMembers(membersByTeam);
      } catch (err) {
        console.error('[ConfigPage] Error fetching team members:', err);
        if (onShowFailAlert) {
          onShowFailAlert('Error al cargar los miembros del equipo', err instanceof Error ? err.message : 'Error desconocido');
        }
      }
    };

    fetchTeamMembers();
  }, [formData?.teams, userId, onShowFailAlert]);

  // Eliminar validaciones de contraseña
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
    if (formData?.portfolio && !/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(formData.portfolio)) {
      newErrors.portfolio = 'El portafolio debe ser una URL válida (sin https://)';
    }
    if (formData?.profilePhotoFile && formData.profilePhotoFile.size > 5 * 1024 * 1024) {
      newErrors.profilePhoto = 'La foto de perfil no debe exceder 5MB';
    }
    if (formData?.coverPhotoFile && formData.coverPhotoFile.size > 10 * 1024 * 1024) {
      newErrors.coverPhoto = 'La foto de portada no debe exceder 10MB';
    }
    // Eliminadas validaciones de contraseña

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

  const handleFormInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, field: { value?: string; onChange: (value: string) => void }) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          e.currentTarget.select();
          break;
        case 'c':
          e.preventDefault();
          const targetC = e.currentTarget as HTMLInputElement;
          if (targetC.selectionStart !== targetC.selectionEnd) {
            const selectedText = (field.value || '').substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        case 'v':
          e.preventDefault();
          const targetV = e.currentTarget as HTMLInputElement;
          navigator.clipboard.readText().then(text => {
            if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
              const start = targetV.selectionStart;
              const end = targetV.selectionEnd;
              const newValue = (field.value || '').substring(0, start) + text + (field.value || '').substring(end);
              field.onChange(newValue);
              setTimeout(() => {
                targetV.setSelectionRange(start + text.length, start + text.length);
              }, 0);
            } else {
              field.onChange((field.value || '') + text);
            }
          }).catch(() => {
            document.execCommand('paste');
          });
          break;
        case 'x':
          e.preventDefault();
          const targetX = e.currentTarget as HTMLInputElement;
          if (targetX.selectionStart !== targetX.selectionEnd) {
            const selectedText = (field.value || '').substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).then(() => {
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                field.onChange(newValue);
              } else {
                field.onChange('');
              }
            }).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                field.onChange(newValue);
              } else {
                field.onChange('');
              }
            });
          }
          break;
      }
    }
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

  const LOCAL_STORAGE_KEY = `configFormData_${userId}`;

  // Función para obtener sesiones activas usando User.getSessions()
  // Fuente: Tu documentación sobre el método oficial de Clerk
  const fetchSessions = useCallback(async () => {
    if (!currentUser || !isLoaded) return;
    
    try {
      setSessionsLoading(true);
      console.log('[ConfigPage] Fetching sessions using User.getSessions()');
      
      // Usar el método oficial User.getSessions() según la documentación
      const activeSessions = await currentUser.getSessions();
      console.log('[ConfigPage] Total sessions from User.getSessions():', activeSessions.length);
      console.log('[ConfigPage] Sessions data:', activeSessions);
      
      setSessions(activeSessions);
    } catch (error) {
      console.error('[ConfigPage] Error fetching sessions:', error);
      if (onShowFailAlert) {
        onShowFailAlert('Error al cargar sesiones', error instanceof Error ? error.message : 'Error desconocido');
      }
    } finally {
      setSessionsLoading(false);
    }
  }, [currentUser, isLoaded, onShowFailAlert]);



  const handleRevokeSession = async (sessionId: string) => {
    const { openSessionRevokePopup } = useTasksPageStore.getState();
    openSessionRevokePopup(sessionId);
  };

  // Función para calcular fuerza de nueva contraseña (dinámica)
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    const errors: string[] = [];

    if (password.length >= 8) strength += 1;
    else errors.push('Debe tener al menos 8 caracteres');

    if (/[A-Z]/.test(password)) strength += 1;
    else errors.push('Debe incluir una mayúscula');

    if (/[a-z]/.test(password)) strength += 1;
    else errors.push('Debe incluir una minúscula');

    if (/[0-9]/.test(password)) strength += 1;
    else errors.push('Debe incluir un número');

    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    else errors.push('Debe incluir un carácter especial');

    setPasswordStrength(Math.min(strength, 4)); // Max 4
    setPasswordErrors(errors);
  };

  // Actualiza fuerza onChange de newPassword
  useEffect(() => {
    calculatePasswordStrength(newPassword);
  }, [newPassword]);

  // Submit para cambiar contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordMatchError(true);
      if (onShowFailAlert) onShowFailAlert('Las contraseñas no coinciden');
      return;
    }

    if (passwordStrength < 3) {
      if (onShowFailAlert) onShowFailAlert('La nueva contraseña es débil. Corrige los errores.');
      return;
    }

    try {
      // Usar el método correcto de Clerk para cambiar contraseña
      await currentUser?.updatePassword({
        currentPassword,
        newPassword,
      });
      if (onShowSuccessAlert) onShowSuccessAlert('Contraseña actualizada exitosamente');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors([]);
      setPasswordMatchError(false);
    } catch (error: unknown) {
      console.error('[ConfigPage] Error updating password:', error);
      let msg = 'Error al actualizar contraseña';
      if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as { errors: unknown[] }).errors)) {
        const errorCode = (error as { errors: { code: string }[] }).errors[0]?.code;
        if (errorCode === 'form_password_incorrect') {
          msg = 'Contraseña actual incorrecta';
        } else if (errorCode === 'form_password_pwned') {
          msg = 'Contraseña comprometida; elige una más segura';
        } else if (errorCode === 'form_password_validation_failed') {
          msg = 'No cumple requisitos de Clerk';
        }
      }
      if (onShowFailAlert) onShowFailAlert(msg, error instanceof Error ? error.message : 'Error desconocido');
    }
  };



  // Cargar datos de localStorage si existen (antes de cargar Firestore)
  useEffect(() => {
    if (!isLoaded || !userId) return;
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setFormData(parsed);
        setLoading(false);
      } catch {
        // Si hay error, ignora y sigue con Firestore
      }
    }
  }, [userId, isLoaded, LOCAL_STORAGE_KEY]);

  // Cargar sesiones activas cuando el componente se monta
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Guardar en localStorage cada vez que formData cambie
  useEffect(() => {
    if (formData) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, LOCAL_STORAGE_KEY]);

  // Limpiar localStorage al guardar exitosamente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !userId || !currentUser) {
      if (onShowFailAlert) onShowFailAlert('Datos inválidos, por favor intenta de nuevo');
      return;
    }

    if (!validateForm()) {
      if (onShowFailAlert) onShowFailAlert('Por favor corrige los errores en el formulario');
      return;
    }

    try {
      setLoading(true);

      let profilePhotoUrl = formData.profilePhoto;
      let coverPhotoUrl = formData.coverPhoto;

      if (formData.profilePhotoFile) {
        if (config?.profilePhoto && !config.profilePhoto.includes('clerk.com') && !config.profilePhoto.includes('empty-image.png')) {
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

      // Eliminada lógica de cambio de contraseña

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
        portfolio: formData.portfolio ? `https://${formData.portfolio}` : '',
        stack: formData.stack,
        teams: formData.teams,
        profilePhoto: profilePhotoUrl,
        coverPhoto: coverPhotoUrl,
        status: formData.status || 'Disponible',
        // Ubicaciones personalizadas
        personalLocations: {
          home: formData.homeLocation || null,
          secondary: formData.secondaryLocation || null,
        },
        // Redes sociales
        socialLinks: {
          github: formData.github || '',
          linkedin: formData.linkedin || '',
          twitter: formData.twitter || '',
          instagram: formData.instagram || '',
          dribbble: formData.dribbble || '',
        },
      });

      if (onShowSuccessAlert) onShowSuccessAlert('Perfil actualizado exitosamente');
      setIsEditing(false);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Limpiar caché al guardar
    } catch (err) {
      if (onShowFailAlert) onShowFailAlert('Error al guardar los datos, por favor intenta de nuevo', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar localStorage si se descartan cambios
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
                    portfolio: config.portfolio?.replace(/^https?:\/\//, '') || '',
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
        // Ubicaciones personalizadas
        homeLocation: config.personalLocations?.home,
        secondaryLocation: config.personalLocations?.secondary,
      };
    });
    setErrors({});
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Función helper para manejar shortcuts de teclado en inputs
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, fieldName: string) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          e.currentTarget.select();
          break;
        case 'c':
          e.preventDefault();
          const targetC = e.currentTarget as HTMLInputElement;
          if (targetC.selectionStart !== targetC.selectionEnd) {
            const selectedText = formData[fieldName as keyof ConfigForm]?.toString().substring(targetC.selectionStart || 0, targetC.selectionEnd || 0) || '';
            navigator.clipboard.writeText(selectedText).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        case 'v':
          e.preventDefault();
          const targetV = e.currentTarget as HTMLInputElement;
          navigator.clipboard.readText().then(text => {
            if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
              const start = targetV.selectionStart;
              const end = targetV.selectionEnd;
              const currentValue = formData[fieldName as keyof ConfigForm]?.toString() || '';
              const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
              setFormData(prev => ({ ...prev, [fieldName]: newValue }));
              setTimeout(() => {
                targetV.setSelectionRange(start + text.length, start + text.length);
              }, 0);
            } else {
              const currentValue = formData[fieldName as keyof ConfigForm]?.toString() || '';
              setFormData(prev => ({ ...prev, [fieldName]: currentValue + text }));
            }
          }).catch(() => {
            document.execCommand('paste');
          });
          break;
        case 'x':
          e.preventDefault();
          const targetX = e.currentTarget as HTMLInputElement;
          if (targetX.selectionStart !== targetX.selectionEnd) {
            const selectedText = formData[fieldName as keyof ConfigForm]?.toString().substring(targetX.selectionStart || 0, targetX.selectionEnd || 0) || '';
            navigator.clipboard.writeText(selectedText).then(() => {
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const currentValue = formData[fieldName as keyof ConfigForm]?.toString() || '';
                const newValue = currentValue.substring(0, start) + currentValue.substring(end);
                setFormData(prev => ({ ...prev, [fieldName]: newValue }));
              } else {
                setFormData(prev => ({ ...prev, [fieldName]: '' }));
              }
            }).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const currentValue = formData[fieldName as keyof ConfigForm]?.toString() || '';
                const newValue = currentValue.substring(0, start) + currentValue.substring(end);
                setFormData(prev => ({ ...prev, [fieldName]: newValue }));
              } else {
                setFormData(prev => ({ ...prev, [fieldName]: '' }));
              }
            });
          }
          break;
      }
    }
  }, [formData]);

  const formatPhoneNumber = (phone: string) => {
    // Si phone está vacío, mostrar placeholder
    if (!phone) return '';
    
    const digits = phone.replace(/\D/g, '');
    
    // Formatear según la cantidad de dígitos para formato XXX-XXX-XX-XX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else if (digits.length <= 8) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
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
    return <SkeletonLoader type="config" rows={5} />;
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
          {isOwnProfile && !isEditing && (
            <div className={styles.frame239191}>
              <button className={styles.editButton} onClick={toggleEdit}>
                <Image src="/pencil.svg" alt="Editar" width={16} height={16} className={styles.editButtonIcon} />
                Editar Perfil
              </button>
            </div>
          )}
        </div>
        <div className={styles.content}>
          <section className={styles.section}>
            <div className={styles.sectionContent}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                <Image src="/circle-user-round.svg" alt="Información" width={20} height={20} className={styles.sectionIcon} />
                Información General
              </h2>
                <div className={styles.stackDescription}>
                  Completa tu información personal básica para que otros puedan conocerte mejor.
                </div>
              </div>
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
                    onKeyDown={(e) => handleInputKeyDown(e, 'fullName')}
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
                    onKeyDown={(e) => handleInputKeyDown(e, 'role')}
                  />
                  {errors.role && <p className={styles.errorText}>{errors.role}</p>}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <BiographyInput
                  value={formData.description}
                  onChange={(value) => {
                    setFormData((prev) => (prev ? { ...prev, description: value } : null));
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Breve descripción personal"
                  disabled={!isOwnProfile || !isEditing}
                  maxLength={180}
                  label="Acerca de ti"
                  className={styles.input}
                />
                {errors.description && <p className={styles.errorText}>{errors.description}</p>}
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
                    onKeyDown={(e) => handleInputKeyDown(e, 'birthDate')}
                  />
                  {errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
                </div>
              </div>
              <div className={styles.fieldGroupRow}>
                <div className={styles.frame239182}>
                  <div className={styles.label}>Teléfono de Contacto</div>
                  <div className={styles.phoneInputContainer}>
                    <PhoneCountrySelect
                      value={formData.phoneLada}
                      onChange={handlePhoneLadaChange}
                      disabled={!isOwnProfile || !isEditing}
                    />
                    <input
                      type="text"
                      name="phone"
                      value={formatPhoneNumber(formData.phone || '')}
                      onChange={handlePhoneChange}
                      placeholder="XXX-XXX-XX-XX"
                      className={styles.input}
                      disabled={!isOwnProfile || !isEditing}
                      maxLength={15}
                      onKeyDown={(e) => handleInputKeyDown(e, 'phone')}
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
                    onKeyDown={(e) => handleInputKeyDown(e, 'city')}
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
                  <WebsiteInput
                    value={formData.portfolio}
                    onChange={(value) => {
                      setFormData((prev) => (prev ? { ...prev, portfolio: value } : null));
                      setErrors((prev) => ({ ...prev, portfolio: undefined }));
                    }}
                    placeholder="miportafolio.com"
                    disabled={!isOwnProfile || !isEditing}
                    className={styles.input}
                  />
                  {errors.portfolio && <p className={styles.errorText}>{errors.portfolio}</p>}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionContent}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Image src="/map-pinned.svg" alt="Ubicaciones" width={20} height={20} className={styles.sectionIcon} />
                  Ubicaciones Personalizadas
                </h2>
                <div className={styles.stackDescription}>
                  Configura tus ubicaciones frecuentes para que el sistema pueda detectar automáticamente dónde estás (casa, oficina o fuera).
                </div>
                                  <div className={styles.stackDescription} style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Tus direcciones no se comparten con nadie y están cifradas de extremo a extremo con tecnología AES-256. Solo tú puedes verlas.
                    El resto del equipo únicamente verá si estás en &ldquo;Casa&rdquo;, &ldquo;Oficina&rdquo; o &ldquo;Fuera&rdquo;, sin conocer tu ubicación exacta.
                  </div>
              </div>
              
              <div className={styles.fieldGroup2}>
                <div className={styles.fieldGroupHeader}>
                  <h3 className={styles.subsectionTitle}>Ubicación de Casa</h3>
                  <div className={styles.stackDescription} style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Esta es tu ubicación principal, por ejemplo donde haces home office o trabajas remotamente.
                  </div>
                </div>
                <LocationDropdown
                  value={formData.homeLocation}
                  onChange={(location) => {
                    setFormData((prev) => (prev ? { ...prev, homeLocation: location } : null));
                  }}
                  placeholder="Busca tu dirección de casa..."
                  label="Casa"
                  disabled={!isOwnProfile || !isEditing}
                  required={false}
                />
                <div className={styles.securityNote} style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Esta dirección está protegida con cifrado AES-256. Nadie en el sistema tiene acceso a tu dirección exacta.
                </div>
              </div>
              
              <div className={styles.fieldGroup2}>
                <div className={styles.fieldGroupHeader}>
                  <h3 className={styles.subsectionTitle}>Ubicación Alternativa</h3>
                  <div className={styles.stackDescription} style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Puedes añadir una segunda ubicación si trabajas desde más de un lugar.
                  </div>
                </div>
                <LocationDropdown
                  value={formData.secondaryLocation}
                  onChange={(location) => {
                    setFormData((prev) => (prev ? { ...prev, secondaryLocation: location } : null));
                  }}
                  placeholder="Busca tu ubicación secundaria (café, coworking, etc.)..."
                  label="Ubicación Secundaria"
                  disabled={!isOwnProfile || !isEditing}
                  required={false}
                />
              </div>
              
              <div className={styles.privacyDisclaimer}>
                <div className={styles.privacyDisclaimerTitle}>
                  Privacidad garantizada
                </div>
                <div className={styles.privacyDisclaimerText}>
                  Tus direcciones están cifradas con algoritmos seguros y almacenadas en Firestore bajo los estándares de cifrado nativo de Google.
                  Incluso si accedes a tu documento desde Firestore, los datos están encriptados y son ilegibles sin tu clave secreta.
                  Solo tú puedes ver y modificar tu información de ubicación.
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionContent}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                <Image src="/layers.svg" alt="Stack" width={20} height={20} className={styles.sectionIcon} />
                Stack
              </h2>
                <div className={styles.stackDescription}>
                  Selecciona las tecnologías y herramientas que usas frecuentemente.
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <SearchableDropdown
                  items={uniqueTechnologies.map(tech => ({
                    id: tech,
                    name: tech
                  }))}
                  selectedItems={formData.stack || []}
                  onSelectionChange={handleStackChange}
                  placeholder="Selecciona tecnologías..."
                  searchPlaceholder="Buscar tecnologías..."
                  disabled={!isOwnProfile || !isEditing}
                  multiple={true}
                  maxItems={40}
                  emptyMessage="No se encontraron tecnologías"
                  className={styles.stackSelect}
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>
                <Image src="/share-2.svg" alt="Redes Sociales" width={20} height={20} className={styles.sectionIcon} />
                Redes Sociales
              </h2>
              <div className={styles.fieldGroup}>
                <div className={styles.stackDescription}>
                  Agrega tus perfiles de redes sociales para que otros puedan conectarse contigo.
                </div>
              </div>
              
              {/* GitHub - Contenedor individual */}
              <div className={styles.socialContainer}>
                <div className={styles.label}>
                  <SocialIcon icon="/github.svg" alt="GitHub" />
                  GitHub
                </div>
                <input
                  type="text"
                  name="github"
                  value={formData.github || ''}
                  onChange={handleInputChange}
                  placeholder="usuario-github"
                  className={`${styles.input} ${!isOwnProfile || !isEditing ? styles.readOnly : ''}`}
                  disabled={!isOwnProfile || !isEditing}
                  onKeyDown={(e) => handleFormInputKeyDown(e, { 
                    value: formData.github || '', 
                    onChange: (value) => {
                      const event = { target: { name: 'github', value } } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }
                  })}
                />
              </div>

              {/* LinkedIn - Contenedor individual */}
              <div className={styles.socialContainer}>
                <div className={styles.label}>
                  <SocialIcon icon="/linkedin.svg" alt="LinkedIn" />
                  LinkedIn
                </div>
                <input
                  type="text"
                  name="linkedin"
                  value={formData.linkedin || ''}
                  onChange={handleInputChange}
                  placeholder="in/usuario-linkedin"
                  className={`${styles.input} ${!isOwnProfile || !isEditing ? styles.readOnly : ''}`}
                  disabled={!isOwnProfile || !isEditing}
                  onKeyDown={(e) => handleFormInputKeyDown(e, { 
                    value: formData.linkedin || '', 
                    onChange: (value) => {
                      const event = { target: { name: 'linkedin', value } } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }
                  })}
                />
              </div>

              {/* Twitter - Contenedor individual */}
              <div className={styles.socialContainer}>
                <div className={styles.label}>
                  <SocialIcon icon="/twitter.svg" alt="Twitter" />
                  Twitter / X
                </div>
                <input
                  type="text"
                  name="twitter"
                  value={formData.twitter || ''}
                  onChange={handleInputChange}
                  placeholder="@usuario-twitter"
                  className={`${styles.input} ${!isOwnProfile || !isEditing ? styles.readOnly : ''}`}
                  disabled={!isOwnProfile || !isEditing}
                  onKeyDown={(e) => handleFormInputKeyDown(e, { 
                    value: formData.twitter || '', 
                    onChange: (value) => {
                      const event = { target: { name: 'twitter', value } } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }
                  })}
                />
              </div>

              {/* Instagram - Contenedor individual */}
              <div className={styles.socialContainer}>
                <div className={styles.label}>
                  <SocialIcon icon="/instagram.svg" alt="Instagram" />
                  Instagram
                </div>
                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram || ''}
                  onChange={handleInputChange}
                  placeholder="@usuario-instagram"
                  className={`${styles.input} ${!isOwnProfile || !isEditing ? styles.readOnly : ''}`}
                  disabled={!isOwnProfile || !isEditing}
                  onKeyDown={(e) => handleFormInputKeyDown(e, { 
                    value: formData.instagram || '', 
                    onChange: (value) => {
                      const event = { target: { name: 'instagram', value } } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }
                  })}
                />
              </div>

              {/* Dribbble - Contenedor individual */}
              <div className={styles.socialContainer}>
                <div className={styles.label}>
                  <SocialIcon icon="/dribble.svg" alt="Dribbble" />
                  Dribbble
                </div>
                <input
                  type="text"
                  name="dribbble"
                  value={formData.dribbble || ''}
                  onChange={handleInputChange}
                  placeholder="usuario-dribbble"
                  className={`${styles.input} ${!isOwnProfile || !isEditing ? styles.readOnly : ''}`}
                  disabled={!isOwnProfile || !isEditing}
                  onKeyDown={(e) => handleFormInputKeyDown(e, { 
                    value: formData.dribbble || '', 
                    onChange: (value) => {
                      const event = { target: { name: 'dribbble', value } } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }
                  })}
                />
              </div>
            </div>
          </section>

          <motion.section 
            className={styles.section} 
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className={styles.sectionContent}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                <Image src="/users-round.svg" alt="Equipos" width={20} height={20} className={styles.sectionIcon} />
                Equipos
              </h2>
                <div className={styles.teamsDescription}>
                  Escribe y selecciona aquí tus equipos (máximo 3)
                </div>
              </div>
              <div className={styles.fieldGroup} style={{flexDirection: 'row', justifyContent:'space-between', width:"100%"}}>
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
              
              <AnimatePresence mode="wait">
                {formData.teams && formData.teams.length > 0 ? (
                  <motion.div
                    variants={tableVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <TeamsTable
                      teams={formData.teams.map(teamName => ({
                        name: teamName,
                        members: teamMembers[teamName] || []
                      }))}
                      currentUserId={currentUser?.id}
                      isEditing={isOwnProfile && isEditing}
                      onRemoveTeam={isOwnProfile && isEditing ? handleRemoveTeam : undefined}
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    className={styles.noDataMessage}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    No perteneces a ningún equipo
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.section>
          
          {/* Sección de Seguridad con Sesiones Reales */}
          {isOwnProfile && (
            <motion.section 
              className={styles.section} 
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div 
                className={styles.sectionContent}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <Image 
                      src="/shield.svg" 
                      alt="Seguridad" 
                      width={20} 
                      height={20} 
                      className={styles.sectionIcon}
                      onError={(e) => {
                        console.error('Error loading shield icon:', e);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    Seguridad
                  </h2>
                  <div className={styles.stackDescription}>
                    Gestiona tu contraseña y dispositivos activos de forma segura.
                  </div>
                </div>
                
                {/* Sección de Contraseña */}
                <div className={styles.fieldGroup}>
                  <div className={styles.clerkSection}>
                    <div className={styles.clerkSectionHeader}>
                      <h3 className={styles.clerkSectionTitle}>Contraseña</h3>
                      <div className={styles.clerkSectionHint}>
                        Cambia tu contraseña regularmente para mantener tu cuenta segura
                      </div>
                    </div>
                    <div className={styles.clerkSectionContent}>
                      {!showPasswordForm && (
                        <div className={styles.clerkSectionItem}>
                          <p className={styles.clerkPasswordDisplay}>
                            {currentUser?.passwordEnabled ? '••••••••••' : 'No configurada'}
                          </p>
                          {currentUser?.passwordEnabled ? (
                            <button 
                              className={styles.clerkButton}
                              onClick={() => setShowPasswordForm(!showPasswordForm)}
                            >
                              Cambiar contraseña
                            </button>
                          ) : (
                            <button 
                              className={styles.clerkButton}
                              onClick={() => {
                                if (onShowFailAlert) {
                                  onShowFailAlert('Función no disponible', 'Para configurar contraseña, usa la página de Clerk');
                                }
                              }}
                            >
                              Configurar contraseña
                            </button>
                          )}
                        </div>
                      )}

                      {/* Form de cambio de contraseña */}
                      <AnimatePresence>
                        {showPasswordForm && currentUser?.passwordEnabled && (
                          <motion.form 
                            onSubmit={handleChangePassword} 
                            className={styles.passwordForm}
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ 
                              duration: 0.3, 
                              ease: "easeInOut",
                              height: { duration: 0.4, ease: "easeInOut" }
                            }}
                          >
                          {/* Botón cancelar en la parte superior */}
                          <div className={styles.passwordFormHeader}>
                            <button 
                              type="button" 
                              onClick={() => {
                                setShowPasswordForm(false);
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                                setPasswordErrors([]);
                                setPasswordMatchError(false);
                              }} 
                              className={styles.cancelButton}
                            >
                              ✕ Cancelar
                            </button>
                          </div>
                          
                          <div className={styles.fieldGroupColumn}>
                            <label className={styles.label}>Contraseña Actual</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className={styles.input}
                              placeholder="Ingresa tu contraseña actual"
                              required
                            />
                          </div>
                          
                          <div className={styles.fieldGroupColumn}>
                            <label className={styles.label}>Nueva Contraseña</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className={styles.input}
                              placeholder="Ingresa tu nueva contraseña"
                              required
                            />
                            {/* Indicadores dinámicos de fuerza */}
                            {newPassword && (
                              <div className={styles.passwordStrength}>
                                <div 
                                  className={styles.strengthBar} 
                                  style={{ 
                                    width: `${(passwordStrength / 4) * 100}%`, 
                                    backgroundColor: passwordStrength < 2 ? '#ef4444' : passwordStrength < 3 ? '#f59e0b' : '#10b981' 
                                  }} 
                                />
                                <ul className={styles.strengthTips}>
                                  {passwordErrors.map((err, i) => (
                                    <li key={i} className={styles.strengthTip}>
                                      {err}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <div className={styles.fieldGroupColumn}>
                            <label className={styles.label}>Confirmar Nueva Contraseña</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setPasswordMatchError(e.target.value !== newPassword && e.target.value !== '');
                              }}
                              className={styles.input}
                              placeholder="Confirma tu nueva contraseña"
                              required
                            />
                            {passwordMatchError && (
                              <p className={styles.errorText}>Las contraseñas no coinciden</p>
                            )}
                          </div>
                          
                          <div className={styles.passwordFormActions}>
                            <button type="submit" className={styles.editButton}>
                              Guardar Nueva Contraseña
                            </button>
                          </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                      {currentUser?.twoFactorEnabled && (
                        <div className={styles.clerkTwoFactorInfo}>
                          <p>🔐 Autenticación de dos factores habilitada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sección de Dispositivos Activos */}
                <div className={styles.fieldGroup}>
                  <div className={styles.clerkSection}>
                    <div className={styles.clerkSectionHeader}>
                      <h3 className={styles.clerkSectionTitle}>Dispositivos Activos</h3>
                      <div className={styles.clerkSectionHint}>
                        Revisa y gestiona los dispositivos donde has iniciado sesión
                      </div>
                    </div>
                    <div className={styles.clerkSectionContent}>
                      {sessionsLoading ? (
                        <div className={styles.clerkLoading}>
                          <p>Cargando dispositivos...</p>
                        </div>
                      ) : sessions && sessions.length > 0 ? (
                        <div className={styles.clerkDeviceList}>
                          {sessions
                            .sort((a, b) => {
                              // La sesión actual va primero
                              const aIsCurrent = a.id === currentSession?.id;
                              const bIsCurrent = b.id === currentSession?.id;
                              if (aIsCurrent && !bIsCurrent) return -1;
                              if (!aIsCurrent && bIsCurrent) return 1;
                              return 0;
                            })
                            .map((session) => {
                            // Acceder a latestActivity según tu documentación
                            const activity = session.latestActivity;
                            console.log('[ConfigPage] Session activity:', activity);
                            
                            // Generar etiqueta del dispositivo según tu documentación
                            const deviceLabel = activity 
                              ? `${activity.browserName || 'Desconocido'} ${activity.browserVersion || ''} en ${activity.deviceType || 'Dispositivo desconocido'}${activity.isMobile ? ' (Móvil)' : ''}`
                              : 'Dispositivo desconocido';
                            
                            const ipLabel = activity?.ipAddress || 'IP desconocida';
                            const locationLabel = activity 
                              ? `${activity.city || 'Ciudad desconocida'}, ${activity.country || 'País desconocido'}`
                              : 'Ubicación desconocida';
                            
                            // Determinar si es el dispositivo actual
                            const isCurrent = session.id === currentSession?.id;
                            
                            return (
                              <div key={session.id} className={styles.clerkDeviceItem}>
                                <div className={styles.clerkDevice}>
                                  <div className={styles.clerkDeviceIcon}>
                                    {activity?.isMobile ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="670.6 72.3 84 76" width="32" height="32">
                                        <path fill="#6D6D6D" fillRule="evenodd" d="M712.5 107.2v-.6h.1l.2.1v7.2a.1.1 0 0 1-.2.2l-.1-.3v-6.6Z" clipRule="evenodd"/>
                                        <path fill="#6D6D6D" fillRule="evenodd" d="M697.4 100v-.7h-.2a.1.1 0 0 0-.1.2v4.4s0 .2.2.2V100Z" clipRule="evenodd"/>
                                        <path fill="#6D6D6D" fillRule="evenodd" d="M697.4 94v-.7h-.2a.1.1 0 0 0-.1.2v4.4s0 .2.2.2V94Z" clipRule="evenodd"/>
                                        <path fill="#363636" d="M722.7 78.6c3.6 0 5.5 2.1 5.5 5.7v52.4c0 3.4-2.3 5.3-5.8 5.3H703c-3.8 0-5.8-2.4-5.7-5.4V84.3c0-3.6 2-5.7 5.6-5.7h19.8Z"/>
                                        <path fill="#363636" stroke="black" strokeWidth="0.5" d="M722.3 79.2c3.7 0 5.4 1.8 5.4 5.4v52c0 3.2-2.2 5-5.5 5h-19c-3.2 0-5.4-2-5.4-5v-52c0-3.6 1.8-5.4 5.5-5.4h19Z"/>
                                        <path fill="black" fillRule="evenodd" d="M704.9 80.3c.2 0 .3.1.3.4v.2c0 .9.8 1.7 1.6 1.7h11.8c1 0 1.7-.8 1.7-1.7v-.2c0-.3.1-.4.3-.4h3c1.6 0 3 1.7 3 3.3V137c0 1.7-1.5 3.3-3.4 3.3h-21c-2.1 0-3.3-1.3-3.3-3.2V83.6c0-1.6 1.3-3.3 2.9-3.3h3Z" clipRule="evenodd"/>
                                        <path fillRule="evenodd" d="M715.3 81.2a.3.3 0 0 0-.2-.4.3.3 0 1 0-.2.6.3.3 0 0 0 .4-.2Zm-5.1-.2c0 .2 0 .3.2.3h2.9a.3.3 0 0 0 .2-.3.3.3 0 0 0-.2-.2h-2.9a.3.3 0 0 0-.2.2Z" clipRule="evenodd"/>
                                      </svg>
                                    ) : (
                                      <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
                                        <path d="M2.91 1.452c0-.58.077-.83.23-1.079C3.33.166 3.6 0 4.212 0h23.617c.536 0 .765.124.957.332.191.207.268.498.268 1.12v17.013c0 .58-.077.83-.192.996a1.06 1.06 0 0 1-.37.338.968.968 0 0 1-.472.118H3.905c-.306 0-.612-.125-.765-.415-.153-.166-.23-.415-.23-1.037V1.452Z" fill="#000"/>
                                        <path d="M3.445 19.334h25.072c.115 0 .23-.083.306-.166.077-.083.077-.207.077-.58V1.45c0-.498-.038-.83-.23-.995-.191-.208-.383-.29-.842-.29H4.211c-.498 0-.766.124-.957.331-.153.166-.192.415-.192.954v17.137c0 .374 0 .498.077.581.077.083.191.166.306.166Z" fill="#575757"/>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M15.999.912a.109.109 0 0 0 .117.006.119.119 0 0 0 .045-.046.132.132 0 0 0 0-.128.119.119 0 0 0-.045-.046.108.108 0 0 0-.117.006.109.109 0 0 0-.118-.006.12.12 0 0 0-.044.046.132.132 0 0 0 0 .128.12.12 0 0 0 .044.046.108.108 0 0 0 .118-.006Z" fill="#000" stroke="#000" strokeWidth="0.3"/>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M0 19.5v-.207h32v.207s-.727.25-1.531.332c-.536.042-1.416.166-3.407.166H5.091c-1.723 0-3.177-.124-3.828-.207C.613 19.708 0 19.5 0 19.5Z" fill="#444"/>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M3.941 1.328h24.115v16.349H3.941V1.328Z" fill="#000"/>
                                      </svg>
                                    )}
                                  </div>
                                  <div className={styles.clerkDeviceInfo}>
                                    <div className={styles.clerkDeviceHeader}>
                                      <p className={styles.clerkDeviceName}>{deviceLabel}</p>
                                      {isCurrent && (
                                        <span className={styles.clerkDeviceBadge}>Este dispositivo</span>
                                      )}
                                    </div>
                                    <p className={styles.clerkDeviceDetails}>{activity?.browserName || 'Navegador desconocido'}</p>
                                    <p className={styles.clerkDeviceDetails}>{ipLabel} ({locationLabel})</p>
                                    <p className={styles.clerkDeviceDetails}>
                                      {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString('es-MX') : 'Desconocido'}
                                    </p>
                                  </div>
                                  <button
                                    className={styles.clerkRevokeButton}
                                    onClick={() => handleRevokeSession(session.id)}
                                  >
                                    {isCurrent ? 'Cerrar esta sesión' : 'Cerrar sesión'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={styles.clerkNoDevices}>
                          <p>No hay dispositivos activos</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.section>
          )}
          
          {/* Botones de acción al final */}
          {isOwnProfile && isEditing && (
            <div className={styles.frame239191} style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className={styles.discardButton} onClick={handleDiscard}>
                Descartar Cambios
              </button>
              <button className={styles.editButton} onClick={handleSubmit}>
                Guardar Cambios
              </button>
            </div>
          )}


        </div>
      </div>
    </>
  );
};

export default ConfigPage;