// This page is never rendered — middleware redirects / to /{locale}
// Kept as a safety net only.
import { redirect } from 'next/navigation'
export default function Root() {
    redirect('/en')
}
