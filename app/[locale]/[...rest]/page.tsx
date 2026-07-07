import {notFound} from 'next/navigation';

// Catch-all for unmatched localized routes so they render the
// localized not-found page instead of the framework default.
export default function CatchAllPage() {
  notFound();
}
