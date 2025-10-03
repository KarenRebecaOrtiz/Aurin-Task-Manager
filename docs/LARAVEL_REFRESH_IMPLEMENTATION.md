# Implementación del Método de Refresh en Laravel

## 🎯 Traslación del Patrón Next.js → Laravel

Esta documentación traslada el patrón de refresh post-creación de tareas desde Next.js/React hacia Laravel, manteniendo la misma filosofía pero adaptándose a las mejores prácticas del ecosistema PHP.

## 🏗️ Stack Laravel Recomendado

```bash
# Dependencias principales
composer require laravel/framework
composer require laravel/sanctum        # Autenticación API
composer require spatie/laravel-activitylog  # Activity tracking
composer require laravel/horizon        # Queue management
composer require pusher/pusher-php-server    # Real-time notifications

# Frontend (opcional)
npm install @inertiajs/inertia @inertiajs/inertia-vue3
npm install axios vue@next
```

## 📁 Estructura de Archivos

```
app/
├── Http/Controllers/TaskController.php
├── Models/Task.php
├── Services/TaskService.php
├── Jobs/SendTaskNotifications.php
└── Events/TaskCreated.php

resources/
├── js/Components/CreateTask.vue
└── views/dashboard.blade.php
```

## 🔧 Implementación Backend

### **1. Controller con Patrón de Refresh**

```php
<?php
// app/Http/Controllers/TaskController.php

namespace App\Http\Controllers;

use App\Http\Requests\CreateTaskRequest;
use App\Services\TaskService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

class TaskController extends Controller
{
    public function __construct(private TaskService $taskService) {}

    /**
     * 🔄 MÉTODO PRINCIPAL - Equivalente al onSubmit de React
     */
    public function store(CreateTaskRequest $request): RedirectResponse|JsonResponse
    {
        try {
            // 1. Crear tarea usando el service
            $task = $this->taskService->createTask(
                $request->validated(),
                auth()->user()
            );

            // 2. Preparar mensaje de éxito
            $successMessage = "La tarea \"{$task->name}\" se ha creado exitosamente.";

            // 3. 🔄 PATRÓN DE REFRESH - Equivalente a window.location.reload()
            if ($request->expectsJson()) {
                // Para peticiones AJAX/API
                return response()->json([
                    'success' => true,
                    'message' => $successMessage,
                    'task' => $task->load(['client', 'leaders', 'assignees']),
                    'refresh_required' => true, // Flag para el frontend
                ], 201);
            }

            // Para peticiones tradicionales (form submit)
            return redirect()
                ->route('dashboard')
                ->with('success', $successMessage)
                ->with('refresh_data', true); // Flag para refresh
                
        } catch (\Exception $e) {
            return $this->handleError($e, $request);
        }
    }

    private function handleError(\Exception $e, $request)
    {
        $errorMessage = match (true) {
            str_contains($e->getMessage(), 'permission') => 
                'No tienes permisos para crear esta tarea.',
            str_contains($e->getMessage(), 'network') => 
                'Problema de conexión. Intenta nuevamente.',
            str_contains($e->getMessage(), 'validation') => 
                'Algunos campos contienen errores.',
            default => 'No pudimos crear tu tarea. Intenta nuevamente.'
        };

        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => $errorMessage,
            ], 422);
        }

        return redirect()->back()->withErrors(['general' => $errorMessage]);
    }
}
```

### **2. Service Layer**

```php
<?php
// app/Services/TaskService.php

namespace App\Services;

use App\Models\Task;
use App\Events\TaskCreated;
use Illuminate\Support\Facades\DB;

class TaskService
{
    public function createTask(array $data, $creator): Task
    {
        return DB::transaction(function () use ($data, $creator) {
            // 1. Crear la tarea
            $task = Task::create([
                'name' => $data['name'],
                'description' => $data['description'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'status' => $data['status'],
                'priority' => $data['priority'],
                'client_id' => $data['client_id'],
                'project' => $data['project'],
                'created_by' => $creator->id,
            ]);

            // 2. Asignar relaciones
            $task->leaders()->attach($data['leaders']);
            if (!empty($data['assignees'])) {
                $task->assignees()->attach($data['assignees']);
            }

            // 3. Log de actividad
            activity()
                ->performedOn($task)
                ->causedBy($creator)
                ->log('created');

            // 4. Disparar evento para notificaciones
            event(new TaskCreated($task, $creator));

            return $task;
        });
    }
}
```

## 🎨 Implementación Frontend

### **Componente Vue con Patrón de Refresh**

