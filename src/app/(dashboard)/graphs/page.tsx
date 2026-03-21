import { GraphStudioClient } from './graph-studio-client'

export const metadata = {
  title: 'Graph Studio | Advisory OS',
  description: 'Explore, build, and save custom charts from your financial data.',
}

export default function GraphsPage() {
  return <GraphStudioClient />
}
