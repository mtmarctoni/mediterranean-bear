import type { Metadata } from "next";

/**
 * Layout for auth pages (sign-in, sign-up, account). Renders children in a
 * centered column with the brand accent. Kept minimal so the forms stay the
 * focus.
 */
export const metadata: Metadata = {
  title: "Account | Mediterranean Bear",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12">
      {children}
    </div>
  );
}
