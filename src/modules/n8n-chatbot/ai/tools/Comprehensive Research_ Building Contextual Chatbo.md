### 1.2 Three-Tier Architecture for Chatbot Integration

The chatbot integration problem maps directly to the traditional three-tier architecture of distributed systems:[^1]

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Web Chat UI   │  │  Mobile App UI  │  │   Voice Interface│  │
│  │   (Next.js)     │  │                 │  │   (Optional)    │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                 │
├────────────────────────────────┼─────────────────────────────────┤
│                    APPLICATION LAYER                             │
│                                │                                 │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │              CHATBOT CORE ENGINE                          │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐             │  │
│  │  │   NLU     │  │  Dialog   │  │  Action   │             │  │
│  │  │  Module   │  │  Manager  │  │  Handler  │             │  │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘             │  │
│  │        │              │              │                    │  │
│  │        └──────────────┼──────────────┘                    │  │
│  └───────────────────────┼───────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────┼───────────────────────────────────┐  │
│  │           INTEGRATION SERVICES                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │  │
│  │  │ OpenAI  │  │   n8n   │  │ Notion  │  │ File    │     │  │
│  │  │  API    │  │ Webhook │  │   API   │  │ Parser  │     │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     FIRESTORE                             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │  │
│  │  │  Tasks  │  │  Users  │  │  Chats  │  │ Drafts  │     │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  CACHING LAYER                            │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐    │  │
│  │  │   Redis Cache   │  │  Semantic Response Cache    │    │  │
│  │  └─────────────────┘  └─────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```


***

## Part 2: Modular Architecture Design

### 2.1 Microservices-Based Chatbot Architecture

A modular system improves the flexibility of intelligent conversational agents in managing conversations. The modularity grants concurrent and synergic use of different knowledge representation techniques, allowing the most adequate methodology for each conversation feature. Each module is automatically triggered through a component that selects in real-time the most adequate chatbot knowledge module to activate.[^2]

**Core Module Structure:**

```typescript
// modules/index.ts - Module Registry
export interface ChatbotModule {
  name: string;
  priority: number;
  canHandle: (intent: Intent, context: Context) => boolean;
  execute: (input: ModuleInput) => Promise<ModuleOutput>;
  dependencies?: string[];
}

export const moduleRegistry: Map<string, ChatbotModule> = new Map();

// Module Registration Pattern
export function registerModule(module: ChatbotModule): void {
  moduleRegistry.set(module.name, module);
  console.log(`Module registered: ${module.name}`);
}

// Module Resolution with Priority
export function resolveModule(
  intent: Intent, 
  context: Context
): ChatbotModule | null {
  const candidates = Array.from(moduleRegistry.values())
    .filter(m => m.canHandle(intent, context))
    .sort((a, b) => b.priority - a.priority);
  
  return candidates[^0] || null;
}
```


### 2.2 Separation of Concerns Architecture

The sidecar pattern helps foster collaboration in microservices by promoting a clean and modular separation of concerns. With dedicated sidecar services managing common concerns like logging, monitoring, or security, each microservice can concentrate on its core logic.[^3]

```typescript
// architecture/modules/taskModule.ts
import { ChatbotModule, ModuleInput, ModuleOutput } from '../types';
import { TaskService } from '../services/taskService';
import { IntentClassifier } from '../nlp/intentClassifier';

export const TaskModule: ChatbotModule = {
  name: 'task-management',
  priority: 100,
  dependencies: ['auth', 'context'],
  
  canHandle(intent, context) {
    const taskIntents = [
      'TASK_CREATE', 'TASK_QUERY', 'TASK_UPDATE', 
      'TASK_DELETE', 'TASK_LIST', 'TASK_STATUS'
    ];
    return taskIntents.includes(intent.type);
  },
  
  async execute(input: ModuleInput): Promise<ModuleOutput> {
    const { intent, entities, context, userId } = input;
    const taskService = new TaskService(userId);
    
    switch (intent.type) {
      case 'TASK_CREATE':
        return await this.handleCreateTask(taskService, entities, context);
      case 'TASK_QUERY':
        return await this.handleQueryTask(taskService, entities);
      case 'TASK_UPDATE':
        return await this.handleUpdateTask(taskService, entities);
      case 'TASK_LIST':
        return await this.handleListTasks(taskService, entities);
      default:
        return { success: false, message: 'Intent not handled by task module' };
    }
  },
  
  async handleCreateTask(service, entities, context) {
    // Draft creation logic
    const draft = {
      title: entities.taskTitle || 'Untitled Task',
      description: entities.taskDescription || '',
      priority: entities.priority || 'medium',
      dueDate: entities.dueDate || null,
      status: 'draft',
      createdAt: new Date(),
      createdBy: context.userId
    };
    
    const taskId = await service.createDraft(draft);
    return {
      success: true,
      action: 'TASK_DRAFT_CREATED',
      data: { taskId, draft },
      requiresConfirmation: true,
      message: `I've created a draft task "${draft.title}". Would you like to confirm or make changes?`
    };
  }
};
```


### 2.3 Module Communication Patterns

```typescript
// architecture/eventBus.ts
import { EventEmitter } from 'events';

export interface ModuleEvent {
  type: string;
  source: string;
  payload: any;
  timestamp: Date;
  correlationId: string;
}

class ModuleEventBus extends EventEmitter {
  private correlationMap: Map<string, any[]> = new Map();
  
  emitModuleEvent(event: ModuleEvent): void {
    this.emit(event.type, event);
    this.trackCorrelation(event);
  }
  
  private trackCorrelation(event: ModuleEvent): void {
    const existing = this.correlationMap.get(event.correlationId) || [];
    existing.push(event);
    this.correlationMap.set(event.correlationId, existing);
  }
  
  getEventChain(correlationId: string): ModuleEvent[] {
    return this.correlationMap.get(correlationId) || [];
  }
}

export const eventBus = new ModuleEventBus();

// Usage in modules
eventBus.on('TASK_CREATED', async (event: ModuleEvent) => {
  // Notify other modules
  if (event.payload.shouldCreateNotion) {
    eventBus.emitModuleEvent({
      type: 'NOTION_CREATE_REQUEST',
      source: 'task-module',
      payload: event.payload,
      timestamp: new Date(),
      correlationId: event.correlationId
    });
  }
});
```


***

## Part 3: Hierarchical State Machines for Dialog Management

### 3.1 Conversation State Machine Architecture

Hierarchical State Machines (HSMs) are a well-known model suited to describing reactive behaviours, which are very relevant for conversations. Each state covers an intent and contains a nested state machine to help manage tasks associated with the conversation intent. This enhanced conversation engine, together with techniques to spot implicit information from dialogues, allows chatbots to manage tangled conversation situations where most existing chatbot technologies fail.[^4]

```typescript
// stateMachine/conversationStateMachine.ts
export interface ConversationState {
  id: string;
  name: string;
  intent: string;
  parentState?: string;
  nestedStates?: Map<string, ConversationState>;
  transitions: StateTransition[];
  entryActions: Action[];
  exitActions: Action[];
  metadata: StateMetadata;
}

export interface StateTransition {
  trigger: string;
  condition?: (context: Context) => boolean;
  targetState: string;
  actions?: Action[];
}

export interface StateMetadata {
  requiredSlots: string[];
  filledSlots: string[];
  maxRetries: number;
  currentRetries: number;
  timeout: number;
}

// Hierarchical State Machine Implementation
export class HierarchicalStateMachine {
  private states: Map<string, ConversationState> = new Map();
  private currentState: ConversationState;
  private stateHistory: string[] = [];
  private context: ConversationContext;
  
  constructor(initialState: ConversationState, context: ConversationContext) {
    this.currentState = initialState;
    this.context = context;
    this.states.set(initialState.id, initialState);
  }
  
  addState(state: ConversationState): void {
    this.states.set(state.id, state);
    if (state.parentState) {
      const parent = this.states.get(state.parentState);
      if (parent) {
        parent.nestedStates = parent.nestedStates || new Map();
        parent.nestedStates.set(state.id, state);
      }
    }
  }
  
  async transition(trigger: string, payload?: any): Promise<TransitionResult> {
    const validTransitions = this.currentState.transitions.filter(t => {
      if (t.trigger !== trigger) return false;
      if (t.condition && !t.condition(this.context)) return false;
      return true;
    });
    
    if (validTransitions.length === 0) {
      // Check nested states for valid transitions
      if (this.currentState.nestedStates) {
        for (const [, nestedState] of this.currentState.nestedStates) {
          const nestedTransition = nestedState.transitions.find(t => 
            t.trigger === trigger && 
            (!t.condition || t.condition(this.context))
          );
          if (nestedTransition) {
            return await this.executeTransition(nestedTransition, payload);
          }
        }
      }
      return { success: false, reason: 'NO_VALID_TRANSITION' };
    }
    
    return await this.executeTransition(validTransitions[^0], payload);
  }
  
