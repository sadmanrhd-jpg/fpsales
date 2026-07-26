import { Inbox } from 'lucide-react'

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Inbox size={24} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