```vue
<!-- resources/js/Components/CreateTask.vue -->
<template>
  <div class="create-task-modal" :class="{ 'is-open': isOpen }">
    <form @submit.prevent="submitTask" class="task-form">
      <!-- Formulario aquí -->
      
      <button type="submit" :disabled="isSubmitting" class="btn btn-success">
        <span v-if="isSubmitting">Creando...</span>
        <span v-else>Crear Tarea</span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useForm } from '@inertiajs/vue3'

const props = defineProps({
  isOpen: Boolean,
  clients: Array,
  users: Array,
})

const emit = defineEmits(['close', 'taskCreated'])

const form = useForm({
  client_id: '',
  project: '',
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'Por Iniciar',
  priority: 'Baja',
  leaders: [],
  assignees: [],
})

const isSubmitting = ref(false)

/**
 * 🔄 MÉTODO PRINCIPAL - Equivalente al onSubmit de React
 * Implementa el patrón de refresh post-creación
 */
const submitTask = () => {
  isSubmitting.value = true

  form.post(route('tasks.store'), {
    onSuccess: (response) => {
      handleSuccessfulCreation(response)
    },
    onError: (errors) => {
      handleCreationError(errors)
    },
    onFinish: () => {
      isSubmitting.value = false
    }
  })
}

/**
 * 🔄 Manejo de creación exitosa - Patrón de refresh
 */
const handleSuccessfulCreation = (response) => {
  // 1. Mostrar mensaje de éxito
  toast.success('Tarea creada exitosamente')
  
  // 2. Limpiar formulario
  form.reset()
  
  // 3. Cerrar modal
  emit('close')
  
  // 4. 🔄 REFRESH PATTERN - Equivalente a window.location.reload()
  if (response.props?.flash?.refresh_data) {
    // Opción A: Refresh completo (equivalente directo)
    window.location.reload()
  } else {
    // Opción B: Refresh inteligente con Inertia
    window.location.href = route('dashboard')
  }
  
  // 5. Callback opcional
  emit('taskCreated', response.data?.task)
}

const handleCreationError = (errors) => {
  toast.error('Error al crear la tarea')
  console.error(errors)
}
</script>
```

## 🔄 Alternativas de Refresh en Laravel

### **1. Refresh Completo (Equivalente directo)**

```php
// Controller
return redirect()->route('dashboard')->with('refresh_required', true);
```

```javascript
// Frontend
if (response.refresh_required) {
    window.location.reload();
}
```

### **2. Refresh con Inertia.js (Recomendado)**

```php
// Controller
return redirect()->route('dashboard')->with('success', $message);
```

### **3. Refresh Parcial con Livewire**

```php
// Componente Livewire
class TaskManager extends Component
{
    public function createTask($data)
    {
        $this->taskService->createTask($data, auth()->user());
        
        // Refresh automático del componente
        $this->emit('taskCreated');
        session()->flash('success', 'Tarea creada exitosamente');
    }
    
    public function render()
    {
        return view('livewire.task-manager', [
            'tasks' => auth()->user()->tasks()->get()
        ]);
    }
}
```

### **4. API con Refresh Manual**

```php
// API Controller
public function store(CreateTaskRequest $request)
{
    $task = $this->taskService->createTask($request->validated(), auth()->user());
    
    return response()->json([
        'success' => true,
        'task' => new TaskResource($task),
        'message' => 'Tarea creada exitosamente',
        'refresh_required' => true
    ]);
}
```

```javascript
// Frontend con Axios
const createTask = async (formData) => {
  try {
    const response = await axios.post('/api/tasks', formData);
    
    if (response.data.refresh_required) {
      // Equivalente a window.location.reload()
      window.location.reload();
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
  }
};
```

## 🧪 Testing

### **Test del Patrón de Refresh**

```php
<?php
// tests/Feature/TaskCreationTest.php

class TaskCreationTest extends TestCase
{
    /** @test */
    public function it_redirects_with_refresh_flag_after_successful_creation()
    {
        $user = User::factory()->create();
        $client = Client::factory()->create();
        
        $response = $this->actingAs($user)
            ->post(route('tasks.store'), [
                'name' => 'Test Task',
                'description' => 'Test Description',
                'client_id' => $client->id,
                'project' => 'Test Project',
                'start_date' => now()->format('Y-m-d'),
                'end_date' => now()->addDays(7)->format('Y-m-d'),
                'status' => 'Por Iniciar',
                'priority' => 'Media',
                'leaders' => [$user->id],
            ]);

        $response->assertRedirect(route('dashboard'));
        $response->assertSessionHas('refresh_data', true);
        $response->assertSessionHas('success');
    }

    /** @test */
    public function api_returns_refresh_flag_on_successful_creation()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)
            ->postJson(route('api.tasks.store'), $this->validTaskData());

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'refresh_required' => true
        ]);
    }
}
```

## 📊 Comparación: Next.js vs Laravel

| Aspecto | Next.js/React | Laravel |
|---------|---------------|---------|
| **Refresh Method** | `window.location.reload()` | `redirect()->with('refresh_data', true)` |
| **State Management** | Zustand/React State | Session/Database |
| **Error Handling** | Try/catch + toast | Exception handling + flash messages |
| **Async Operations** | Promise chains | Database transactions |
| **Real-time Updates** | WebSocket/SSE | Pusher/WebSocket |
| **Testing** | Jest + React Testing Library | PHPUnit + Feature tests |

## 🚀 Mejores Prácticas

1. **Usar transacciones** para operaciones complejas
2. **Implementar queues** para notificaciones
3. **Validar en múltiples capas** (Request, Service, Model)
4. **Manejar errores específicos** con mensajes claros
5. **Testear el flujo completo** incluyendo el refresh

---

**Última actualización**: Enero 2025  
**Autor**: Equipo de Desarrollo Aurin  
**Versión**: 1.0.0