  private async executeTransition(
    transition: StateTransition, 
    payload?: any
  ): Promise<TransitionResult> {
    // Execute exit actions
    for (const action of this.currentState.exitActions) {
      await action.execute(this.context, payload);
    }
    
    // Execute transition actions
    if (transition.actions) {
      for (const action of transition.actions) {
        await action.execute(this.context, payload);
      }
    }
    
    // Update state
    this.stateHistory.push(this.currentState.id);
    const targetState = this.states.get(transition.targetState);
    
    if (!targetState) {
      return { success: false, reason: 'TARGET_STATE_NOT_FOUND' };
    }
    
    this.currentState = targetState;
    
    // Execute entry actions
    for (const action of this.currentState.entryActions) {
      await action.execute(this.context, payload);
    }
    
    return { 
      success: true, 
      newState: this.currentState.id,
      requiredSlots: this.currentState.metadata.requiredSlots
    };
  }
}
```


### 3.2 Dialog Act Patterns for Transition Generation

Dialog act patterns are used by the State Machine Generator to generate state transitions. Sequences of dialog acts can be inferred from conversations to guide automatic transition generation:[^4]

```typescript
// stateMachine/dialogActPatterns.ts
export enum DialogAct {
  C_REQUEST_INFO = 'chatbot-request-info',
  U_PROVIDES_INFO = 'user-provides-info',
  C_CONFIRM = 'chatbot-confirm',
  U_CONFIRM = 'user-confirm',
  U_DENY = 'user-deny',
  C_OFFER = 'chatbot-offer',
  U_ACCEPT = 'user-accept',
  U_REJECT = 'user-reject',
  C_INFORM = 'chatbot-inform',
  U_REQUEST = 'user-request',
  U_CLARIFY = 'user-clarify',
  C_CLARIFY_REQUEST = 'chatbot-clarify-request'
}

export interface DialogActPattern {
  sequence: DialogAct[];
  resultingTransition: string;
  confidence: number;
}

export const taskCreationPatterns: DialogActPattern[] = [
  {
    sequence: [DialogAct.U_REQUEST, DialogAct.C_REQUEST_INFO, DialogAct.U_PROVIDES_INFO],
    resultingTransition: 'SLOT_FILLED',
    confidence: 0.95
  },
  {
    sequence: [DialogAct.C_CONFIRM, DialogAct.U_CONFIRM],
    resultingTransition: 'ACTION_CONFIRMED',
    confidence: 0.99
  },
  {
    sequence: [DialogAct.C_CONFIRM, DialogAct.U_DENY],
    resultingTransition: 'ACTION_CANCELLED',
    confidence: 0.99
  },
  {
    sequence: [DialogAct.C_REQUEST_INFO, DialogAct.U_CLARIFY],
    resultingTransition: 'NEEDS_CLARIFICATION',
    confidence: 0.85
  }
];

// Pattern Matcher
export class DialogActPatternMatcher {
  private patterns: DialogActPattern[];
  private currentSequence: DialogAct[] = [];
  
  constructor(patterns: DialogActPattern[]) {
    this.patterns = patterns;
  }
  
  addAct(act: DialogAct): string | null {
    this.currentSequence.push(act);
    
    // Find matching pattern
    for (const pattern of this.patterns) {
      if (this.sequenceMatches(pattern.sequence)) {
        const transition = pattern.resultingTransition;
        this.currentSequence = []; // Reset after match
        return transition;
      }
    }
    
    // Trim sequence if too long
    if (this.currentSequence.length > 10) {
      this.currentSequence = this.currentSequence.slice(-5);
    }
    
    return null;
  }
  
