import { GraphStudioClient } from './graph-studio-client'

export const metadata = {
  title: 'Graph Studio | Grove',
  description: 'Explore, build, and save custom charts from your financial data',
}

export default function GraphsPage() {
  return <GraphStudioClient />
}
