import { JSX } from 'preact';

declare global {
  namespace preact.JSX {
    interface TargetedEvent<T extends EventTarget = EventTarget, E extends Event = Event> extends Pick<E, keyof E> {
      readonly currentTarget: T;
      readonly target: T;
    }
  }
}

// Extender los tipos de eventos de Preact para que e.target.value funcione
declare module 'preact' {
  namespace JSX {
    interface HTMLAttributes<RefType extends EventTarget = EventTarget> {
      // Permitir onChange con event tipado
    }
  }
}

// Helper type para eventos de input
export type InputEvent = JSX.TargetedEvent<HTMLInputElement, Event>;
export type SelectEvent = JSX.TargetedEvent<HTMLSelectElement, Event>;
export type TextAreaEvent = JSX.TargetedEvent<HTMLTextAreaElement, Event>;

// Re-exportar tipos comunes
export type { FunctionComponent, JSX, VNode } from 'preact';
