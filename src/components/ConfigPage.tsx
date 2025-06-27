'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
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

  const ladaOptions = [
    // México
    { value: '+52', label: '🇲🇽 +52', region: 'México' },
    
    // América del Norte
    { value: '+1', label: '🇺🇸 +1', region: 'América del Norte' },
    { value: '+1-809', label: '🇩🇴 +1-809', region: 'América del Norte' },
    { value: '+1-787', label: '🇵🇷 +1-787', region: 'América del Norte' },
    
    // América Central
    { value: '+502', label: '🇬🇹 +502', region: 'América Central' },
    { value: '+503', label: '🇸🇻 +503', region: 'América Central' },
    { value: '+504', label: '🇭🇳 +504', region: 'América Central' },
    { value: '+505', label: '🇳🇮 +505', region: 'América Central' },
    { value: '+506', label: '🇨🇷 +506', region: 'América Central' },
    { value: '+507', label: '🇵🇦 +507', region: 'América Central' },
    { value: '+501', label: '🇧🇿 +501', region: 'América Central' },
    
    // América del Sur
    { value: '+54', label: '🇦🇷 +54', region: 'América del Sur' },
    { value: '+55', label: '🇧🇷 +55', region: 'América del Sur' },
    { value: '+56', label: '🇨🇱 +56', region: 'América del Sur' },
    { value: '+57', label: '🇨🇴 +57', region: 'América del Sur' },
    { value: '+58', label: '🇻🇪 +58', region: 'América del Sur' },
    { value: '+51', label: '🇵🇪 +51', region: 'América del Sur' },
    { value: '+593', label: '🇪🇨 +593', region: 'América del Sur' },
    { value: '+595', label: '🇵🇾 +595', region: 'América del Sur' },
    { value: '+598', label: '🇺🇾 +598', region: 'América del Sur' },
    { value: '+591', label: '🇧🇴 +591', region: 'América del Sur' },
    { value: '+592', label: '🇬🇾 +592', region: 'América del Sur' },
    
    // Europa Occidental
    { value: '+44', label: '🇬🇧 +44', region: 'Europa Occidental' },
    { value: '+33', label: '🇫🇷 +33', region: 'Europa Occidental' },
    { value: '+49', label: '🇩🇪 +49', region: 'Europa Occidental' },
    { value: '+34', label: '🇪🇸 +34', region: 'Europa Occidental' },
    { value: '+39', label: '🇮🇹 +39', region: 'Europa Occidental' },
    { value: '+31', label: '🇳🇱 +31', region: 'Europa Occidental' },
    { value: '+32', label: '🇧🇪 +32', region: 'Europa Occidental' },
    { value: '+351', label: '🇵🇹 +351', region: 'Europa Occidental' },
    { value: '+41', label: '🇨🇭 +41', region: 'Europa Occidental' },
    { value: '+43', label: '🇦🇹 +43', region: 'Europa Occidental' },
    { value: '+30', label: '🇬🇷 +30', region: 'Europa Occidental' },
    { value: '+353', label: '🇮🇪 +353', region: 'Europa Occidental' },
    { value: '+46', label: '🇸🇪 +46', region: 'Europa Occidental' },
    { value: '+47', label: '🇳🇴 +47', region: 'Europa Occidental' },
    { value: '+45', label: '🇩🇰 +45', region: 'Europa Occidental' },
    { value: '+358', label: '🇫🇮 +358', region: 'Europa Occidental' },
    { value: '+420', label: '🇨🇿 +420', region: 'Europa Occidental' },
    { value: '+48', label: '🇵🇱 +48', region: 'Europa Occidental' },
    
    // Europa del Este
    { value: '+7', label: '🇷🇺 +7', region: 'Europa del Este' },
    { value: '+380', label: '🇺🇦 +380', region: 'Europa del Este' },
    { value: '+373', label: '🇲🇩 +373', region: 'Europa del Este' },
    { value: '+374', label: '🇦🇲 +374', region: 'Europa del Este' },
    { value: '+995', label: '🇬🇪 +995', region: 'Europa del Este' },
    { value: '+994', label: '🇦🇿 +994', region: 'Europa del Este' },
    { value: '+993', label: '🇹🇲 +993', region: 'Europa del Este' },
    { value: '+992', label: '🇹🇯 +992', region: 'Europa del Este' },
    { value: '+996', label: '🇰🇬 +996', region: 'Europa del Este' },
    { value: '+998', label: '🇺🇿 +998', region: 'Europa del Este' },
    
    // Asia Oriental
    { value: '+81', label: '🇯🇵 +81', region: 'Asia Oriental' },
    { value: '+82', label: '🇰🇷 +82', region: 'Asia Oriental' },
    { value: '+86', label: '🇨🇳 +86', region: 'Asia Oriental' },
    { value: '+886', label: '🇹🇼 +886', region: 'Asia Oriental' },
    { value: '+852', label: '🇭🇰 +852', region: 'Asia Oriental' },
    { value: '+853', label: '🇲🇴 +853', region: 'Asia Oriental' },
    { value: '+84', label: '🇻🇳 +84', region: 'Asia Oriental' },
    { value: '+855', label: '🇰🇭 +855', region: 'Asia Oriental' },
    { value: '+856', label: '🇱🇦 +856', region: 'Asia Oriental' },
    { value: '+66', label: '🇹🇭 +66', region: 'Asia Oriental' },
    { value: '+95', label: '🇲🇲 +95', region: 'Asia Oriental' },
    { value: '+60', label: '🇲🇾 +60', region: 'Asia Oriental' },
    { value: '+65', label: '🇸🇬 +65', region: 'Asia Oriental' },
    { value: '+673', label: '🇧🇳 +673', region: 'Asia Oriental' },
    
    // Asia Meridional
    { value: '+91', label: '🇮🇳 +91', region: 'Asia Meridional' },
    { value: '+880', label: '🇧🇩 +880', region: 'Asia Meridional' },
    { value: '+977', label: '🇳🇵 +977', region: 'Asia Meridional' },
    { value: '+94', label: '🇱🇰 +94', region: 'Asia Meridional' },
    { value: '+960', label: '🇲🇻 +960', region: 'Asia Meridional' },
    { value: '+975', label: '🇧🇹 +975', region: 'Asia Meridional' },
    { value: '+92', label: '🇵🇰 +92', region: 'Asia Meridional' },
    { value: '+93', label: '🇦🇫 +93', region: 'Asia Meridional' },
    { value: '+98', label: '🇮🇷 +98', region: 'Asia Meridional' },
    { value: '+964', label: '🇮🇶 +964', region: 'Asia Meridional' },
    { value: '+965', label: '🇰🇼 +965', region: 'Asia Meridional' },
    { value: '+966', label: '🇸🇦 +966', region: 'Asia Meridional' },
    { value: '+967', label: '🇾🇪 +967', region: 'Asia Meridional' },
    { value: '+968', label: '🇴🇲 +968', region: 'Asia Meridional' },
    { value: '+971', label: '🇦🇪 +971', region: 'Asia Meridional' },
    { value: '+972', label: '🇮🇱 +972', region: 'Asia Meridional' },
    { value: '+973', label: '🇧🇭 +973', region: 'Asia Meridional' },
    { value: '+974', label: '🇶🇦 +974', region: 'Asia Meridional' },
    { value: '+90', label: '🇹🇷 +90', region: 'Asia Meridional' },
    
    // África
    { value: '+27', label: '🇿🇦 +27', region: 'África' },
    { value: '+20', label: '🇪🇬 +20', region: 'África' },
    { value: '+212', label: '🇲🇦 +212', region: 'África' },
    { value: '+234', label: '🇳🇬 +234', region: 'África' },
    { value: '+254', label: '🇰🇪 +254', region: 'África' },
    { value: '+233', label: '🇬🇭 +233', region: 'África' },
    { value: '+225', label: '🇨🇮 +225', region: 'África' },
    { value: '+221', label: '🇸🇳 +221', region: 'África' },
    { value: '+237', label: '🇨🇲 +237', region: 'África' },
    { value: '+236', label: '🇨🇫 +236', region: 'África' },
    { value: '+235', label: '🇹🇩 +235', region: 'África' },
    { value: '+241', label: '🇬🇦 +241', region: 'África' },
    { value: '+242', label: '🇨🇬 +242', region: 'África' },
    { value: '+243', label: '🇨🇩 +243', region: 'África' },
    { value: '+244', label: '🇦🇴 +244', region: 'África' },
    { value: '+245', label: '🇬🇼 +245', region: 'África' },
    { value: '+249', label: '🇸🇩 +249', region: 'África' },
    { value: '+250', label: '🇷🇼 +250', region: 'África' },
    { value: '+251', label: '🇪🇹 +251', region: 'África' },
    { value: '+252', label: '🇸🇴 +252', region: 'África' },
    { value: '+253', label: '🇩🇯 +253', region: 'África' },
    { value: '+255', label: '🇹🇿 +255', region: 'África' },
    { value: '+256', label: '🇺🇬 +256', region: 'África' },
    { value: '+257', label: '🇧🇮 +257', region: 'África' },
    { value: '+258', label: '🇲🇿 +258', region: 'África' },
    { value: '+260', label: '🇿🇲 +260', region: 'África' },
    { value: '+261', label: '🇲🇬 +261', region: 'África' },
    { value: '+262', label: '🇷🇪 +262', region: 'África' },
    { value: '+263', label: '🇿🇼 +263', region: 'África' },
    { value: '+264', label: '🇳🇦 +264', region: 'África' },
    { value: '+265', label: '🇲🇼 +265', region: 'África' },
    { value: '+266', label: '🇱🇸 +266', region: 'África' },
    { value: '+267', label: '🇧🇼 +267', region: 'África' },
    { value: '+268', label: '🇸🇿 +268', region: 'África' },
    { value: '+269', label: '🇰🇲 +269', region: 'África' },
    
    // Oceanía
    { value: '+61', label: '🇦🇺 +61', region: 'Oceanía' },
    { value: '+64', label: '🇳🇿 +64', region: 'Oceanía' },
    { value: '+675', label: '🇵🇬 +675', region: 'Oceanía' },
    { value: '+676', label: '🇹🇴 +676', region: 'Oceanía' },
    { value: '+677', label: '🇸🇧 +677', region: 'Oceanía' },
    { value: '+678', label: '🇻🇺 +678', region: 'Oceanía' },
    { value: '+679', label: '🇫🇯 +679', region: 'Oceanía' },
    { value: '+680', label: '🇵🇼 +680', region: 'Oceanía' },
    { value: '+681', label: '🇼🇫 +681', region: 'Oceanía' },
    { value: '+682', label: '🇨🇰 +682', region: 'Oceanía' },
    { value: '+683', label: '🇳🇺 +683', region: 'Oceanía' },
    { value: '+685', label: '🇼🇸 +685', region: 'Oceanía' },
    { value: '+686', label: '🇰🇮 +686', region: 'Oceanía' },
    { value: '+687', label: '🇳🇨 +687', region: 'Oceanía' },
    { value: '+688', label: '🇹🇻 +688', region: 'Oceanía' },
    { value: '+689', label: '🇵🇫 +689', region: 'Oceanía' },
    { value: '+690', label: '🇹🇰 +690', region: 'Oceanía' },
    { value: '+691', label: '🇫🇲 +691', region: 'Oceanía' },
    { value: '+692', label: '🇲🇭 +692', region: 'Oceanía' },
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
    if (formData?.portfolio && !/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(formData.portfolio)) {
      newErrors.portfolio = 'El portafolio debe ser una URL válida';
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
        portfolio: formData.portfolio,
        stack: formData.stack,
        teams: formData.teams,
        profilePhoto: profilePhotoUrl,
        coverPhoto: coverPhotoUrl,
        status: formData.status || 'Disponible',
      });

      if (onShowSuccessAlert) onShowSuccessAlert('Perfil actualizado exitosamente');
      setIsEditing(false);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Limpiar caché al guardar
      setTimeout(onClose, 1000);
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
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    onClose();
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
                    onKeyDown={(e) => handleInputKeyDown(e, 'description')}
                  />
                  {errors.description && <p className={styles.errorText}>{errors.description}</p>}
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
                    onKeyDown={(e) => handleInputKeyDown(e, 'birthDate')}
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
                  <input
                    type="text"
                    name="portfolio"
                    value={formData.portfolio}
                    onChange={handleInputChange}
                    placeholder="https://miportafolio.com"
                    className={styles.input}
                    disabled={!isOwnProfile || !isEditing}
                    onKeyDown={(e) => handleInputKeyDown(e, 'portfolio')}
                  />
                  {errors.portfolio && <p className={styles.errorText}>{errors.portfolio}</p>}
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

          <motion.section 
            className={styles.section} 
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className={styles.sectionTitle}>Equipos</h2>
            <motion.div 
              className={styles.sectionContent}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
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
              
              <AnimatePresence mode="wait">
                {formData.teams && formData.teams.length > 0 ? (
                  formData.teams.map((team) => (
                    <motion.div 
                      key={team} 
                      className={styles.teamTableContainer}
                      variants={tableVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <div className={styles.teamHeader}>
                        <h3 className={styles.teamHeading}>{team}</h3>
                        <div className={styles.teamMemberCount}>
                          {teamMembers[team]?.length || 0} miembro{(teamMembers[team]?.length || 0) !== 1 ? 's' : ''}
                        </div>
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
                        Miembros del equipo {team}
                      </p>
                      {teamMembers[team] && teamMembers[team].length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.4 }}
                        >
                          <Table
                            data={teamMembers[team]}
                            columns={teamTableColumns}
                            itemsPerPage={5}
                          />
                        </motion.div>
                      ) : (
                        <motion.div 
                          className={styles.noTeamMembers}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          No hay miembros en este equipo
                        </motion.div>
                      )}
                    </motion.div>
                  ))
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
        </div>
      </div>
    </>
  );
};

export default ConfigPage;