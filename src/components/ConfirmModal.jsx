import { Package } from 'lucide-react';

export default function ConfirmModal({ title, message, confirmText, confirmIcon, cancelText, onConfirm, onCancel, icon }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        {icon && <div className="confirm-icon"><Package size={36} /></div>}
        <div className="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>
            {cancelText || 'Cancelar'}
          </button>
          <button className="confirm-btn-confirm" onClick={onConfirm}>
            {confirmIcon && confirmIcon} {confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
