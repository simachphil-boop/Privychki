import { Archive, Bell, ChevronRight, Database, Download, FileSpreadsheet, History, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { clearBackups, download, listBackups, logsToCsv, saveBackup, serialize } from '../../lib/backup'
import { fmtDay, fmtTime } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { isNative } from '../../lib/native'
import { permissionState, queryPermission, requestPermission, sendTestNotification } from '../../lib/notifications'
import { navigate } from '../../lib/router'
import { getData, useStore, useToday } from '../../store/store'
import type { Lang, ThemePref } from '../../store/types'
import { toast, useUi } from '../../store/ui'
import { Avatar, Button, PageHeader, Row, SectionHead, Segmented, Switch, cx } from '../../ui/kit'
import { importFromFile, pickFile, readAvatar } from './data'

export function Profile() {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  const settings = useStore((s) => s.settings)
  const reminders = useStore((s) => s.reminders)
  const archived = useStore((s) => s.habits.filter((h) => h.archivedAt).length + s.tasks.filter((x) => x.archivedAt).length + s.goals.filter((g) => g.archivedAt).length)
  const { updateSettings, updateReminder, replaceData, resetAll } = useStore.getState()
  const openSheet = useUi((s) => s.openSheet)
  const ask = useUi((s) => s.ask)
  const [backups, setBackups] = useState(listBackups)
  const [permission, setPermission] = useState(permissionState)
  useEffect(() => {
    void queryPermission().then(setPermission)
  }, [])
  const n = settings.notifications
  const setN = (patch: Partial<typeof n>) => updateSettings({ notifications: { ...n, ...patch } })
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const changeAvatar = async () => {
    const file = await pickFile('image/*')
    if (!file) return
    try {
      updateSettings({ avatar: await readAvatar(file) })
    } catch {
      toast(t.profile.avatarFailed)
    }
  }

  const toggleNotifications = async (on: boolean) => {
    if (!on) return setN({ enabled: false })
    const result = await requestPermission()
    setPermission(result)
    setN({ enabled: true })
    if (result === 'granted') toast(t.profile.notifyOn)
  }

  const save = (filename: string, text: string, mime: string) =>
    download(filename, text, mime).then(
      () => !isNative && toast(t.profile.exported),
      () => toast(t.profile.exportFailed),
    )
  const exportJson = () => save(`dayflow-${today}.json`, serialize(getData()), 'application/json')

  return (
    <main className="page">
      <PageHeader title={t.nav.profile} eyebrow={t.profile.eyebrow} />

      <div className="identity">
        <button type="button" className="identity__avatar" aria-label={t.profile.changePhoto} onClick={changeAvatar}>
          <Avatar size={64} />
        </button>
        <div className="identity__text">
          <input className="title-input" value={settings.name} maxLength={40} placeholder={t.profile.namePlaceholder} aria-label={t.profile.name} onChange={(e) => updateSettings({ name: e.target.value })} />
          <div className="identity__links">
            <button type="button" className="link" onClick={changeAvatar}>{settings.avatar ? t.profile.changePhoto : t.profile.addPhoto}</button>
            {settings.avatar && <button type="button" className="link link--muted" onClick={() => updateSettings({ avatar: null })}>{t.profile.removePhoto}</button>}
          </div>
        </div>
      </div>

      <section className="section">
        <SectionHead title={t.profile.appearance} />
        <div className="group">
          <Row label={t.profile.theme} stack>
            <Segmented<ThemePref> size="sm" label={t.profile.theme} value={settings.theme} onChange={(theme) => updateSettings({ theme })} options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t.profile.themes[v] }))} />
          </Row>
          <Row label={t.profile.language}>
            <Segmented<Lang> size="sm" label={t.profile.language} value={settings.lang} onChange={(l) => updateSettings({ lang: l })} options={[{ value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }]} />
          </Row>
        </div>
      </section>

      <section className="section">
        <SectionHead title={t.profile.region} />
        <div className="group">
          <Row label={t.profile.weekStart}>
            <Segmented size="sm" label={t.profile.weekStart} value={String(settings.weekStart)} onChange={(v) => updateSettings({ weekStart: v === '0' ? 0 : 1 })} options={[{ value: '1', label: t.profile.monday }, { value: '0', label: t.profile.sunday }]} />
          </Row>
          <Row label={t.profile.timeFormat}>
            <Segmented size="sm" label={t.profile.timeFormat} value={settings.timeFormat} onChange={(timeFormat) => updateSettings({ timeFormat })} options={[{ value: '24', label: t.profile.h24 }, { value: '12', label: t.profile.h12 }]} />
          </Row>
          <Row label={t.profile.timeZone} hint={t.profile.timeZoneHint}>
            <span>{zone}</span>
          </Row>
        </div>
      </section>

      <section className="section">
        <SectionHead title={t.profile.notifications} />
        <div className="group">
          <Row label={t.profile.notifyAll} hint={permission === 'unsupported' ? t.profile.notifyUnsupported : n.enabled && permission === 'denied' ? t.profile.notifyDenied : undefined}>
            <Switch checked={n.enabled} onChange={toggleNotifications} label={t.profile.notifyAll} />
          </Row>
          <Row label={t.profile.notifyHabits}>
            <Switch checked={n.enabled && n.habits} disabled={!n.enabled} onChange={(habits) => setN({ habits })} label={t.profile.notifyHabits} />
          </Row>
          <Row label={t.profile.notifyTasks}>
            <Switch checked={n.enabled && n.tasks} disabled={!n.enabled} onChange={(tasks) => setN({ tasks })} label={t.profile.notifyTasks} />
          </Row>
          <Row label={t.profile.notifyReminders}>
            <Switch checked={n.enabled && n.reminders} disabled={!n.enabled} onChange={(r) => setN({ reminders: r })} label={t.profile.notifyReminders} />
          </Row>
          {n.enabled && permission === 'granted' && (
            <Row label={t.profile.notifyTest} icon={Bell} onClick={sendTestNotification}>
              <ChevronRight size={16} aria-hidden />
            </Row>
          )}
        </div>
        <p className="note section-note">{isNative ? t.profile.notifyNoteNative : t.profile.notifyNote}</p>
      </section>

      <section className="section">
        <SectionHead title={t.day.reminders} count={reminders.length ? String(reminders.length) : undefined}>
          <button type="button" className="icon-btn" aria-label={t.reminder.create} onClick={() => openSheet({ type: 'create', kind: 'reminder' })}>
            <Plus size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </SectionHead>
        {reminders.length ? (
          <div className="group">
            {[...reminders].sort((a, b) => a.time.localeCompare(b.time)).map((r) => (
              <div key={r.id} className="item item--reminder">
                <button type="button" className="item__body" onClick={() => openSheet({ type: 'reminder', id: r.id })}>
                  <span className="item__time num">{fmtTime(r.time, settings.timeFormat)}</span>
                  <span className="item__text">
                    <span className="item__title">{r.title}</span>
                    <span className="item__meta">{r.repeat === 'none' ? fmtDay(r.date, lang, 'medium') : t.reminder.repeat[r.repeat]}</span>
                  </span>
                </button>
                <Switch checked={r.enabled} onChange={(enabled) => updateReminder(r.id, { enabled })} label={r.title} />
              </div>
            ))}
          </div>
        ) : (
          <p className="quiet">{t.profile.noReminders}</p>
        )}
      </section>

      <section className="section">
        <SectionHead title={t.profile.data} />
        <div className="group">
          <Row label={t.profile.exportJson} hint={t.profile.exportJsonHint} icon={Download} onClick={exportJson} />
          <Row
            label={t.profile.exportCsv}
            hint={t.profile.exportCsvHint}
            icon={FileSpreadsheet}
            onClick={() => save(`dayflow-habits-${today}.csv`, '﻿' + logsToCsv(getData()), 'text/csv;charset=utf-8')}
          />
          <Row label={t.profile.import} hint={t.profile.importHint} icon={Upload} onClick={() => importFromFile(true)} />
          <Row label={t.archive.title} icon={Archive} onClick={() => navigate('archive')}>
            <span className="num">{archived || ''}</span>
            <ChevronRight size={16} aria-hidden />
          </Row>
        </div>
      </section>

      <section className="section">
        <SectionHead title={t.profile.backups} />
        <div className="group">
          <Row
            label={t.profile.backupNow}
            hint={t.profile.backupHint}
            icon={Database}
            onClick={() => {
              toast(saveBackup(getData(), true) ? t.profile.backupSaved : t.profile.backupEmpty)
              setBackups(listBackups())
            }}
          />
          {backups.map((b) => (
            <Row key={b.date} label={fmtDay(b.date, lang, 'long')} hint={t.profile.backupSummary(b.data.habits.length, b.data.tasks.length)} icon={History}>
              <Button
                size="sm"
                onClick={() =>
                  ask({
                    title: t.profile.restoreTitle(fmtDay(b.date, lang, 'long')),
                    body: t.profile.restoreBody,
                    confirmLabel: t.profile.restoreConfirm,
                    onConfirm: () => {
                      const current = getData().settings
                      replaceData({ ...b.data, settings: { ...b.data.settings, avatar: current.avatar } })
                      toast(t.profile.restored)
                    },
                  })
                }
              >
                {t.common.restore}
              </Button>
            </Row>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="group">
          <button
            type="button"
            className={cx('row', 'row--button', 'row--danger')}
            onClick={() =>
              ask({
                title: t.profile.deleteTitle,
                body: t.profile.deleteBody,
                confirmLabel: t.profile.deleteConfirm,
                danger: true,
                onConfirm: () => {
                  resetAll()
                  clearBackups()
                  localStorage.removeItem('dayflow:fired')
                  navigate('today', true)
                },
              })
            }
          >
            <span className="row__main">
              <Trash2 className="row__icon" size={18} strokeWidth={1.75} aria-hidden />
              <span className="row__text">
                <span className="row__label">{t.profile.deleteAll}</span>
                <span className="row__hint">{t.profile.deleteHint}</span>
              </span>
            </span>
          </button>
        </div>
      </section>

      <p className="colophon">Dayflow 1.0 · {t.profile.localOnly}</p>
    </main>
  )
}