  private sequenceMatches(patternSequence: DialogAct[]): boolean {
    if (this.currentSequence.length < patternSequence.length) return false;
    
    const recentSequence = this.currentSequence.slice(-patternSequence.length);
    return recentSequence.every((act, i) => act === patternSequence[i]);
  }
}
```


### 3.3 Intent-State Configuration for Task Manager

```typescript
// stateMachine/taskManagerStates.ts
export const taskManagerStateMachine = {
  states: {
    IDLE: {
      id: 'IDLE',
      name: 'Waiting for Input',
      intent: null,
      transitions: [
        { trigger: 'TASK_CREATE_INTENT', targetState: 'TASK_CREATION' },
        { trigger: 'TASK_QUERY_INTENT', targetState: 'TASK_QUERY' },
        { trigger: 'TASK_UPDATE_INTENT', targetState: 'TASK_UPDATE' },
        { trigger: 'NOTION_EXPORT_INTENT', targetState: 'NOTION_EXPORT' },
        { trigger: 'FILE_IMPORT_INTENT', targetState: 'FILE_IMPORT' },
        { trigger: 'HELP_INTENT', targetState: 'HELP' }
      ],
      entryActions: [],
      exitActions: [],
      metadata: { requiredSlots: [], filledSlots: [], maxRetries: 3, currentRetries: 0, timeout: 30000 }
    },
    
    TASK_CREATION: {
      id: 'TASK_CREATION',
      name: 'Creating Task',
      intent: 'TASK_CREATE',
      nestedStates: {
        COLLECT_TITLE: {
          id: 'COLLECT_TITLE',
          name: 'Collecting Task Title',
          transitions: [
            { trigger: 'TITLE_PROVIDED', targetState: 'COLLECT_DETAILS' },
            { trigger: 'CANCEL', targetState: 'IDLE' }
          ],
          metadata: { requiredSlots: ['title'], filledSlots: [] }
        },
        COLLECT_DETAILS: {
          id: 'COLLECT_DETAILS',
          name: 'Collecting Task Details',
          transitions: [
            { trigger: 'DETAILS_PROVIDED', targetState: 'CONFIRM_DRAFT' },
            { trigger: 'SKIP_DETAILS', targetState: 'CONFIRM_DRAFT' },
            { trigger: 'BACK', targetState: 'COLLECT_TITLE' }
          ],
          metadata: { requiredSlots: ['description', 'priority', 'dueDate'], filledSlots: ['title'] }
        },
        CONFIRM_DRAFT: {
          id: 'CONFIRM_DRAFT',
          name: 'Confirming Draft',
          transitions: [
            { trigger: 'CONFIRM', targetState: 'SAVE_TASK', actions: [{ type: 'SAVE_DRAFT' }] },
            { trigger: 'EDIT', targetState: 'COLLECT_DETAILS' },
            { trigger: 'CANCEL', targetState: 'IDLE' }
          ]
        },
        SAVE_TASK: {
          id: 'SAVE_TASK',
          name: 'Saving Task',
          transitions: [
            { trigger: 'SUCCESS', targetState: 'IDLE' },
            { trigger: 'ERROR', targetState: 'ERROR_HANDLING' }
          ]
        }
      },
      transitions: [
        { trigger: 'CANCEL', targetState: 'IDLE' },
        { trigger: 'TIMEOUT', targetState: 'IDLE' }
      ]
    },
    
    TASK_QUERY: {
      id: 'TASK_QUERY',
      name: 'Querying Tasks',
      intent: 'TASK_QUERY',
      nestedStates: {
        PARSE_QUERY: {
          id: 'PARSE_QUERY',
          transitions: [
            { trigger: 'QUERY_CLEAR', targetState: 'EXECUTE_QUERY' },
            { trigger: 'QUERY_AMBIGUOUS', targetState: 'CLARIFY_QUERY' }
          ]
        },
        CLARIFY_QUERY: {
          id: 'CLARIFY_QUERY',
          transitions: [
            { trigger: 'CLARIFIED', targetState: 'EXECUTE_QUERY' },
            { trigger: 'CANCEL', targetState: 'IDLE' }
          ]
        },
        EXECUTE_QUERY: {
          id: 'EXECUTE_QUERY',
          transitions: [
            { trigger: 'RESULTS_FOUND', targetState: 'DISPLAY_RESULTS' },
            { trigger: 'NO_RESULTS', targetState: 'NO_RESULTS' }
          ]
        },
        DISPLAY_RESULTS: {
          id: 'DISPLAY_RESULTS',
          transitions: [
            { trigger: 'FOLLOW_UP', targetState: 'PARSE_QUERY' },
            { trigger: 'DONE', targetState: 'IDLE' }
          ]
        }
      }
    },
    
    NOTION_EXPORT: {
      id: 'NOTION_EXPORT',
      name: 'Exporting to Notion',
      intent: 'NOTION_EXPORT',
      nestedStates: {
        SELECT_TASKS: {
          id: 'SELECT_TASKS',
          transitions: [
            { trigger: 'TASKS_SELECTED', targetState: 'CONFIRM_EXPORT' },
            { trigger: 'NO_TASKS', targetState: 'IDLE' }
          ]
        },
        CONFIRM_EXPORT: {
          id: 'CONFIRM_EXPORT',
          transitions: [
            { trigger: 'CONFIRM', targetState: 'EXECUTE_EXPORT' },
            { trigger: 'CANCEL', targetState: 'IDLE' }
          ]
        },
        EXECUTE_EXPORT: {
          id: 'EXECUTE_EXPORT',
          transitions: [
            { trigger: 'SUCCESS', targetState: 'EXPORT_SUCCESS' },
            { trigger: 'ERROR', targetState: 'EXPORT_ERROR' }
          ]
        }
      }
    }
  }
};
```


***

## Part 4: OpenAI Function Calling Implementation

### 4.1 Function Definition Best Practices

Function calling provides a powerful and flexible way for OpenAI models to interface with external systems and access data outside their training data. When defining functions, clearly describe the purpose and expected behavior of each function and each parameter, and what the output represents.[^5]

**Best Practice Guidelines:**

1. **Write clear and detailed function names and descriptions** - Tell the model exactly what to do[^5]
2. **Use enums and object structure** to make invalid states unrepresentable[^5]
3. **Don't make the model fill arguments you already know** - Pass known values via code[^5]
4. **Aim for fewer than 20 functions** at any one time for higher accuracy[^5]
5. **Enable strict mode** to ensure function calls reliably adhere to the schema[^5]

### 4.2 Task Manager Function Definitions

```typescript
// functions/taskFunctions.ts
export const taskManagerTools = [
  {
    type: "function",
    name: "query_tasks",
    description: "Query and filter tasks from the user's task list. Use this to find tasks by status, priority, date range, assignee, or keywords. Returns a list of matching tasks with their details.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "draft", "archived"],
          description: "Filter tasks by their current status"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Filter tasks by priority level"
        },
        dateRange: {
          type: "object",
          properties: {
            start: { type: "string", description: "Start date in ISO format" },
            end: { type: "string", description: "End date in ISO format" }
          },
          description: "Filter tasks by due date range"
        },
        searchQuery: {
          type: "string",
          description: "Free-text search in task titles and descriptions"
        },
        limit: {
          type: "integer",
          description: "Maximum number of tasks to return (default: 10)"
        },
        sortBy: {
          type: "string",
          enum: ["dueDate", "priority", "createdAt", "title"],
          description: "Field to sort results by"
        }
      },
      required: [],
      additionalProperties: false
    },
    strict: true
  },
  
  {
    type: "function",
    name: "create_task_draft",
    description: "Create a new task as a draft. The task will not be saved permanently until the user confirms. Use this when the user wants to create a new task.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title/name of the task"
        },
        description: {
          type: ["string", "null"],
          description: "Detailed description of the task"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Task priority level"
        },
        dueDate: {
          type: ["string", "null"],
          description: "Due date in ISO format"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags/labels for the task"
        },
        assignee: {
          type: ["string", "null"],
          description: "User ID of the person assigned to the task"
        }
      },
      required: ["title", "priority"],
      additionalProperties: false
    },
    strict: true
  },
  
  {
    type: "function",
    name: "update_task",
    description: "Update an existing task's properties. Creates a draft update that requires user confirmation.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task to update"
        },
        updates: {
          type: "object",
          properties: {
            title: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            status: { 
              type: ["string", "null"],
              enum: ["pending", "in_progress", "completed", "archived", null]
            },
            priority: { 
              type: ["string", "null"],
              enum: ["low", "medium", "high", "urgent", null]
            },
            dueDate: { type: ["string", "null"] }
          },
          additionalProperties: false
        }
      },
      required: ["taskId", "updates"],
      additionalProperties: false
    },
    strict: true
  },
  
  {
    type: "function",
    name: "export_to_notion",
    description: "Export one or more tasks to Notion. This triggers an n8n workflow to create Notion pages from the selected tasks.",
    parameters: {
      type: "object",
      properties: {
        taskIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of task IDs to export"
        },
        notionDatabaseId: {
          type: ["string", "null"],
          description: "Target Notion database ID. If not provided, uses user's default."
        },
        includeSubtasks: {
          type: "boolean",
          description: "Whether to include subtasks in the export"
        }
      },
      required: ["taskIds"],
      additionalProperties: false
    },
    strict: true
  },
  
  {
    type: "function",
    name: "import_tasks_from_file",
    description: "Parse an uploaded file and create task drafts from its content. Supports CSV, JSON, and plain text files.",
    parameters: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "The ID of the uploaded file to process"
        },
        parseMode: {
          type: "string",
          enum: ["auto", "csv", "json", "text_lines", "markdown"],
          description: "How to parse the file content"
        },
        defaultPriority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Default priority for imported tasks"
        }
      },
      required: ["fileId"],
      additionalProperties: false
    },
    strict: true
  },
  
  {
    type: "function",
    name: "get_task_summary",
    description: "Get a natural language summary of the user's tasks, including counts by status, upcoming due dates, and overdue items.",
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["today", "this_week", "this_month", "all"],
          description: "Timeframe for the summary"
        },
        includeCompleted: {
          type: "boolean",
          description: "Whether to include completed tasks in the summary"
        }
      },
      required: ["timeframe"],
      additionalProperties: false
    },
    strict: true
  },
  
  {
    type: "function",
    name: "confirm_action",
    description: "Confirm or reject a pending action (draft creation, update, or export). Always call this before executing irreversible operations.",
    parameters: {
      type: "object",
      properties: {
        actionId: {
          type: "string",
          description: "The ID of the pending action to confirm"
        },
        confirmed: {
          type: "boolean",
          description: "Whether to confirm (true) or cancel (false) the action"
        },
        modifications: {
          type: ["object", "null"],
          description: "Optional modifications to apply before confirming"
        }
      },
      required: ["actionId", "confirmed"],
      additionalProperties: false
    },
    strict: true
  }
];
```


### 4.3 Function Handler Implementation

```typescript
// handlers/functionHandler.ts
import { db } from '../lib/firebase';
import { triggerN8nWorkflow } from '../lib/n8n';

export interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresConfirmation?: boolean;
  pendingActionId?: string;
  naturalLanguageResponse?: string;
}

export class FunctionHandler {
  private userId: string;
  private pendingActions: Map<string, PendingAction> = new Map();
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  async handleFunctionCall(
    name: string, 
    args: Record<string, any>
  ): Promise<FunctionCallResult> {
    // Validate and log
    console.log(`Handling function: ${name}`, args);
    
    switch (name) {
      case 'query_tasks':
        return await this.handleQueryTasks(args);
      case 'create_task_draft':
        return await this.handleCreateTaskDraft(args);
      case 'update_task':
        return await this.handleUpdateTask(args);
      case 'export_to_notion':
        return await this.handleExportToNotion(args);
      case 'import_tasks_from_file':
        return await this.handleImportFromFile(args);
      case 'get_task_summary':
        return await this.handleGetSummary(args);
      case 'confirm_action':
        return await this.handleConfirmAction(args);
      default:
        return { success: false, error: `Unknown function: ${name}` };
    }
  }
  
  private async handleQueryTasks(args: QueryTasksArgs): Promise<FunctionCallResult> {
    let query = db.collection('tasks')
      .where('userId', '==', this.userId);
    
    // Apply filters
    if (args.status) {
      query = query.where('status', '==', args.status);
    }
    if (args.priority) {
      query = query.where('priority', '==', args.priority);
    }
    if (args.dateRange?.start) {
      query = query.where('dueDate', '>=', new Date(args.dateRange.start));
    }
    if (args.dateRange?.end) {
      query = query.where('dueDate', '<=', new Date(args.dateRange.end));
    }
    
    // Apply sorting
    if (args.sortBy) {
      query = query.orderBy(args.sortBy, 'desc');
    }
    
    // Apply limit
    query = query.limit(args.limit || 10);
    
    const snapshot = await query.get();
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Generate natural language response
    const nlResponse = this.generateQueryResponse(tasks, args);
    
    return {
      success: true,
      data: { tasks, count: tasks.length },
      naturalLanguageResponse: nlResponse
    };
  }
  
  private async handleCreateTaskDraft(args: CreateTaskArgs): Promise<FunctionCallResult> {
    const draftId = `draft_${Date.now()}`;
    const draft = {
      ...args,
      id: draftId,
      status: 'draft',
      userId: this.userId,
      createdAt: new Date(),
      isDraft: true
    };
    
    // Store in pending actions (not committed yet)
    this.pendingActions.set(draftId, {
      type: 'CREATE_TASK',
      data: draft,
      createdAt: new Date()
    });
    
    // Also store in Firestore drafts collection for persistence
    await db.collection('drafts').doc(draftId).set(draft);
    
    return {
      success: true,
      data: draft,
      requiresConfirmation: true,
      pendingActionId: draftId,
      naturalLanguageResponse: `I've prepared a draft task titled "${args.title}" with ${args.priority} priority${args.dueDate ? `, due on ${new Date(args.dueDate).toLocaleDateString()}` : ''}. Would you like me to save it, or would you like to make any changes?`
    };
  }
  
