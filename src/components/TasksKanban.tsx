"use client";

import { useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ButtonKanban from "./ui/ButtonKanban";
import AvatarGroup from "./ui/AvatarGroup";
import styles from "./TasksTable.module.scss";
import { Task, Client, User } from "@/types";
import Image from "next/image";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TasksKanbanProps {
  tasks: Task[];
  clients: Client[];
  users: User[];
  isAdmin: boolean;
  userId: string;
  onChatSidebarOpen: (task: Task) => void;
  onEditTaskOpen: (taskId: string) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  searchQuery: string;
  priorityFilter: string;
  clientFilter: string;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TasksKanban: React.FC<TasksKanbanProps> = ({
  tasks,
  clients,
  users,
  isAdmin,
  userId,
  onChatSidebarOpen,
  onEditTaskOpen,
  onDeleteTaskOpen,
  searchQuery,
  priorityFilter,
  clientFilter,
  setTasks,
}) => {
  const statuses = ["Por Iniciar", "Backlog", "En Proceso", "Finalizado", "Cancelado"];

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      const matchesClient = !clientFilter || task.clientId === clientFilter;
      return matchesSearch && matchesPriority && matchesClient;
    });
  }, [tasks, searchQuery, priorityFilter, clientFilter]);

  const tasksByStatus = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    statuses.forEach((status) => {
      grouped[status] = filteredTasks.filter((task) => task.status === status);
    });
    return grouped;
  }, [filteredTasks, statuses]);

  const handleDragEnd = async (result: DropResult) => {
    if (!isAdmin) {
      console.log("[TasksKanban] Non-admin user attempted to drag task, action blocked");
      return;
    }
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      console.log("[TasksKanban] No valid destination or same position, drag cancelled");
      return;
    }

    const task = tasks.find((t) => t.id === draggableId);
    if (!task) {
      console.warn("[TasksKanban] Task not found:", draggableId);
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status: destination.droppableId,
      });
      console.log("[TasksKanban] Task status updated in Firebase:", {
        taskId: task.id,
        oldStatus: source.droppableId,
        newStatus: destination.droppableId,
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: destination.droppableId } : t,
        ),
      );
    } catch (error) {
      console.error("[TasksKanban] Error updating task status:", {
        taskId: task.id,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });
      alert("Error al actualizar el estado de la tarea");
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={`${styles.kanbanContainer} flex gap-4 overflow-x-auto p-4`}>
        {statuses.map((status) => (
          <Droppable key={status} droppableId={status}>
            {(provided) => (
              <div
                className={`${styles.kanbanColumn} w-72 shrink-0 rounded-md shadow-sm`}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <div className={`${styles.kanbanColumnHeader} p-3 flex justify-between items-center border-b rounded-t-md`}>
                  <h3 className="font-medium text-sm">
                    {status}
                    <span className={`${styles.kanbanTaskCount} ml-2 text-xs px-2 py-0.5 rounded-full`}>
                      {tasksByStatus[status]?.length || 0}
                    </span>
                  </h3>
                </div>
                <div className={`${styles.kanbanTaskList} p-2 overflow-y-auto max-h-[calc(100vh-200px)]`}>
                  {tasksByStatus[status]?.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                      isDragDisabled={!isAdmin}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${styles.kanbanTaskCard} mb-2 p-3 rounded-md shadow-sm border hover:shadow-md transition-shadow cursor-pointer`}
                          onClick={() => onChatSidebarOpen(task)}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className={`${styles.kanbanTaskTitle} font-medium mb-2`}>{task.name}</h4>
                            {(isAdmin || task.CreatedBy === userId) && (
                              <div className="flex gap-1">
                                <ButtonKanban
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditTaskOpen(task.id);
                                    console.log("[TasksKanban] Edit action triggered for task:", task.id);
                                  }}
                                >
                                  <Image src="/edit.svg" alt="Edit" width={16} height={16} />
                                </ButtonKanban>
                                <ButtonKanban
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTaskOpen(task.id);
                                    console.log("[TasksKanban] Delete action triggered for task:", task.id);
                                  }}
                                >
                                  <Image src="/trash.svg" alt="Delete" width={16} height={16} />
                                </ButtonKanban>
                              </div>
                            )}
                          </div>
                          <div className={`${styles.kanbanClientName} text-xs mb-2`}>
                            {clients.find((c) => c.id === task.clientId)?.name || "Sin cuenta"}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`${styles[`priority-${task.priority}`]} ${styles.kanbanPriority} text-xs px-2 py-1 rounded`}>
                              {task.priority}
                            </span>
                            <AvatarGroup assignedUserIds={task.AssignedTo} users={users} />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};

export default TasksKanban;