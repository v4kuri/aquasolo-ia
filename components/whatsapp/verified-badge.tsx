export function VerifiedBadge({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-label="Conta verificada"
      role="img"
    >
      {/* Selo azul de verificado estilo WhatsApp */}
      <path
        d="M12 1.5l2.35 2.1 3.1-.55 1.1 2.95 2.95 1.1-.55 3.1L23.05 12l-2.1 2.35.55 3.1-2.95 1.1-1.1 2.95-3.1-.55L12 23.05l-2.35-2.1-3.1.55-1.1-2.95-2.95-1.1.55-3.1L.95 12l2.1-2.35-.55-3.1 2.95-1.1 1.1-2.95 3.1.55L12 1.5z"
        fill="#53bdeb"
      />
      <path
        d="M10.6 15.4l-3-3 1.4-1.4 1.6 1.6 4.4-4.4 1.4 1.4-5.8 5.8z"
        fill="#ffffff"
      />
    </svg>
  )
}