  private async handleExportToNotion(args: ExportToNotionArgs): Promise<FunctionCallResult> {
    // Fetch tasks to be exported
    const tasks = await Promise.all(
      args.taskIds.map(async (id) => {
        const doc = await db.collection('tasks').doc(id).get();
        return doc.exists ? { id, ...doc.data() } : null;
      })
    );
    
    const validTasks = tasks.filter(t => t !== null);
    
    if (validTasks.length === 0) {
      return {
        success: false,
        error: 'No valid tasks found for export',
        naturalLanguageResponse: "I couldn't find any of the specified tasks. Please check the task IDs and try again."
      };
    }
    
    const actionId = `notion_${Date.now()}`;
    this.pendingActions.set(actionId, {
      type: 'NOTION_EXPORT',
      data: { tasks: validTasks, notionDatabaseId: args.notionDatabaseId },
      createdAt: new Date()
    });
    
    return {
      success: true,
      data: { tasksToExport: validTasks.length },
      requiresConfirmation: true,
      pendingActionId: actionId,
      naturalLanguageResponse: `I'm ready to export ${validTasks.length} task(s) to Notion. This will create new pages in your Notion database. Should I proceed?`
    };
  }
  
  private async handleConfirmAction(args: ConfirmActionArgs): Promise<FunctionCallResult> {
    const pendingAction = this.pendingActions.get(args.actionId);
    
    if (!pendingAction) {
      return {
        success: false,
        error: 'Pending action not found or expired',
        naturalLanguageResponse: "I couldn't find that pending action. It may have expired. Would you like to start over?"
      };
    }
    
    if (!args.confirmed) {
      this.pendingActions.delete(args.actionId);
      await db.collection('drafts').doc(args.actionId).delete();
      return {
        success: true,
        naturalLanguageResponse: "No problem, I've cancelled that action. Is there anything else I can help you with?"
      };
    }
    
    // Execute the confirmed action
    switch (pendingAction.type) {
      case 'CREATE_TASK':
        const taskData = { ...pendingAction.data, isDraft: false, status: 'pending' };
        await db.collection('tasks').doc(args.actionId).set(taskData);
        await db.collection('drafts').doc(args.actionId).delete();
        this.pendingActions.delete(args.actionId);
        return {
          success: true,
          data: taskData,
          naturalLanguageResponse: `Great! I've created your task "${taskData.title}". It's now in your task list.`
        };
        
      case 'NOTION_EXPORT':
        // Trigger n8n workflow
        const result = await triggerN8nWorkflow('notion-export', {
          tasks: pendingAction.data.tasks,
          notionDatabaseId: pendingAction.data.notionDatabaseId,
          userId: this.userId
        });
        this.pendingActions.delete(args.actionId);
        return {
          success: result.success,
          data: result,
          naturalLanguageResponse: result.success 
            ? `Done! I've exported ${pendingAction.data.tasks.length} task(s) to Notion.`
            : `There was an issue exporting to Notion: ${result.error}`
        };
        
      default:
        return { success: false, error: 'Unknown action type' };
    }
  }
  
