interface FooterProps {
  onSignOut: () => void;
  label?: string;
}

export function Footer({ onSignOut, label = "Sign out" }: FooterProps) {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50 py-6">
      <div className="mx-auto max-w-5xl px-6 flex items-center justify-between text-xs text-gray-500">
        <span>DCI Learning Academy</span>
        <button
          type="button"
          onClick={onSignOut}
          className="text-gray-600 hover:text-[#2A7F6F] underline underline-offset-4 transition-colors"
        >
          {label}
        </button>
      </div>
    </footer>
  );
}
