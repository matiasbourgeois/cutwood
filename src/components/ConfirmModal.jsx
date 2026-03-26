import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ title, message, detail, confirmText, confirmIcon, cancelText, onConfirm, onCancel, icon, variant }) {
  const isWarning = variant === 'warning';
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-icon-wrap ${isWarning ? 'confirm-icon-warning' : ''}`}>
          {icon || <AlertTriangle size={28} />}
        </div>
        <div className="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        {detail && <div className="confirm-detail">{detail}</div>}
        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>
            {cancelText || 'Cancelar'}
          </button>
          <button className={`confirm-btn-confirm ${isWarning ? 'confirm-btn-warning' : ''}`} onClick={onConfirm}>
            {confirmIcon && confirmIcon} {confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