  private generateQueryResponse(tasks: any[], args: QueryTasksArgs): string {
    if (tasks.length === 0) {
      return "I didn't find any tasks matching your criteria.";
    }
    
    const filterDescriptions = [];
    if (args.status) filterDescriptions.push(`with status "${args.status}"`);
    if (args.priority) filterDescriptions.push(`with ${args.priority} priority`);
    if (args.searchQuery) filterDescriptions.push(`matching "${args.searchQuery}"`);
    
    const filterText = filterDescriptions.length > 0 
      ? ` ${filterDescriptions.join(' and ')}` 
      : '';
    
    let response = `I found ${tasks.length} task${tasks.length !== 1 ? 's' : ''}${filterText}:\n\n`;
    
    tasks.forEach((task, i) => {
      response += `${i + 1}. **${task.title}** - ${task.status} (${task.priority} priority)`;
      if (task.dueDate) {
        response += ` - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
      }
      response += '\n';
    });
    
    return response;
  }
}
```


***

## Part 5: Context Management and Conversation History

### 5.1 Session-Based Context Architecture

Building a maintainable conversational state machine for chatbots involves structuring the conversation flow in a way that is modular, scalable, and easy to update. Start by mapping out all possible user intents and system responses, then identify the different states the conversation can be in.[^6]

```typescript
// context/conversationContext.ts
import { db } from '../lib/firebase';

export interface ConversationContext {
  sessionId: string;
  userId: string;
  currentIntent: string | null;
  pendingSlots: SlotValue[];
  filledSlots: Record<string, any>;
  conversationHistory: ConversationTurn[];
  userPreferences: UserPreferences;
  activeFilters: Record<string, any>;
  lastActivityTimestamp: Date;
  metadata: ContextMetadata;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  timestamp: Date;
  intent?: string;
  entities?: Record<string, any>;
  functionCall?: FunctionCallInfo;
  tokenCount?: number;
}

export interface ContextMetadata {
  totalTokensUsed: number;
  averageResponseTime: number;
  errorCount: number;
  lastError?: string;
}

export class ContextManager {
  private context: ConversationContext;
  private maxHistorySize: number = 20;
  private contextWindowTokens: number = 4000; // Reserve tokens for context
  
  constructor(sessionId: string, userId: string) {
    this.context = this.initializeContext(sessionId, userId);
  }
  
  private initializeContext(sessionId: string, userId: string): ConversationContext {
    return {
      sessionId,
      userId,
      currentIntent: null,
      pendingSlots: [],
      filledSlots: {},
      conversationHistory: [],
      userPreferences: {},
      activeFilters: {},
      lastActivityTimestamp: new Date(),
      metadata: {
        totalTokensUsed: 0,
        averageResponseTime: 0,
        errorCount: 0
      }
    };
  }
  
  async loadFromFirestore(): Promise<void> {
    const doc = await db.collection('conversations')
      .doc(this.context.sessionId)
      .get();
    
    if (doc.exists) {
      const data = doc.data();
      this.context = {
        ...this.context,
        ...data,
        conversationHistory: data?.conversationHistory || [],
        lastActivityTimestamp: data?.lastActivityTimestamp?.toDate() || new Date()
      };
    }
    
    // Load user preferences
    const userDoc = await db.collection('users')
      .doc(this.context.userId)
      .get();
    
    if (userDoc.exists) {
      this.context.userPreferences = userDoc.data()?.chatPreferences || {};
    }
  }
  
  async saveToFirestore(): Promise<void> {
    await db.collection('conversations')
      .doc(this.context.sessionId)
      .set({
        ...this.context,
        lastActivityTimestamp: new Date()
      }, { merge: true });
  }
  
  addTurn(turn: ConversationTurn): void {
    this.context.conversationHistory.push(turn);
    this.context.lastActivityTimestamp = new Date();
    
    // Trim history if exceeding limit
    if (this.context.conversationHistory.length > this.maxHistorySize) {
      this.summarizeOldHistory();
    }
    
    // Update token count
    if (turn.tokenCount) {
      this.context.metadata.totalTokensUsed += turn.tokenCount;
    }
  }
  
  private async summarizeOldHistory(): Promise<void> {
    const oldTurns = this.context.conversationHistory.slice(0, -10);
    const recentTurns = this.context.conversationHistory.slice(-10);
    
    // Generate summary of old turns
    const summary = await this.generateSummary(oldTurns);
    
    // Replace with summary + recent turns
    this.context.conversationHistory = [
      {
        role: 'system',
        content: `Previous conversation summary: ${summary}`,
        timestamp: new Date()
      },
      ...recentTurns
    ];
  }
  
  private async generateSummary(turns: ConversationTurn[]): Promise<string> {
    // Extract key information from old turns
    const intents = [...new Set(turns.filter(t => t.intent).map(t => t.intent))];
    const entities = turns
      .filter(t => t.entities)
      .reduce((acc, t) => ({ ...acc, ...t.entities }), {});
    
    return `User discussed: ${intents.join(', ')}. Key entities: ${JSON.stringify(entities)}`;
  }
  
  buildMessagesForAPI(): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];
    
    // System prompt with context
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt()
    });
    
    // Conversation history
    for (const turn of this.context.conversationHistory) {
      if (turn.role === 'function') {
        messages.push({
          role: 'function',
          name: turn.functionCall?.name,
          content: turn.content
        });
      } else {
        messages.push({
          role: turn.role as 'user' | 'assistant',
          content: turn.content
        });
      }
    }
    
    return messages;
  }
  
  private buildSystemPrompt(): string {
    const preferences = this.context.userPreferences;
    const activeFilters = this.context.activeFilters;
    
    return `You are a task management assistant. 
    
Current Context:
- User ID: ${this.context.userId}
- Session ID: ${this.context.sessionId}
- Active filters: ${JSON.stringify(activeFilters)}
- User preferences: ${JSON.stringify(preferences)}
- Current timestamp: ${new Date().toISOString()}

Guidelines:
- Always confirm before making permanent changes
- Create tasks as drafts first
- Provide natural language summaries of query results
- When exporting to Notion, confirm the number of tasks
- For ambiguous requests, ask for clarification`;
  }
  
  updateSlot(slotName: string, value: any): void {
    this.context.filledSlots[slotName] = value;
    this.context.pendingSlots = this.context.pendingSlots
      .filter(s => s.name !== slotName);
  }
  
  setCurrentIntent(intent: string, requiredSlots: string[]): void {
    this.context.currentIntent = intent;
    this.context.pendingSlots = requiredSlots.map(name => ({
      name,
      required: true,
      filled: false
    }));
    this.context.filledSlots = {};
  }
  
  getContext(): ConversationContext {
    return { ...this.context };
  }
}
```


***

## Part 6: Token Optimization and Response Caching

### 6.1 Prompt Caching Strategy

Prompt Caching automatically reduces latency and costs for longer prompts that have common prefixes. Structure prompts with static content at the beginning for maximum cache utilization. Caching can reduce latency by up to 80% and costs by up to 90%.[^7][^8]

```typescript
// optimization/promptCaching.ts
export interface CacheablePrompt {
  staticPrefix: string;
  dynamicSuffix: string;
  estimatedTokens: number;
}

export class PromptOptimizer {
  private static readonly CACHE_THRESHOLD = 1024; // Minimum tokens for caching
  
  static buildOptimizedPrompt(
    systemContext: SystemContext,
    conversationHistory: ConversationTurn[],
    userInput: string
  ): CacheablePrompt {
    // Static portion (cacheable) - should be >= 1024 tokens
    const staticPrefix = `
You are a task management assistant with the following capabilities:

## Core Functions
1. query_tasks - Search and filter user tasks
2. create_task_draft - Create new tasks as drafts requiring confirmation
3. update_task - Modify existing task properties
4. export_to_notion - Export tasks to Notion via n8n workflow
5. import_tasks_from_file - Parse files to create tasks
6. get_task_summary - Generate natural language task summaries
7. confirm_action - Confirm or cancel pending operations

## Behavior Guidelines
- Always create tasks as drafts first, requiring user confirmation
- Provide clear, concise natural language responses
- When querying tasks, summarize results in readable format
- Confirm destructive operations before executing
- Handle errors gracefully with helpful suggestions
- Support both English and Spanish user inputs
- Maintain context across conversation turns

## Response Format
- For task lists: Use numbered format with key details
- For confirmations: Clearly state what will happen
- For errors: Explain the issue and suggest alternatives
- Keep responses under 200 words unless detail is requested

## Entity Recognition
Recognize these entities in user inputs:
- Dates: relative (tomorrow, next week) and absolute (Dec 15)
- Priorities: urgent, high, medium, low
- Status: pending, in progress, done, archived
- Task references: by name, ID, or description
`;

    // Dynamic portion (changes per request)
    const dynamicSuffix = `
## Current Session Context
- User ID: ${systemContext.userId}
- Timestamp: ${systemContext.timestamp}
- Active Workspace: ${systemContext.workspaceId}
- User Language Preference: ${systemContext.language || 'en'}
- Pending Actions: ${JSON.stringify(systemContext.pendingActions || [])}

## Recent Conversation
${this.formatRecentHistory(conversationHistory)}

## Current User Input
${userInput}
`;

    return {
      staticPrefix,
      dynamicSuffix,
      estimatedTokens: this.estimateTokens(staticPrefix + dynamicSuffix)
    };
  }
  
  private static formatRecentHistory(history: ConversationTurn[]): string {
    // Only include last 5 turns for context
    const recent = history.slice(-5);
    return recent.map(turn => 
      `[${turn.role.toUpperCase()}]: ${turn.content.slice(0, 500)}`
    ).join('\n');
  }
  
  private static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
```


### 6.2 Response Caching System

Caching reuses context across sessions, cutting token consumption by avoiding redundant input tokens. Implement multi-layer caching for different query types:[^8]

```typescript
// optimization/responseCache.ts
import Redis from 'ioredis';
import { createHash } from 'crypto';

interface CachedResponse {
  response: string;
  data: any;
  cachedAt: Date;
  ttl: number;
  hitCount: number;
}

export class ResponseCacheManager {
  private redis: Redis;
  private localCache: Map<string, CachedResponse> = new Map();
  
  // TTL configurations by query type
  private readonly TTL_CONFIG = {
    TASK_SUMMARY: 300,        // 5 minutes
    TASK_LIST: 60,            // 1 minute  
    STATIC_INFO: 3600,        // 1 hour
    DEFAULT: 120              // 2 minutes
  };
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }
  
  private generateCacheKey(
    userId: string, 
    functionName: string, 
    args: Record<string, any>
  ): string {
    const normalized = JSON.stringify({ 
      userId, 
      functionName, 
      args: this.normalizeArgs(args) 
    });
    return `chat:response:${createHash('sha256').update(normalized).digest('hex').slice(0, 16)}`;
  }
  
  private normalizeArgs(args: Record<string, any>): Record<string, any> {
    // Sort keys and normalize values for consistent hashing
    const sorted: Record<string, any> = {};
    Object.keys(args).sort().forEach(key => {
      if (args[key] !== undefined && args[key] !== null) {
        sorted[key] = args[key];
      }
    });
    return sorted;
  }
  
  async get(
    userId: string, 
    functionName: string, 
    args: Record<string, any>
  ): Promise<CachedResponse | null> {
    const key = this.generateCacheKey(userId, functionName, args);
    
    // Check local cache first (L1)
    if (this.localCache.has(key)) {
      const cached = this.localCache.get(key)!;
      if (Date.now() - cached.cachedAt.getTime() < cached.ttl * 1000) {
        cached.hitCount++;
        return cached;
      }
      this.localCache.delete(key);
    }
    
    // Check Redis (L2)
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      const cached = JSON.parse(redisValue) as CachedResponse;
      cached.cachedAt = new Date(cached.cachedAt);
      
      // Populate L1 cache
      this.localCache.set(key, cached);
      
      // Update hit count
      cached.hitCount++;
      await this.redis.set(key, JSON.stringify(cached), 'EX', cached.ttl);
      
      return cached;
    }
    
    return null;
  }
  
  async set(
    userId: string,
    functionName: string,
    args: Record<string, any>,
    response: string,
    data: any
  ): Promise<void> {
    const key = this.generateCacheKey(userId, functionName, args);
    const ttl = this.getTTL(functionName);
    
    const cached: CachedResponse = {
      response,
      data,
      cachedAt: new Date(),
      ttl,
      hitCount: 0
    };
    
    // Store in both layers
    this.localCache.set(key, cached);
    await this.redis.set(key, JSON.stringify(cached), 'EX', ttl);
  }
  
  private getTTL(functionName: string): number {
    const ttlMap: Record<string, number> = {
      'get_task_summary': this.TTL_CONFIG.TASK_SUMMARY,
      'query_tasks': this.TTL_CONFIG.TASK_LIST,
      'help': this.TTL_CONFIG.STATIC_INFO
    };
    return ttlMap[functionName] || this.TTL_CONFIG.DEFAULT;
  }
  
  async invalidateUserCache(userId: string): Promise<void> {
    // Invalidate all cached responses for a user
    const pattern = `chat:response:*`;
    const keys = await this.redis.keys(pattern);
    
    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const cached = JSON.parse(value);
        if (cached.userId === userId) {
          await this.redis.del(key);
          this.localCache.delete(key);
        }
      }
    }
  }
}
```


***

## Part 7: Predefined Responses and Process Triggers

### 7.1 Structured Flow Triggers

To reduce AI dependency for common operations, implement pattern-based triggers that bypass the LLM entirely:[^9]

```typescript
// triggers/structuredTriggers.ts
export interface StructuredTrigger {
  patterns: RegExp[];
  keywords: string[];
  action: string;
  handler: (match: TriggerMatch, context: Context) => Promise<TriggerResult>;
  requiresAI: boolean;
}

export const structuredTriggers: StructuredTrigger[] = [
  {
    patterns: [
      /^(show|list|view)\s+(my\s+)?(all\s+)?tasks?$/i,
      /^(mis\s+)?tareas$/i,
      /^what('s| are)\s+my\s+tasks?$/i
    ],
    keywords: ['list tasks', 'show tasks', 'mis tareas', 'my tasks'],
    action: 'LIST_ALL_TASKS',
    handler: async (match, context) => {
      const tasks = await queryTasks(context.userId, { limit: 10 });
      return {
        handled: true,
        response: formatTaskList(tasks),
        data: tasks
      };
    },
    requiresAI: false
  },
  
  {
    patterns: [
      /^(show|list)\s+(my\s+)?(pending|incomplete)\s+tasks?$/i,
      /^tareas\s+pendientes$/i
    ],
    keywords: ['pending tasks', 'tareas pendientes'],
    action: 'LIST_PENDING_TASKS',
    handler: async (match, context) => {
      const tasks = await queryTasks(context.userId, { status: 'pending' });
      return {
        handled: true,
        response: formatTaskList(tasks, 'Here are your pending tasks:'),
        data: tasks
      };
    },
    requiresAI: false
  },
  
  {
    patterns: [
      /^(confirm|yes|sí|si|ok|proceed|dale)$/i,
      /^(do it|go ahead|execute)$/i
    ],
    keywords: ['confirm', 'yes', 'sí'],
    action: 'CONFIRM_PENDING',
    handler: async (match, context) => {
      if (!context.pendingAction) {
        return { handled: false }; // Fall back to AI
      }
      return await executePendingAction(context.pendingAction, context);
    },
    requiresAI: false
  },
  
  {
    patterns: [
      /^(cancel|no|never\s*mind|cancelar)$/i,
      /^(don't|do not)\s+(do\s+)?(it|that)$/i
    ],
    keywords: ['cancel', 'no', 'cancelar'],
    action: 'CANCEL_PENDING',
    handler: async (match, context) => {
      if (!context.pendingAction) {
        return {
          handled: true,
          response: "There's nothing to cancel right now."
        };
      }
      await cancelPendingAction(context.pendingAction);
      return {
        handled: true,
        response: "Okay, I've cancelled that action."
      };
    },
    requiresAI: false
  },
  
  {
    patterns: [
      /^help$/i,
      /^(what\s+can\s+you\s+do|ayuda|comandos)$/i
    ],
    keywords: ['help', 'ayuda'],
    action: 'SHOW_HELP',
    handler: async () => ({
      handled: true,
      response: HELP_MESSAGE
    }),
    requiresAI: false
  },
  
  {
    patterns: [
      /^(today|hoy)$/i,
      /^(tasks?\s+)?(for\s+)?today$/i,
      /^tareas?\s+(de\s+)?hoy$/i
    ],
    keywords: ['today', 'hoy'],
    action: 'TASKS_TODAY',
    handler: async (match, context) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const tasks = await queryTasks(context.userId, {
        dateRange: { start: today.toISOString(), end: tomorrow.toISOString() }
      });
      
      return {
        handled: true,
        response: tasks.length > 0 
          ? formatTaskList(tasks, "Here's what you have for today:")
          : "You don't have any tasks due today. Would you like to create one?",
        data: tasks
      };
    },
    requiresAI: false
  }
];

// Trigger Matcher
export class TriggerMatcher {
  private triggers: StructuredTrigger[];
  
  constructor(triggers: StructuredTrigger[]) {
    this.triggers = triggers;
  }
  
  match(input: string): { trigger: StructuredTrigger; match: TriggerMatch } | null {
    const normalizedInput = input.trim().toLowerCase();
    
    for (const trigger of this.triggers) {
      // Check patterns
      for (const pattern of trigger.patterns) {
        const match = normalizedInput.match(pattern);
        if (match) {
          return { trigger, match: { pattern, groups: match.groups, input } };
        }
      }
      
      // Check exact keyword matches
      if (trigger.keywords.includes(normalizedInput)) {
        return { trigger, match: { keyword: normalizedInput, input } };
      }
    }
    
    return null;
  }
}

const HELP_MESSAGE = `
**Here's what I can help you with:**

📋 **Task Management**
- "Show my tasks" - List all your tasks
- "Create a task called [name]" - Create a new task
- "Mark [task] as done" - Complete a task

🔍 **Queries**
- "Show pending tasks" - List incomplete tasks
- "Tasks due today" - Today's deadlines
- "High priority tasks" - Filter by priority

📤 **Integrations**
- "Export [task] to Notion" - Create Notion page
- "Import tasks from file" - Create tasks from uploaded files

💡 **Tips**
- I'll always show drafts before making changes
- Say "confirm" or "cancel" after reviewing drafts
- You can ask in English or Spanish
`;
```


### 7.2 Fallback Logic Design

When a chatbot faces misinterpretation or user input that falls outside its scope, fallback logic ensures the conversation can continue. Effective fallback responses acknowledge misunderstanding and offer alternatives:[^9]

```typescript
// fallback/fallbackHandler.ts
export interface FallbackStrategy {
  priority: number;
  condition: (context: FallbackContext) => boolean;
  response: (context: FallbackContext) => FallbackResponse;
}

export const fallbackStrategies: FallbackStrategy[] = [
  {
    priority: 1,
    condition: (ctx) => ctx.consecutiveFailures >= 3,
    response: () => ({
      message: "I'm having trouble understanding. Would you like to speak with a human or try a different approach?",
      options: [
        { label: "Show me what you can do", action: "SHOW_HELP" },
        { label: "Start over", action: "RESET_CONTEXT" },
        { label: "Contact support", action: "ESCALATE" }
      ],
      escalate: true
    })
  },
  
  {
    priority: 2,
    condition: (ctx) => ctx.lastIntent === 'TASK_CREATE' && !ctx.hasRequiredSlots,
    response: (ctx) => ({
      message: `I need a bit more information to create that task. What would you like to call it?`,
      promptSlot: 'title',
      options: [
        { label: "Cancel", action: "CANCEL" }
      ]
    })
  },
  
  {
    priority: 3,
    condition: (ctx) => ctx.partialMatch !== null,
    response: (ctx) => ({
      message: `Did you mean "${ctx.partialMatch?.suggestion}"?`,
      options: [
        { label: "Yes", action: ctx.partialMatch?.action },
        { label: "No, something else", action: "CLARIFY" }
      ]
    })
  },
  
  {
    priority: 4,
    condition: () => true, // Default fallback
    response: (ctx) => ({
      message: "I'm not sure I understood that. Here are some things you can try:",
      options: [
        { label: "Show my tasks", action: "LIST_TASKS" },
        { label: "Create a new task", action: "START_CREATE_TASK" },
        { label: "Get help", action: "SHOW_HELP" }
      ]
    })
  }
];

export class FallbackHandler {
  private strategies: FallbackStrategy[];
  
  constructor() {
    this.strategies = fallbackStrategies.sort((a, b) => a.priority - b.priority);
  }
  
  handleFallback(context: FallbackContext): FallbackResponse {
    for (const strategy of this.strategies) {
      if (strategy.condition(context)) {
        return strategy.response(context);
      }
    }
    
    // Should never reach here due to default fallback
    return {
      message: "I encountered an unexpected error. Please try again.",
      options: []
    };
  }
}
```


***

## Part 8: n8n Integration for External Tools

### 8.1 n8n Workflow Architecture

The AI Agent in n8n can be extended with tools that interact with other apps or services. Configure n8n as the external tool execution layer for operations like Notion integration:[^10]

```typescript
// integrations/n8nClient.ts
import axios from 'axios';

export interface N8nWorkflowConfig {
  webhookUrl: string;
  apiKey?: string;
  timeout: number;
}

export interface WorkflowPayload {
  action: string;
  userId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export class N8nClient {
  private config: N8nWorkflowConfig;
  
  constructor(config: N8nWorkflowConfig) {
    this.config = config;
  }
  
  async triggerWorkflow(
    workflowId: string, 
    payload: WorkflowPayload
  ): Promise<N8nResponse> {
    try {
      const response = await axios.post(
        `${this.config.webhookUrl}/${workflowId}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 
              'Authorization': `Bearer ${this.config.apiKey}` 
            })
          },
          timeout: this.config.timeout
        }
      );
      
      return {
        success: true,
        data: response.data,
        workflowExecutionId: response.headers['x-n8n-execution-id']
      };
    } catch (error) {
      console.error('n8n workflow error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Specific workflow triggers
  async exportToNotion(tasks: Task[], userId: string): Promise<N8nResponse> {
    return this.triggerWorkflow('notion-export', {
      action: 'CREATE_PAGES',
      userId,
      data: {
        tasks: tasks.map(t => ({
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          metadata: {
            sourceTaskId: t.id,
            exportedAt: new Date().toISOString()
          }
        }))
      }
    });
  }
  
  async syncFromNotion(
    notionDatabaseId: string, 
    userId: string
  ): Promise<N8nResponse> {
    return this.triggerWorkflow('notion-sync', {
      action: 'SYNC_DATABASE',
      userId,
      data: {
        databaseId: notionDatabaseId,
        syncMode: 'incremental'
      }
    });
  }
  
  async parseFile(
    fileUrl: string, 
    fileType: string, 
    userId: string
  ): Promise<N8nResponse> {
    return this.triggerWorkflow('file-parser', {
      action: 'PARSE_FILE',
      userId,
      data: {
        fileUrl,
        fileType,
        outputFormat: 'tasks'
      }
    });
  }
}

// Workflow definitions for n8n (JSON export)
export const n8nWorkflowDefinitions = {
  'notion-export': {
    name: 'Notion Task Export',
    nodes: [
      {
        type: 'n8n-nodes-base.webhook',
        name: 'Webhook Trigger',
        parameters: {
          path: 'notion-export',
          httpMethod: 'POST'
        }
      },
      {
        type: 'n8n-nodes-base.notion',
        name: 'Create Notion Pages',
        parameters: {
          operation: 'create',
          databaseId: '={{ $json.databaseId }}',
          properties: {
            Title: '={{ $json.task.title }}',
            Status: '={{ $json.task.status }}',
            Priority: '={{ $json.task.priority }}',
            'Due Date': '={{ $json.task.dueDate }}'
          }
        }
      },
      {
        type: 'n8n-nodes-base.respondToWebhook',
        name: 'Respond',
        parameters: {
          responseBody: '={{ JSON.stringify({ success: true, pageIds: $json.createdPageIds }) }}'
        }
      }
    ]
  }
};
```


***

## Part 9: UX Design Patterns for Chatbots

### 9.1 Conversation Flow Design

When designing chatbot conversation flows, start with mapping user intents and creating a decision tree structure. Key UX principles for task manager chatbots:[^11]

```typescript
// ux/conversationDesign.ts
export interface ConversationFlowStep {
  id: string;
  type: 'message' | 'prompt' | 'action' | 'branch';
  content?: string;
  options?: FlowOption[];
  validation?: ValidationRule;
  nextStep?: string;
  branches?: BranchCondition[];
}

export const taskCreationFlow: ConversationFlowStep[] = [
  {
    id: 'START',
    type: 'message',
    content: "Let's create a new task. What would you like to call it?",
    nextStep: 'GET_TITLE'
  },
  {
    id: 'GET_TITLE',
    type: 'prompt',
    validation: {
      minLength: 3,
      maxLength: 100,
      errorMessage: "The title should be between 3 and 100 characters."
    },
    nextStep: 'ASK_DETAILS'
  },
  {
    id: 'ASK_DETAILS',
    type: 'branch',
    content: "Great! Would you like to add more details?",
    options: [
      { label: "Add description", value: "description", nextStep: 'GET_DESCRIPTION' },
      { label: "Set due date", value: "dueDate", nextStep: 'GET_DUE_DATE' },
      { label: "Set priority", value: "priority", nextStep: 'GET_PRIORITY' },
      { label: "That's all", value: "done", nextStep: 'CONFIRM' }
    ]
  },
  {
    id: 'GET_PRIORITY',
    type: 'prompt',
    content: "What priority should this task have?",
    options: [
      { label: "🔴 Urgent", value: "urgent" },
      { label: "🟠 High", value: "high" },
      { label: "🟡 Medium", value: "medium" },
      { label: "🟢 Low", value: "low" }
    ],
    nextStep: 'ASK_MORE_DETAILS'
  },
  {
    id: 'CONFIRM',
    type: 'action',
    content: "Here's your task draft:\n\n**{title}**\n{description}\nPriority: {priority}\nDue: {dueDate}\n\nShould I save it?",
    options: [
      { label: "✅ Save", value: "confirm", nextStep: 'SAVE' },
      { label: "✏️ Edit", value: "edit", nextStep: 'ASK_DETAILS' },
      { label: "❌ Cancel", value: "cancel", nextStep: 'CANCELLED' }
    ]
  },
  {
    id: 'SAVE',
    type: 'action',
    nextStep: 'SUCCESS'
  },
  {
    id: 'SUCCESS',
    type: 'message',
    content: "✅ Task created successfully! Is there anything else you'd like to do?"
  }
];
```


### 9.2 Response Formatting and Quick Actions

The UX should include quick replies and suggested actions to guide users:[^12]

```typescript
// ux/responseFormatter.ts
export interface FormattedResponse {
  text: string;
  quickReplies?: QuickReply[];
  cards?: ResponseCard[];
  typing?: boolean;
  delay?: number;
}

export class ResponseFormatter {
  formatTaskList(tasks: Task[], intro?: string): FormattedResponse {
    if (tasks.length === 0) {
      return {
        text: "You don't have any tasks matching that criteria.",
        quickReplies: [
          { label: "Create a task", payload: "create task" },
          { label: "Show all tasks", payload: "all tasks" }
        ]
      };
    }
    
    let text = intro || `Here are your tasks (${tasks.length}):`;
    text += '\n\n';
    
    tasks.forEach((task, i) => {
      const priorityEmoji = this.getPriorityEmoji(task.priority);
      const statusEmoji = this.getStatusEmoji(task.status);
      text += `${i + 1}. ${priorityEmoji} **${task.title}** ${statusEmoji}\n`;
      if (task.dueDate) {
        text += `   📅 Due: ${this.formatDate(task.dueDate)}\n`;
      }
    });
    
    return {
      text,
      quickReplies: [
        { label: "Create new task", payload: "create task" },
        { label: "Filter by priority", payload: "filter priority" },
        { label: "Export to Notion", payload: "export notion" }
      ]
    };
  }
  
  formatDraftConfirmation(draft: TaskDraft): FormattedResponse {
    const card: ResponseCard = {
      title: draft.title,
      subtitle: draft.description || 'No description',
      fields: [
        { label: 'Priority', value: draft.priority },
        { label: 'Due Date', value: draft.dueDate ? this.formatDate(draft.dueDate) : 'Not set' },
        { label: 'Status', value: 'Draft (not saved)' }
      ],
      actions: [
        { label: '✅ Confirm', action: 'confirm', primary: true },
        { label: '✏️ Edit', action: 'edit' },
        { label: '❌ Cancel', action: 'cancel', destructive: true }
      ]
    };
    
    return {
      text: "Here's your task draft. Please review and confirm:",
      cards: [card],
      quickReplies: [
        { label: "Confirm", payload: "confirm" },
        { label: "Edit title", payload: "edit title" },
        { label: "Cancel", payload: "cancel" }
      ]
    };
  }
  
  private getPriorityEmoji(priority: string): string {
    const emojis: Record<string, string> = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return emojis[priority] || '⚪';
  }
  
  private getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      archived: '📦'
    };
    return emojis[status] || '';
  }
  
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
```


***

## Part 10: Complete Integration Example

### 10.1 Main Chat Handler

```typescript
// api/chat/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ContextManager } from '@/lib/context/conversationContext';
import { FunctionHandler } from '@/lib/handlers/functionHandler';
import { TriggerMatcher, structuredTriggers } from '@/lib/triggers/structuredTriggers';
import { ResponseCacheManager } from '@/lib/optimization/responseCache';
import { PromptOptimizer } from '@/lib/optimization/promptCaching';
import { ResponseFormatter } from '@/lib/ux/responseFormatter';
import { taskManagerTools } from '@/lib/functions/taskFunctions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new ResponseCacheManager(process.env.REDIS_URL!);
const triggerMatcher = new TriggerMatcher(structuredTriggers);
const formatter = new ResponseFormatter();

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, userId } = await req.json();
    
    // Initialize context
    const contextManager = new ContextManager(sessionId, userId);
    await contextManager.loadFromFirestore();
    
    // Check for structured triggers first (bypass AI)
    const triggerMatch = triggerMatcher.match(message);
    if (triggerMatch && !triggerMatch.trigger.requiresAI) {
      const result = await triggerMatch.trigger.handler(
        triggerMatch.match,
        contextManager.getContext()
      );
      
      if (result.handled) {
        contextManager.addTurn({
          role: 'user',
          content: message,
          timestamp: new Date()
        });
        contextManager.addTurn({
          role: 'assistant',
          content: result.response,
          timestamp: new Date()
        });
        await contextManager.saveToFirestore();
        
        return NextResponse.json({
          response: result.response,
          data: result.data,
          fromCache: false,
          aiUsed: false
        });
      }
    }
    
    // Check response cache
    const functionHandler = new FunctionHandler(userId);
    
    // Build optimized prompt
    const optimizedPrompt = PromptOptimizer.buildOptimizedPrompt(
      {
        userId,
        timestamp: new Date().toISOString(),
        workspaceId: 'default',
        pendingActions: []
      },
      contextManager.getContext().conversationHistory,
      message
    );
    
    // Add user message to context
    contextManager.addTurn({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: optimizedPrompt.staticPrefix + optimizedPrompt.dynamicSuffix
        },
        ...contextManager.buildMessagesForAPI().slice(1) // Skip system message
      ],
      tools: taskManagerTools.map(t => ({ type: 'function', function: t })),
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000
    });
    
    const assistantMessage = response.choices[^0].message;
    let finalResponse = assistantMessage.content || '';
    let functionData = null;
    
    // Handle function calls
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await functionHandler.handleFunctionCall(
          toolCall.function.name,
          args
        );
        
        if (result.naturalLanguageResponse) {
          finalResponse = result.naturalLanguageResponse;
        }
        functionData = result.data;
        
        // Add function call to context
        contextManager.addTurn({
          role: 'function',
          content: JSON.stringify(result),
          timestamp: new Date(),
          functionCall: {
            name: toolCall.function.name,
            arguments: args,
            result: result
          }
        });
      }
    }
    
    // Add assistant response to context
    contextManager.addTurn({
      role: 'assistant',
      content: finalResponse,
      timestamp: new Date(),
      tokenCount: response.usage?.total_tokens
    });
    
    // Save context
    await contextManager.saveToFirestore();
    
    // Format response
    const formattedResponse = functionData?.tasks 
      ? formatter.formatTaskList(functionData.tasks)
      : { text: finalResponse };
    
    return NextResponse.json({
      response: formattedResponse.text,
      quickReplies: formattedResponse.quickReplies,
      cards: formattedResponse.cards,
      data: functionData,
      tokensUsed: response.usage?.total_tokens,
      aiUsed: true
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
```


### 10.2 Firestore Schema Definition

```typescript
// lib/firebase/schema.ts
// Firestore Collection Schemas

/*
Collection: users
Document ID: userId
*/
interface UserDocument {
  email: string;
  displayName: string;
  createdAt: Timestamp;
  chatPreferences: {
    language: 'en' | 'es';
    defaultPriority: 'low' | 'medium' | 'high';
    notionDatabaseId?: string;
    timezone: string;
  };
  integrations: {
    notion?: {
      accessToken: string;
      workspaceId: string;
      connectedAt: Timestamp;
    };
  };
}

/*
Collection: tasks
Document ID: auto-generated
*/
interface TaskDocument {
  userId: string;
  title: string;
  description?: string;
  status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Timestamp;
  tags: string[];
  assignee?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  notionPageId?: string;
  metadata: {
    source: 'manual' | 'import' | 'notion_sync';
    importedFrom?: string;
  };
}

/*
Collection: conversations
Document ID: sessionId
*/
interface ConversationDocument {
  userId: string;
  sessionId: string;
  conversationHistory: {
    role: 'user' | 'assistant' | 'system' | 'function';
    content: string;
    timestamp: Timestamp;
    intent?: string;
    entities?: Record<string, any>;
    tokenCount?: number;
  }[];
  currentIntent?: string;
  pendingSlots: string[];
  filledSlots: Record<string, any>;
  activeFilters: Record<string, any>;
  lastActivityTimestamp: Timestamp;
  metadata: {
    totalTokensUsed: number;
    errorCount: number;
  };
}

/*
Collection: drafts
Document ID: draftId
*/
interface DraftDocument {
  userId: string;
  type: 'task' | 'update' | 'export';
  data: Record<string, any>;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
}

/*
Collection: responseCache
Document ID: cacheKey (hash)
*/
interface ResponseCacheDocument {
  userId: string;
  functionName: string;
  argsHash: string;
  response: string;
  data: any;
  cachedAt: Timestamp;
  expiresAt: Timestamp;
  hitCount: number;
}
```


***

## Part 11: Instruction Language Recommendations

### 11.1 English for System Prompts

For optimal model performance, use English consistently for all system-level instructions. The training data distribution of LLMs heavily favors English, resulting in:[^5]

- More precise intent recognition
- Better function parameter extraction
- More consistent response formatting

**Recommended Approach:**

```typescript
// System prompt: ALWAYS in English
const systemPrompt = `
You are a task management assistant...
`;

// User-facing responses: Match user's language
const responses = {
  en: {
    taskCreated: "Task created successfully!",
    confirmPrompt: "Should I save this task?"
  },
  es: {
    taskCreated: "¡Tarea creada exitosamente!",
    confirmPrompt: "¿Debo guardar esta tarea?"
  }
};

// Detect user language from input and respond accordingly
function getUserLanguage(input: string): 'en' | 'es' {
  const spanishPatterns = /\b(tarea|crear|mostrar|hola|ayuda|sí|cancelar)\b/i;
  return spanishPatterns.test(input) ? 'es' : 'en';
}
```


***

## Conclusion and Best Practices Summary

This comprehensive research provides the architectural foundation for building an intelligent, context-aware chatbot for task management applications. Key takeaways include:

1. **Modular Architecture**: Separate concerns into distinct modules (NLU, Dialog Management, Action Handling) for maintainability[^2]
2. **Hierarchical State Machines**: Use HSMs for complex multi-turn, multi-intent conversations[^4]
3. **Function Calling**: Define clear, well-documented functions with strict schemas for reliable CRUD operations[^5]
4. **Token Optimization**: Structure prompts with static content first, implement multi-layer caching, and use response caching[^7][^8]
5. **Structured Triggers**: Bypass AI for common, deterministic operations to reduce costs and latency[^9]
6. **UX Design**: Implement quick replies, confirmation flows, and graceful fallbacks[^12][^9]
7. **n8n Integration**: Use n8n webhooks for external tool orchestration (Notion, file parsing)[^10]
<span style="display:none">[^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43]</span>

<div align="center">⁂</div>

[^1]: https://arxiv.org/pdf/2009.03101.pdf

[^2]: https://downloads.hindawi.com/archive/2012/363840.pdf

[^3]: https://www.lambdatest.com/blog/microservices-design-patterns/

[^4]: https://pmc.ncbi.nlm.nih.gov/articles/PMC7266438/

[^5]: https://platform.openai.com/docs/guides/function-calling

[^6]: https://www.tencentcloud.com/techpedia/127736

[^7]: https://platform.openai.com/docs/guides/prompt-caching

[^8]: https://10clouds.com/blog/a-i/mastering-ai-token-optimization-proven-strategies-to-cut-ai-cost/

[^9]: https://uxcontent.com/designing-chatbots-fallbacks/

[^10]: https://n8n.io/integrations/agent/

[^11]: https://yellow.ai/blog/chatbot-decision-tree/

[^12]: https://www.parallelhq.com/blog/chatbot-ux-design

[^13]: https://fepbl.com/index.php/csitrj/article/view/1554

[^14]: https://www.jsrtjournal.com/index.php/JSRT/article/view/115

[^15]: https://www.internationaljournalssrg.org/IJCSE/paper-details?Id=559

[^16]: https://www.ijfmr.com/research-paper.php?id=37229

[^17]: https://eajournals.org/ejcsit/vol13-issue45-2025/enterprise-scale-microservices-architecture-domain-driven-design-and-cloud-native-patterns-using-the-spring-ecosystem/

[^18]: https://lorojournals.com/index.php/emsj/article/view/1632

[^19]: https://ieeexplore.ieee.org/document/11167186/

[^20]: http://www.ijcse.com/abstract.html?file=22-13-02-067

[^21]: https://www.ijfmr.com/research-paper.php?id=37231

[^22]: https://dl.acm.org/doi/10.1145/3647782.3647811

[^23]: https://zenodo.org/record/3951869/files/paper.pdf

[^24]: http://arxiv.org/pdf/2409.03792.pdf

[^25]: https://arxiv.org/pdf/2302.14600.pdf

[^26]: https://wjaets.com/sites/default/files/WJAETS-2023-0226.pdf

[^27]: https://arxiv.org/pdf/2201.03598.pdf

[^28]: https://zenodo.org/record/5724082/files/paper.pdf

[^29]: https://es.linkedin.com/advice/0/what-most-common-design-patterns-chatbot-etwke?lang=es\&lang=es

[^30]: https://www.sciencedirect.com/science/article/pii/S1532046419302242

[^31]: https://dev.to/cortexflow/mastering-essential-software-architecture-patterns-a-comprehensive-guide-part-2-hl9

[^32]: https://www.scitepress.org/Papers/2024/124337/124337.pdf

[^33]: https://thinhdanggroup.github.io/function-calling-openai/

[^34]: https://www.youtube.com/watch?v=o7uMZkuegEE

[^35]: https://docs.kanaries.net/articles/openai-function-calling

[^36]: https://www.sayonetech.com/blog/ai-and-microservices-architecture/

[^37]: https://www.netguru.com/blog/azure-architecture-for-multi-chatbot-platforms

[^38]: https://www.tidio.com/blog/chatbot-flowchart/

[^39]: https://community.openai.com/t/prompting-best-practices-for-tool-use-function-calling/1123036

[^40]: https://www.linkedin.com/advice/0/what-most-common-design-patterns-chatbot-etwke

[^41]: https://botpenguin.com/glossary/chatbot-decision-tree

[^42]: https://mirascope.com/blog/openai-function-calling

[^43]: https://talent500.com/blog/microservices-design-patterns-guide/

