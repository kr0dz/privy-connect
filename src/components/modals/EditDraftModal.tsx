import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface EditDraftModalProps {
  isOpen: boolean;
  draftId: string;
  initialContent: string;
  onSave: (draftId: string, newContent: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const EditDraftModal = ({
  isOpen,
  draftId,
  initialContent,
  onSave,
  onCancel,
  isLoading = false,
}: EditDraftModalProps) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draftId, content);
      setContent(initialContent);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setContent(initialContent);
      onCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl border-primary/20 bg-gradient-to-br from-surface-glass to-surface-glass/80">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar respuesta del gemelo IA</DialogTitle>
          <DialogDescription>
            Revisa y personaliza la respuesta antes de enviarla al fan. Puedes cambiar el tono, agregar detalles o rechazarla completamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="draft-content" className="text-sm font-semibold text-foreground">
              Contenido del mensaje
            </label>
            <Textarea
              id="draft-content"
              placeholder="Escriba el contenido de la respuesta..."
              className="min-h-48 resize-none bg-secondary/30 border-border/50 focus-visible:ring-primary/30"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading || isSaving}
            />
            <p className="text-xs text-muted-foreground">
              {content.length} caracteres
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading || isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="gold"
              onClick={handleSave}
              disabled={!content.trim() || isLoading || isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar y enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditDraftModal;
