import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { cx } from '../lib/util'

export function Btn({ icon, children, kind = 'plain', ...rest }: { icon?: string; kind?: 'plain' | 'primary' | 'quiet' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={cx('btn', `btn-${kind}`, rest.className)}>
      {icon && <Icon name={icon} size={15} />}
      {children && <span>{children}</span>}
    </button>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: string }[]; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={cx('seg-item', value === o.value && 'on')} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={cx('field', wide && 'wide')}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function AutoText({ value, onChange, rows = 1, className, ...rest }: { value: string; onChange: (v: string) => void; rows?: number; className?: string } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'>) {
  return (
    <textarea
      {...rest}
      className={cx('input autotext', className)}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      ref={(el) => { if (el) { el.style.height = '0px'; el.style.height = el.scrollHeight + 2 + 'px' } }}
    />
  )
}

export function StateBadge({ state }: { state: 'done' | 'partial' | 'missing' }) {
  return <span className={cx('badge', `badge-${state}`)}>{state === 'done' ? 'Ready' : state === 'partial' ? 'Partial' : 'Not run'}</span>
}

let toastPush: (m: { text: string; tone?: 'ok' | 'err' }) => void = () => {}
export const toast = (text: string, tone: 'ok' | 'err' = 'ok') => toastPush({ text, tone })
export function Toaster() {
  const [items, setItems] = useState<{ id: number; text: string; tone?: string }[]>([])
  useEffect(() => {
    let n = 0
    toastPush = (m) => {
      const id = ++n
      setItems((s) => [...s, { id, ...m }])
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3600)
    }
  }, [])
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={cx('toast', t.tone === 'err' && 'err')}>
          <Icon name={t.tone === 'err' ? 'alert' : 'check'} size={15} />
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function Empty({ title, children, icon = 'anchor' }: { title: string; children?: ReactNode; icon?: string }) {
  return (
    <div className="empty">
      <Icon name={icon} size={26} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}
