import {useLayoutEffect, useRef, type ReactNode} from 'react';

type AccessibleDialogProps = {
  label: string;
  className: string;
  onDismiss: () => void;
  children: ReactNode;
  alert?: boolean;
};

/** Native modal dialogs isolate focus and make the background inert, including nested dialogs. */
export function AccessibleDialog({label, className, onDismiss, children, alert = false}: AccessibleDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({preventScroll: true});
    };
  }, []);
  return <dialog
    ref={ref}
    className={'accessible-dialog ' + className}
    aria-label={label}
    aria-modal="true"
    role={alert ? 'alertdialog' : 'dialog'}
    tabIndex={-1}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const dialog = event.currentTarget;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]'))
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
      if (!controls.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }}
    onCancel={event => {event.preventDefault(); onDismiss();}}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onDismiss();
    }}
  >{children}</dialog>;
}
