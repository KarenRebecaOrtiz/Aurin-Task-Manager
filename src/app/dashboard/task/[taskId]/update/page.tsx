// src/app/dashboard/task/[taskId]/update/page.tsx
import type { NextPage } from 'next';

interface Params {
  taskId: string;
}

const UpdateTaskPage: NextPage<{ params: Params }> = ({ params }) => {
  return (
    <div>
      <h1>Actualizar Tarea {params.taskId}</h1>
      <p>Formulario para registrar progreso (opcional, probablemente en sidebar)</p>
    </div>
  );
};

export default UpdateTaskPage;