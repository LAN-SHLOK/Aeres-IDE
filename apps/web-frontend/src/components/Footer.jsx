export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="flex flex-col items-center justify-between gap-4 border-t border-aether-border px-6 py-8 font-body text-sm text-aether-muted md:flex-row md:px-10">
       <span>© {year} Aether IDE. All rights reserved.</span>
      <span className="text-center text-xs text-aether-border md:text-right">
        Aether IDE — Code at the speed of thought.
      </span>
    </footer>
  )
}
