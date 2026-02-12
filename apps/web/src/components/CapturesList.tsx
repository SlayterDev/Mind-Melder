import CaptureCard from './CaptureCard';

interface Capture {
  id: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface CapturesListProps {
  captures: Capture[];
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function CapturesList({ captures, onEdit, onDelete }: CapturesListProps) {
  return (
    <div className="space-y-3">
      {captures.map((capture) => (
        <CaptureCard
          key={capture.id}
          capture={capture}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
