import { SyncPanel } from "@/components/admin/sync-panel";

export const dynamic = "force-dynamic";

/**
 * Admin product sync page. Renders the sync trigger panel.
 */
export default async function AdminSyncPage() {
  return <SyncPanel />;
}
