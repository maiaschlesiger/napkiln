// iPhone-style shell on desktop; full-viewport on mobile (media query in styles.css).
export default function DeviceFrame({ children }) {
  return (
    <div className="nk-device" data-screen-label="10a napkiln — full app prototype">
      {children}
      <div className="nk-chrome">
        <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 36px', zIndex: 40, pointerEvents: 'none' }}>
          <span style={{ font: '590 16px -apple-system,system-ui,sans-serif', color: '#000' }}>9:41</span>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 18, height: 11, borderRadius: 2, background: '#000' }} />
            <span style={{ width: 15, height: 11, borderRadius: 2, background: '#000', opacity: .8 }} />
            <span style={{ width: 24, height: 12, borderRadius: 4, border: '1px solid rgba(0,0,0,.4)', position: 'relative' }}>
              <span style={{ position: 'absolute', inset: 2, background: '#000', borderRadius: 2 }} />
            </span>
          </span>
        </div>
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,.25)', zIndex: 60 }} />
      </div>
    </div>
  );
}
