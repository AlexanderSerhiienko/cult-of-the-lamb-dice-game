import { HeaderActionButton } from "@/components/ui/header-action-button";

type ModalHeaderProps = {
  title: string;
  onClose: () => void;
};

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <HeaderActionButton variant="secondary" onClick={onClose} className="px-2 py-1">
        Close
      </HeaderActionButton>
    </div>
  );
}
