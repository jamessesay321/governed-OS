/**
 * Demo Data Generator
 * Generates realistic business profile data for demo mode using AI.
 * Falls back to industry templates if the LLM call fails.
 */

interface DemoProfile {
  description: string;
  goals: string;
  challenges: string;
}

const INDUSTRY_TEMPLATES: Record<string, DemoProfile> = {
  'technology': {
    description: 'A growing technology company building software solutions for businesses. We focus on delivering reliable, user-friendly products that help our customers work more efficiently.',
    goals: 'Scale to 100 paying customers this quarter, improve product retention to 90%, and prepare for our first funding round.',
    challenges: 'Managing cash burn while growing, hiring senior engineers in a competitive market, and balancing feature development with technical debt.',
  },
  'retail': {
    description: 'An established retail business selling quality products both online and through our physical stores. We pride ourselves on great customer service and carefully curated inventory.',
    goals: 'Grow online sales by 30% this year, expand to two new locations, and improve inventory turnover by 15%.',
    challenges: 'Rising supplier costs, increasing competition from online-only retailers, and managing seasonal cash flow fluctuations.',
  },
  'professional-services': {
    description: 'A professional services firm delivering expert consulting and advisory work to mid-market businesses. Our team brings deep industry knowledge and a hands-on approach.',
    goals: 'Increase average project value by 20%, build recurring revenue streams, and expand into two new service areas.',
    challenges: 'Client concentration risk, recruiting and retaining top talent, and managing utilisation rates across the team.',
  },
  'hospitality': {
    description: 'A hospitality business focused on creating memorable experiences for our guests. We combine great food, atmosphere, and service to build a loyal customer base.',
    goals: 'Increase average spend per customer, launch a catering arm, and improve our online reviews to 4.8 stars average.',
    challenges: 'Staff retention in a competitive market, managing food costs with rising supplier prices, and seasonal demand variability.',
  },
  'healthcare': {
    description: 'A healthcare provider committed to delivering high-quality patient care. We combine clinical excellence with a compassionate, patient-first approach.',
    goals: 'Expand our service offering, reduce patient wait times by 25%, and achieve CQC outstanding rating.',
    challenges: 'Regulatory compliance costs, recruiting specialist clinicians, and managing the transition to digital patient records.',
  },
  'creative-agency': {
    description: 'A creative agency helping brands tell their stories through design, digital, and marketing. We work with ambitious businesses who want to stand out in their market.',
    goals: 'Win 5 new retainer clients, launch our own product line, and grow the team to 15 people by year end.',
    challenges: 'Scope creep on projects, feast-or-famine revenue cycles, and keeping up with rapidly changing digital platforms.',
  },
  'construction': {
    description: 'A construction and building services company delivering quality projects on time and on budget. We specialise in commercial fit-outs and residential developments.',
    goals: 'Grow revenue to £2M, achieve a 15% net margin, and reduce project overruns to under 5% of jobs.',
    challenges: 'Material cost inflation, subcontractor availability, and managing cash flow across multiple concurrent projects.',
  },
  'fashion': {
    description: 'A fashion brand creating distinctive pieces that blend craftsmanship with contemporary design. We sell through our own channels and select retail partners.',
    goals: 'Launch our international e-commerce store, grow wholesale partnerships by 40%, and improve gross margins to 70%.',
    challenges: 'Seasonal inventory management, building brand awareness in a crowded market, and managing the complexity of multi-channel sales.',
  },
  'education': {
    description: 'An education and training provider helping individuals and organisations develop new skills. We offer both in-person and online learning experiences.',
    goals: 'Double our online course enrolments, achieve 95% learner satisfaction, and build corporate training partnerships.',
    challenges: 'Competition from free online platforms, keeping content current, and maintaining engagement in hybrid learning formats.',
  },
};

export async function generateDemoProfile(
  companyName: string,
  industry: string,
  teamSize: string,
): Promise<DemoProfile> {
  try {
    const { callLLM } = await import('@/lib/ai/llm');

    const result = await callLLM({
      systemPrompt: `You generate realistic business profile data for demo purposes. Return ONLY a JSON object with three fields: "description" (2-3 sentences about the company), "goals" (2-3 key business goals), "challenges" (2-3 current challenges). Use plain English, warm and professional tone. No em dashes. No jargon. The company is called "${companyName}" in the ${industry} industry with ${teamSize} employees.`,
      userMessage: `Generate a realistic business profile for ${companyName}, a ${industry} company with ${teamSize} employees. Return only the JSON object.`,
      temperature: 0.7,
    });

    // Try to parse the JSON from the LLM response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.description && parsed.goals && parsed.challenges) {
        return {
          description: String(parsed.description).slice(0, 500),
          goals: String(parsed.goals).slice(0, 500),
          challenges: String(parsed.challenges).slice(0, 500),
        };
      }
    }
  } catch (err) {
    console.error('[DEMO] LLM generation failed, using template:', err);
  }

  // Fallback to industry template
  const template = INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES['technology'];
  return {
    description: template.description.replace(/A /, `${companyName} is a `),
    goals: template.goals,
    challenges: template.challenges,
  };
}
