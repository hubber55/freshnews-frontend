import { createAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronLeft, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const supabase = createAdminClient()

  // Fetch event submissions
  const { data: events, error } = await supabase
    .from('submissions')
    .select(`
      *,
      wa_users (name, whatsapp_number)
    `)
    .eq('type', 'event')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-xl bg-[#90ee90]/10 p-3">
          <Calendar size={24} className="text-[#90ee90]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Events</h1>
          <p className="text-[var(--text-muted)] text-sm">Approve and track upcoming community events.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#161b22]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#21262d] text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Submitted By</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {events?.map((item: any) => (
              <tr key={item.id} className="hover:bg-[#21262d]/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-white">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 text-[var(--text-muted)]">
                  <div>{item.wa_users?.name || 'Anonymous'}</div>
                  <div className="text-xs">{item.wa_users?.whatsapp_number}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                    ${item.status === 'approved' ? 'bg-green-500/10 text-green-400' : 
                      item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 
                      'bg-red-500/10 text-red-400'}
                  `}>
                    {item.status === 'approved' ? <CheckCircle size={12} /> : 
                     item.status === 'pending' ? <Clock size={12} /> : 
                     <XCircle size={12} />}
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/admin/pending/${item.id}`}
                    className="text-[#90ee90] hover:underline font-semibold"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
            {(!events || events.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
