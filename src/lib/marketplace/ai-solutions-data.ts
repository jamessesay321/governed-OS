/* AI Solutions — audit results, integration packages, governance packages */

export interface AuditTool {
  name: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
  governanceGap: string;
}

export interface AuditResult {
  toolsDetected: AuditTool[];
  governanceScore: number;
  risks: string[];
  recommendations: string[];
}

export interface IntegrationPackage {
  id: string;
  name: string;
  description: string;
  toolsIncluded: string[];
  timeline: string;
  deliverables: string[];
  price: number;
  popular: boolean;
}

export interface AIPackage {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  recommended: boolean;
}

export function getMockAuditResult(): AuditResult {
  return {
    toolsDetected: [
      { name: 'Canva AI', category: 'Design', riskLevel: 'low', governanceGap: 'No data governance policy for generated assets' },
      { name: 'ChatGPT', category: 'Productivity', riskLevel: 'medium', governanceGap: 'Sensitive business data may be shared in prompts' },
      { name: 'Midjourney', category: 'Design', riskLevel: 'low', governanceGap: 'Image IP ownership unclear' },
      { name: 'Instagram AI', category: 'Marketing', riskLevel: 'medium', governanceGap: 'Automated content lacks brand governance review' },
      { name: 'Google Analytics', category: 'Analytics', riskLevel: 'low', governanceGap: 'Cookie consent may not meet latest ICO guidance' },
      { name: 'Shopify AI', category: 'E-commerce', riskLevel: 'medium', governanceGap: 'Product recommendations use customer data without explicit consent' },
    ],
    governanceScore: 45,
    risks: [
      'Business data scattered across 6 AI tools with no single source of truth',
      'No unified audit trail for AI-generated decisions',
      'Compliance gaps in data sharing between tools',
    ],
    recommendations: [
      'Consolidate AI operations through Governed OS for unified governance',
      'Implement data classification policy for AI tool inputs',
      'Add governance layer for AI-generated marketing content',
      'Review cookie consent implementation against ICO guidance',
    ],
  };
}

export function getIntegrationPackages(): IntegrationPackage[] {
  return [
    { id: 'basic', name: 'Basic', description: 'Connect Xero and one additional tool with governance setup.', toolsIncluded: ['Xero', '+1 tool'], timeline: '1-2 weeks', deliverables: ['Data mapping', 'Governance policy', 'Integration testing', 'Go-live support'], price: 19900, popular: false },
    { id: 'standard', name: 'Standard', description: 'Connect Xero and up to 3 tools with full governance framework.', toolsIncluded: ['Xero', '+3 tools'], timeline: '2-3 weeks', deliverables: ['Full data audit', 'Governance framework', 'Staff training', 'Monthly review (3 months)'], price: 49900, popular: true },
    { id: 'premium', name: 'Premium', description: 'Complete technology stack migration with dedicated support.', toolsIncluded: ['Full stack'], timeline: '4-6 weeks', deliverables: ['Technology audit', 'Migration plan', 'Full integration', 'Quarterly reviews (12 months)'], price: 99900, popular: false },
    { id: 'enterprise', name: 'Enterprise', description: 'Custom integration programme tailored to your business.', toolsIncluded: ['Custom'], timeline: 'Bespoke', deliverables: ['Discovery workshop', 'Custom architecture', 'Phased rollout', 'Dedicated account manager'], price: 0, popular: false },
  ];
}

export function getAIPackages(): AIPackage[] {
  return [
    { id: 'startup', name: 'Startup Governance Pack', description: 'Essential AI compliance and monitoring for early-stage businesses.', monthlyPrice: 14900, features: ['AI usage monitoring', 'Basic compliance checks', 'Monthly governance report', 'Email support'], recommended: false },
    { id: 'growth', name: 'Growth Governance Pack', description: 'Full stack audit with monthly reviews for scaling businesses.', monthlyPrice: 34900, features: ['Full AI stack audit', 'Monthly governance reviews', 'Compliance dashboard', 'Staff AI training', 'Priority support'], recommended: true },
    { id: 'enterprise', name: 'Enterprise Governance Pack', description: 'Dedicated governance officer with custom policies.', monthlyPrice: 69900, features: ['Dedicated governance officer', 'Custom AI policies', 'Board-level reporting', 'Incident response plan', 'Quarterly strategy sessions', '24/7 support'], recommended: false },
  ];
}
