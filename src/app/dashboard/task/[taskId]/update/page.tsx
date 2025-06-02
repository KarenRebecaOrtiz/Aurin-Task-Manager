export default function UpdateTaskPage({
    params,
    searchParams,
  }: {
    params: { taskId: string };
    searchParams: { [key: string]: string | string[] | undefined };
  }) {
    return (
      <div>
        <h1>Actualizar Tarea {params.taskId}</h1>
        <p>Formulario para registrar progreso</p>
      </div>
    );
  }