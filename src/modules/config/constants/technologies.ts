/**
 * @module config/constants/technologies
 * @description Lista completa de tecnologías disponibles para el stack tecnológico
 */

/**
 * Lista completa de tecnologías organizadas por categorías
 * Total: 300+ tecnologías con niveles de experiencia
 */
export const TECHNOLOGIES = [
  // Básicas
  'React', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'SQL', 'MongoDB', 'PostgreSQL',
  'Figma (Básico)', 'Figma (Intermedio)', 'Figma (Avanzado)', 
  'Adobe XD (Básico)', 'Adobe XD (Intermedio)', 'Adobe XD (Avanzado)', 
  'Sketch (Básico)', 'Sketch (Intermedio)', 'Sketch (Avanzado)', 
  'Docker', 'Kubernetes', 'AWS', 'Pandas', 'NumPy',
  'TensorFlow', 
  'Blender (Básico)', 'Blender (Intermedio)', 'Blender (Avanzado)', 
  'Adobe Photoshop (Básico)', 'Adobe Photoshop (Intermedio)', 'Adobe Photoshop (Avanzado)', 
  'No-Code Builders', 'Next.js',
  
  // Análisis de Datos
  'Airflow', 'Alteryx', 'Apache Spark', 'Dask', 'Databricks', 'DataGrip', 'Domo', 'Google BigQuery',
  'Hadoop', 'Jupyter', 'Kafka', 'Knime', 'Looker', 'Matplotlib', 'Metabase', 'Microsoft Power BI',
  'Mode Analytics', 'Plotly', 'QlikView', 'R', 'RapidMiner', 'Redash', 'Scikit-learn', 'Seaborn',
  'Snowflake', 'Splunk', 'Tableau', 'Talend', 'ThoughtSpot', 'Yellowbrick',
  
  // Arquitectura
  'Archicad (Básico)', 'Archicad (Intermedio)', 'Archicad (Avanzado)', 
  'AutoCAD (Básico)', 'AutoCAD (Intermedio)', 'AutoCAD (Avanzado)', 
  'BIM 360 (Básico)', 'BIM 360 (Intermedio)', 'BIM 360 (Avanzado)', 
  'Bluebeam (Básico)', 'Bluebeam (Intermedio)', 'Bluebeam (Avanzado)', 
  'Catia (Básico)', 'Catia (Intermedio)', 'Catia (Avanzado)', 
  'Civil 3D (Básico)', 'Civil 3D (Intermedio)', 'Civil 3D (Avanzado)', 
  'Enscape (Básico)', 'Enscape (Intermedio)', 'Enscape (Avanzado)', 
  'ETABS (Básico)', 'ETABS (Intermedio)', 'ETABS (Avanzado)', 
  'Fusion 360 (Básico)', 'Fusion 360 (Intermedio)', 'Fusion 360 (Avanzado)',
  'Grasshopper (Básico)', 'Grasshopper (Intermedio)', 'Grasshopper (Avanzado)', 
  'InfraWorks (Básico)', 'InfraWorks (Intermedio)', 'InfraWorks (Avanzado)', 
  'Lumion (Básico)', 'Lumion (Intermedio)', 'Lumion (Avanzado)', 
  'MicroStation (Básico)', 'MicroStation (Intermedio)', 'MicroStation (Avanzado)', 
  'Navisworks (Básico)', 'Navisworks (Intermedio)', 'Navisworks (Avanzado)', 
  'Orca3D (Básico)', 'Orca3D (Intermedio)', 'Orca3D (Avanzado)', 
  'Primavera P6 (Básico)', 'Primavera P6 (Intermedio)', 'Primavera P6 (Avanzado)',
  'Revit (Básico)', 'Revit (Intermedio)', 'Revit (Avanzado)', 
  'Rhino (Básico)', 'Rhino (Intermedio)', 'Rhino (Avanzado)', 
  'Safe (Básico)', 'Safe (Intermedio)', 'Safe (Avanzado)', 
  'SAP2000 (Básico)', 'SAP2000 (Intermedio)', 'SAP2000 (Avanzado)', 
  'SketchUp (Básico)', 'SketchUp (Intermedio)', 'SketchUp (Avanzado)', 
  'SolidWorks (Básico)', 'SolidWorks (Intermedio)', 'SolidWorks (Avanzado)', 
  'STAAD.Pro (Básico)', 'STAAD.Pro (Intermedio)', 'STAAD.Pro (Avanzado)', 
  'Tekla Structures (Básico)', 'Tekla Structures (Intermedio)', 'Tekla Structures (Avanzado)',
  'Trello', 
  'Trimble Connect (Básico)', 'Trimble Connect (Intermedio)', 'Trimble Connect (Avanzado)', 
  'Twinmotion (Básico)', 'Twinmotion (Intermedio)', 'Twinmotion (Avanzado)', 
  'Vectorworks (Básico)', 'Vectorworks (Intermedio)', 'Vectorworks (Avanzado)', 
  'V-Ray (Básico)', 'V-Ray (Intermedio)', 'V-Ray (Avanzado)', 
  'ZWCAD (Básico)', 'ZWCAD (Intermedio)', 'ZWCAD (Avanzado)',
  
  // Arte
  '3ds Max (Básico)', '3ds Max (Intermedio)', '3ds Max (Avanzado)', 
  'Affinity Designer (Básico)', 'Affinity Designer (Intermedio)', 'Affinity Designer (Avanzado)', 
  'After Effects (Básico)', 'After Effects (Intermedio)', 'After Effects (Avanzado)', 
  'ArtRage (Básico)', 'ArtRage (Intermedio)', 'ArtRage (Avanzado)', 
  'Cinema 4D (Básico)', 'Cinema 4D (Intermedio)', 'Cinema 4D (Avanzado)', 
  'Clip Studio Paint (Básico)', 'Clip Studio Paint (Intermedio)', 'Clip Studio Paint (Avanzado)',
  'Corel Painter (Básico)', 'Corel Painter (Intermedio)', 'Corel Painter (Avanzado)', 
  'Houdini (Básico)', 'Houdini (Intermedio)', 'Houdini (Avanzado)', 
  'Illustrator (Básico)', 'Illustrator (Intermedio)', 'Illustrator (Avanzado)', 
  'InDesign (Básico)', 'InDesign (Intermedio)', 'InDesign (Avanzado)', 
  'Krita (Básico)', 'Krita (Intermedio)', 'Krita (Avanzado)', 
  'Lightroom (Básico)', 'Lightroom (Intermedio)', 'Lightroom (Avanzado)', 
  'Mari (Básico)', 'Mari (Intermedio)', 'Mari (Avanzado)', 
  'Marvelous Designer (Básico)', 'Marvelous Designer (Intermedio)', 'Marvelous Designer (Avanzado)',
  'Maya (Básico)', 'Maya (Intermedio)', 'Maya (Avanzado)', 
  'Mudbox (Básico)', 'Mudbox (Intermedio)', 'Mudbox (Avanzado)', 
  'Nuke (Básico)', 'Nuke (Intermedio)', 'Nuke (Avanzado)', 
  'Premiere Pro (Básico)', 'Premiere Pro (Intermedio)', 'Premiere Pro (Avanzado)', 
  'Procreate (Básico)', 'Procreate (Intermedio)', 'Procreate (Avanzado)', 
  'Rebelle (Básico)', 'Rebelle (Intermedio)', 'Rebelle (Avanzado)', 
  'Sculptris (Básico)', 'Sculptris (Intermedio)', 'Sculptris (Avanzado)', 
  'Substance Painter (Básico)', 'Substance Painter (Intermedio)', 'Substance Painter (Avanzado)',
  'Toon Boom Harmony (Básico)', 'Toon Boom Harmony (Intermedio)', 'Toon Boom Harmony (Avanzado)', 
  'Unity', 'Unreal Engine', 
  'ZBrush (Básico)', 'ZBrush (Intermedio)', 'ZBrush (Avanzado)', 
  'Zoner Photo Studio (Básico)', 'Zoner Photo Studio (Intermedio)', 'Zoner Photo Studio (Avanzado)', 
  'ZWrap (Básico)', 'ZWrap (Intermedio)', 'ZWrap (Avanzado)',
  
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
  'Adobe Animate (Básico)', 'Adobe Animate (Intermedio)', 'Adobe Animate (Avanzado)', 
  'Affinity Photo (Básico)', 'Affinity Photo (Intermedio)', 'Affinity Photo (Avanzado)', 
  'Canva (Básico)', 'Canva (Intermedio)', 'Canva (Avanzado)', 
  'CorelDRAW (Básico)', 'CorelDRAW (Intermedio)', 'CorelDRAW (Avanzado)', 
  'Crello (Básico)', 'Crello (Intermedio)', 'Crello (Avanzado)', 
  'GIMP (Básico)', 'GIMP (Intermedio)', 'GIMP (Avanzado)', 
  'Gravit Designer (Básico)', 'Gravit Designer (Intermedio)', 'Gravit Designer (Avanzado)',
  'Inkscape (Básico)', 'Inkscape (Intermedio)', 'Inkscape (Avanzado)', 
  'Lunacy (Básico)', 'Lunacy (Intermedio)', 'Lunacy (Avanzado)', 
  'Photopea (Básico)', 'Photopea (Intermedio)', 'Photopea (Avanzado)', 
  'PicMonkey (Básico)', 'PicMonkey (Intermedio)', 'PicMonkey (Avanzado)', 
  'Pixelmator (Básico)', 'Pixelmator (Intermedio)', 'Pixelmator (Avanzado)', 
  'Snappa (Básico)', 'Snappa (Intermedio)', 'Snappa (Avanzado)', 
  'Spark (Básico)', 'Spark (Intermedio)', 'Spark (Avanzado)', 
  'Stencila (Básico)', 'Stencila (Intermedio)', 'Stencila (Avanzado)', 
  'Vectr (Básico)', 'Vectr (Intermedio)', 'Vectr (Avanzado)', 
  'Visme (Básico)', 'Visme (Intermedio)', 'Visme (Avanzado)', 
  'VistaCreate (Básico)', 'VistaCreate (Intermedio)', 'VistaCreate (Avanzado)', 
  'Xara Designer (Básico)', 'Xara Designer (Intermedio)', 'Xara Designer (Avanzado)', 
  'Zeplin (Básico)', 'Zeplin (Intermedio)', 'Zeplin (Avanzado)', 
  'Adobe Express (Básico)', 'Adobe Express (Intermedio)', 'Adobe Express (Avanzado)',
  'Easil (Básico)', 'Easil (Intermedio)', 'Easil (Avanzado)', 
  'DesignCap (Básico)', 'DesignCap (Intermedio)', 'DesignCap (Avanzado)', 
  'Genially (Básico)', 'Genially (Intermedio)', 'Genially (Avanzado)',
  
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
  
  // UX/UI
  'Abstract (Básico)', 'Abstract (Intermedio)', 'Abstract (Avanzado)', 
  'Axure (Básico)', 'Axure (Intermedio)', 'Axure (Avanzado)', 
  'Balsamiq (Básico)', 'Balsamiq (Intermedio)', 'Balsamiq (Avanzado)', 
  'Coolors (Básico)', 'Coolors (Intermedio)', 'Coolors (Avanzado)', 
  'Dribbble (Básico)', 'Dribbble (Intermedio)', 'Dribbble (Avanzado)', 
  'FigJam (Básico)', 'FigJam (Intermedio)', 'FigJam (Avanzado)', 
  'Flinto (Básico)', 'Flinto (Intermedio)', 'Flinto (Avanzado)',
  'Framer (Básico)', 'Framer (Intermedio)', 'Framer (Avanzado)', 
  'InVision (Básico)', 'InVision (Intermedio)', 'InVision (Avanzado)', 
  'Justinmind (Básico)', 'Justinmind (Intermedio)', 'Justinmind (Avanzado)', 
  'Lottie (Básico)', 'Lottie (Intermedio)', 'Lottie (Avanzado)', 
  'Maze (Básico)', 'Maze (Intermedio)', 'Maze (Avanzado)', 
  'Miro (Básico)', 'Miro (Intermedio)', 'Miro (Avanzado)', 
  'Mockflow (Básico)', 'Mockflow (Intermedio)', 'Mockflow (Avanzado)', 
  'Origami Studio (Básico)', 'Origami Studio (Intermedio)', 'Origami Studio (Avanzado)', 
  'Penpot (Básico)', 'Penpot (Intermedio)', 'Penpot (Avanzado)',
  'Proto.io (Básico)', 'Proto.io (Intermedio)', 'Proto.io (Avanzado)', 
  'Smaply (Básico)', 'Smaply (Intermedio)', 'Smaply (Avanzado)', 
  'Sympli (Básico)', 'Sympli (Intermedio)', 'Sympli (Avanzado)', 
  'UXPin (Básico)', 'UXPin (Intermedio)', 'UXPin (Avanzado)', 
  'UsabilityHub (Básico)', 'UsabilityHub (Intermedio)', 'UsabilityHub (Avanzado)', 
  'UserTesting (Básico)', 'UserTesting (Intermedio)', 'UserTesting (Avanzado)',
  'Whimsical (Básico)', 'Whimsical (Intermedio)', 'Whimsical (Avanzado)', 
  'Wireframe.cc (Básico)', 'Wireframe.cc (Intermedio)', 'Wireframe.cc (Avanzado)', 
  'ZeroHeight (Básico)', 'ZeroHeight (Intermedio)', 'ZeroHeight (Avanzado)'
].sort();

