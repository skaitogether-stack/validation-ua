'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Запрошення до кімнати: QR-код для тих, хто поруч, і посилання для месенджерів

export function roomUrl(code: string) {
  return `${window.location.origin}/games/mafia/room/${code}`
}

export function InvitePanel({ code, compact = false }: { code: string; compact?: boolean }) {
  const url = roomUrl(code)
  const text = `Приєднуйся до гри «Мафія»! Код кімнати: ${code}`
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(!compact)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: 'M' })
      .then(data => {
        if (!cancelled) setQr(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Скопіюйте посилання:', url)
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const share = async () => {
    try {
      await navigator.share({ title: 'Гра «Мафія»', text, url })
    } catch {
      // користувач закрив вікно «Поділитися»
    }
  }

  const encoded = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)
  const links = [
    { label: 'Telegram', href: `https://t.me/share/url?url=${encoded}&text=${encodedText}`, color: 'bg-sky-500' },
    { label: 'Viber', href: `viber://forward?text=${encodeURIComponent(`${text} ${url}`)}`, color: 'bg-violet-600' },
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, color: 'bg-emerald-500' }
  ]

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-12 w-full rounded-2xl border-2 border-dashed border-indigo-200 px-4 text-sm font-bold text-indigo-700"
      >
        ➕ Запросити гравців · код {code}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="text-center">
        <div className="text-sm font-semibold text-indigo-900/70">Код кімнати</div>
        <div className="font-mono text-4xl font-extrabold tracking-[0.3em] text-indigo-900">{code}</div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR-код для входу в кімнату ${code}`} className="h-48 w-48 rounded-xl bg-white p-2" />
        ) : (
          <div className="h-48 w-48 rounded-xl bg-white" />
        )}
        <p className="text-center text-xs text-indigo-900/70">Друзі поруч? Хай наведуть камеру телефона на QR-код.</p>
      </div>

      <div className="flex flex-col gap-2">
        {canShare && (
          <button type="button" onClick={share} className="min-h-12 rounded-2xl bg-indigo-600 px-4 font-bold text-white">
            📤 Поділитися запрошенням
          </button>
        )}
        <button type="button" onClick={copy} className="min-h-12 rounded-2xl border border-indigo-200 bg-white px-4 font-bold text-indigo-700">
          {copied ? '✅ Посилання скопійовано' : '🔗 Копіювати посилання'}
        </button>
        <div className="grid grid-cols-3 gap-2">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-bold text-white ${l.color}`}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
      <p className="break-all text-center text-xs text-indigo-900/60">{url}</p>
      {compact && (
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-indigo-700 underline">
          Згорнути
        </button>
      )}
    </div>
  )
}
