'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogClose 
} from '../DialogPrimitives';
import { 
  DialogHeader,
  DialogFooter 
} from '../molecules';

/**
 * Ejemplo de Dialog siguiendo el patrón shadcn/ui mejorado
 * 
 * Características implementadas:
 * ✅ Un solo botón close (en DialogContent)
 * ✅ Header con border-b
 * ✅ Footer con border-t
 * ✅ Padding consistente (p-0 en content, px-6 py-4 en secciones)
 * ✅ Jerarquía visual clara
 * ✅ Estructura semántica correcta
 */
export default function AurinDialogExample() {
  const [open, setOpen] = useState(false);

  const handleOpenDialog = () => setOpen(true);

  return (
    <>
      <Button onClick={handleOpenDialog}>
        Show Aurin Dialog
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 sm:max-w-lg gap-0">
          {/* 
            Header con título y descripción 
            - border-b automático
            - padding consistente 
          */}
          <DialogHeader 
            title="Create New Task"
            description="Fill out the form below to create a new task in your project"
            bordered
          />

          {/* Formulario con padding interno */}
          <form className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Implement user authentication"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add more details about this task..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  name="priority"
                  placeholder="High, Medium, Low"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Input
                  id="assignee"
                  name="assignee"
                  placeholder="john@example.com"
                />
              </div>
            </div>
          </form>

          {/* 
            Footer con botones 
            - border-t automático
            - padding y alineación consistente 
          */}
          <DialogFooter bordered>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm">
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