/**
 * Lista de tecnologías únicas (sin duplicados)
 */
export const UNIQUE_TECHNOLOGIES = [...new Set(TECHNOLOGIES)].sort();

/**
 * Máximo de tecnologías que un usuario puede seleccionar
 */
export const MAX_STACK_SIZE = 40;

/**
 * Categorías de tecnologías
 */
export const TECHNOLOGY_CATEGORIES = {
  'Análisis de Datos': ['Airflow', 'Alteryx', 'Apache Spark', 'Dask', 'Databricks', 'DataGrip', 'Domo', 'Google BigQuery'],
  'Arquitectura': ['Archicad', 'AutoCAD', 'BIM 360', 'Bluebeam', 'Revit', 'SketchUp'],
  'Arte': ['3ds Max', 'Blender', 'Cinema 4D', 'Maya', 'ZBrush', 'Substance Painter'],
  'Backend': ['Node.js', 'Django', 'Express.js', 'FastAPI', 'Flask', 'NestJS', 'Spring Boot'],
  'Cloud Computing': ['AWS', 'Google Cloud Platform', 'Microsoft Azure', 'Firebase', 'Vercel', 'Netlify'],
  'DevOps': ['Docker', 'Kubernetes', 'Jenkins', 'GitHub Actions', 'Terraform', 'Ansible'],
  'Diseño gráfico': ['Adobe Photoshop', 'Illustrator', 'Canva', 'GIMP', 'Figma'],
  'Frontend': ['React', 'Vue.js', 'Angular', 'Next.js', 'Tailwind CSS', 'TypeScript'],
  'Inteligencia Artificial': ['TensorFlow', 'PyTorch', 'OpenAI', 'Hugging Face', 'LangChain'],
  'No-Code Builders': ['Bubble', 'Webflow', 'Airtable', 'Notion', 'Zapier'],
  'Project Management': ['Jira', 'Asana', 'Trello', 'Monday.com', 'ClickUp'],
  'UX/UI': ['Figma', 'Adobe XD', 'Sketch', 'InVision', 'Framer', 'Miro']
} as const;
