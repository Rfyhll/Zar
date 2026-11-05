'use client'

/**
 * Error boundary paling luar — dipakai bila error terjadi sebelum layout app
 * sempat dirender. Wajib menyertakan <html> dan <body> sendiri.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', background: '#ecfdf5', padding: 24, textAlign: 'center' }}>
          <div style={{ maxWidth: 360 }}>
            <div style={{ fontSize: 44 }}>🌱</div>
            <h1 style={{ color: '#022c22', fontSize: 20, margin: '12px 0 8px' }}>Ada kendala kecil di EcoDaur</h1>
            <p style={{ color: '#059669', fontSize: 14, lineHeight: 1.6 }}>
              Tenang, datamu aman. Muat ulang halaman untuk melanjutkan.
            </p>
            <button
              onClick={reset}
              style={{ marginTop: 16, height: 44, padding: '0 32px', borderRadius: 999, background: '#059669', color: 'white', fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer' }}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
