import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'

export function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist in this offline workspace."
        action={
          <Link to="/" className="btn btn-primary">
            Return to dashboard
          </Link>
        }
      />
    </div>
  )
}
