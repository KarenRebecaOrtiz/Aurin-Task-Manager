// src/app/dashboard/task/[taskId]/update/page.tsx
export default function UpdateTaskPage({ params }: { params: { taskId: string } }) {
    return (
      <div>
        <h1>Actualizar Tarea {params.taskId}</h1>
        <p>Formulario para registrar progreso (opcional, probablemente en sidebar)</p>
      </div>
    );
  }