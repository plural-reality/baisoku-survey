import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { SonarLogo } from "./sonar-logo";
import { AuthHeader } from "@/components/auth/auth-header";

interface AppHeaderProps {
  title?: string;
  backHref?: string;
  showLogo?: boolean;
  userEmail?: string | null;
}

export function AppHeader({
  title,
  backHref,
  showLogo = false,
  userEmail,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        )}
        {showLogo && <SonarLogo />}
        {title && (
          <h1 className="text-lg font-bold text-[var(--foreground)] truncate">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        {userEmail ? (
          <AuthHeader email={userEmail} />
        ) : (
          <a
            href="/login"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            ログイン
          </a>
        )}
      </div>
    </header>
  );
}
