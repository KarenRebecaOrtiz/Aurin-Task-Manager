'use client';

import React from 'react';

interface CreateTaskProps {
  isOpen?: boolean;
  onClose?: () => void;
  onTaskCreated?: () => void;
}

const CreateTask: React.FC<CreateTaskProps> = ({ 
  isOpen = false, 
  onClose, 
  onTaskCreated 
}) => {
  if (!isOpen) return null;

  return (
    <div className="create-task-modal">
      <div className="create-task-content">
        <h2>Crear Nueva Tarea</h2>
        {/* CreateTask component - Content will be restored from backup if needed */}
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

export default CreateTask;