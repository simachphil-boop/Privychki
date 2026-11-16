import { ArrowRight, Bell, Check } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../../lib/i18n'
import { requestPermission } from '../../lib/notifications'
import { TEMPLATES, TEMPLATE_IDS, fromTemplate, type TemplateId } from '../../lib/templates'
import { useStore, useToday } from '../../store/store'
import { habitIcon } from '../../ui/icons'
import { Button, cx, tint } from '../../ui/kit'
import { importFromFile } from '../profile/data'

/** First launch: a name, a few starter habits, and the notification choice. */
export function Onboarding() {
  const t = useT()
  const today = useToday((s) => s.today)
  const { addHabit, updateSettings } = useStore.getState()
  const settings = useStore((s) => s.settings)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<TemplateId[]>([])

  const finish = async (notify: boolean) => {
    const granted = notify ? await requestPermission() : 'default'
    picked.forEach((id) => addHabit(fromTemplate(id, t.templates[id], today)))
    updateSettings({ name: name.trim(), onboarded: true, notifications: { ...settings.notifications, enabled: notify && granted !== 'unsupported' } })
  }

  return (
    <main className="onb">
      <div className="onb__inner" key={step}>
        <div className="onb__steps" aria-hidden>
          {[0, 1, 2].map((i) => (
            <i key={i} className={cx(i <= step && 'is-on')} />
          ))}
        </div>

        {step === 0 && (
          <form
            className="onb__step"
            onSubmit={(e) => {
              e.preventDefault()
              setStep(1)
            }}
          >
            <p className="onb__brand">Dayflow</p>
            <h1 className="onb__title">{t.onb.welcomeTitle}</h1>
            <p className="onb__text">{t.onb.welcomeText}</p>
            <label className="onb__field">
              <span className="field__label">{t.onb.nameLabel}</span>
              <input className="input" autoFocus value={name} maxLength={40} placeholder={t.profile.namePlaceholder} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="onb__actions">
              <Button type="submit" variant="primary" block>
                {t.onb.next}
                <ArrowRight size={17} aria-hidden />
              </Button>
              <button type="button" className="link link--center" onClick={() => importFromFile(false)}>{t.onb.restore}</button>
            </div>
          </form>
        )}

        {step === 1 && (
          <div className="onb__step">
            <h1 className="onb__title">{t.onb.habitsTitle}</h1>
            <p className="onb__text">{t.onb.habitsText}</p>
            <div className="group onb__list">
              {TEMPLATE_IDS.map((id) => {
                const on = picked.includes(id)
                const Icon = habitIcon(TEMPLATES[id].icon)
                return (
                  <button key={id} type="button" className={cx('item', 'item--link', on && 'is-picked')} style={tint(TEMPLATES[id].color)} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== id) : [...picked, id])}>
                    <span className="tile">
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="item__text">
                      <span className="item__title">{t.templates[id].name}</span>
                      <span className="item__meta">{t.templates[id].summary}</span>
                    </span>
                    <span className={cx('pick', on && 'is-on')}>{on && <Check size={14} strokeWidth={2.5} aria-hidden />}</span>
                  </button>
                )
              })}
            </div>
            <div className="onb__actions onb__actions--sticky">
              <Button variant="primary" block onClick={() => setStep(2)}>
                {picked.length ? t.onb.addHabits(picked.length) : t.onb.skip}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onb__step">
            <span className="onb__icon">
              <Bell size={22} strokeWidth={1.5} aria-hidden />
            </span>
            <h1 className="onb__title">{t.onb.notifyTitle}</h1>
            <p className="onb__text">{t.onb.notifyText}</p>
            <div className="onb__actions">
              <Button variant="primary" block onClick={() => finish(true)}>{t.onb.notifyOn}</Button>
              <Button variant="ghost" block onClick={() => finish(false)}>{t.onb.notifyLater}</Button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
