import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { startTime: string; duration: number }) => Promise<void>;
}

const AddSlotModal = ({ open, onOpenChange, onCreate }: AddSlotModalProps) => {
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!startTime || duration <= 0) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreate({ startTime, duration });
      setStartTime('');
      setDuration(30);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/20 bg-surface-glass">
        <DialogHeader>
          <DialogTitle>Agregar horario disponible</DialogTitle>
          <DialogDescription>
            Define la fecha y duración del slot para videollamadas premium.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slot-start">Fecha y hora de inicio</Label>
            <Input
              id="slot-start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slot-duration">Duracion (minutos)</Label>
            <Input
              id="slot-duration"
              type="number"
              min={15}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value || 0))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button variant="gold" onClick={() => void submit()} disabled={isSaving || !startTime || duration <= 0}>
              {isSaving ? 'Guardando...' : 'Guardar slot'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSlotModal;
