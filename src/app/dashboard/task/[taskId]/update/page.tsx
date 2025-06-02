export default function UpdateTaskPage({ params }) {
  const taskId = params?.taskId ?? 'unknown';
  return (
    <div>
      <h1>Actualizar Tarea {taskId}</h1>
      <p>Formulario para registrar progreso (opcional, probablemente en sidebar)</p>
    </div>
  );
}
