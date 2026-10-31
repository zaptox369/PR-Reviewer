import React, { useState } from 'react';
import { 
  Share2, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  ShieldAlert, 
  Server, 
  Cpu, 
  Layers, 
  Zap, 
  ArrowRight,
  Flame,
  RotateCcw
} from 'lucide-react';

interface ShockScenario {
  id: string;
  name: string;
  category: string;
  shockMagnitude: string;
  description: string;
  nodes: {
    id: string;
    label: string;
    type: 'trigger' | 'service' | 'storage' | 'external';
    status: 'critical' | 'warning' | 'nominal';
    impact: string;
    details: string;
  }[];
}

const SCENARIOS: ShockScenario[] = [
  {
    id: 'sqli',
    name: 'Unsanitized Raw SQL Query',
    category: 'Security Injection',
    shockMagnitude: '+85% Blast Risk',
    description: 'Direct string interpolation in auth query permits arbitrary execution across database tenants.',
    nodes: [
      { id: 'pr', label: 'PR #104: Auth Query', type: 'trigger', status: 'critical', impact: 'Direct Cause', details: 'Introduced raw db.$queryRawUnsafe() with string concatenation' },
      { id: 'auth', label: 'Auth Gateway', type: 'service', status: 'critical', impact: '-95% Security', details: 'Session tokens forged; bypasses RBAC permission checks' },
      { id: 'db', label: 'PostgreSQL Primary', type: 'storage', status: 'critical', impact: 'Critical Leak', details: 'Full schema read access; potential table drop injection' },
      { id: 'billing', label: 'Stripe Webhook', type: 'external', status: 'nominal', impact: 'Isolated', details: 'Webhook signatures verify independently' },
      { id: 'cache', label: 'Redis Session Store', type: 'storage', status: 'warning', impact: 'Stale Sessions', details: 'Poisoned auth tokens cached for 24h TTL' },
    ],
  },
  {
    id: 'race',
    name: 'Concurrent Ledger Race Condition',
    category: 'Concurrency Shock',
    shockMagnitude: '+62% Blast Risk',
    description: 'Missing optimistic lock on credit balances allows double-spend under high load.',
    nodes: [
      { id: 'pr', label: 'PR #112: Wallet Deduct', type: 'trigger', status: 'critical', impact: 'Direct Cause', details: 'Removed SELECT FOR UPDATE lock during async refactor' },
      { id: 'auth', label: 'Checkout API', type: 'service', status: 'warning', impact: 'Latency Spike', details: 'Retrying deadlocked transactions elevates CPU by 40%' },
      { id: 'db', label: 'PostgreSQL Ledger', type: 'storage', status: 'critical', impact: 'Data Drift', details: 'Negative balance anomalies detected in test benchmark' },
      { id: 'billing', label: 'Payment Gateway', type: 'external', status: 'warning', impact: 'Duplicate Captures', details: 'Double charge calls sent to payment provider' },
      { id: 'cache', label: 'Redis Rate Limiter', type: 'storage', status: 'nominal', impact: 'Normal', details: 'Sliding window counters operate as expected' },
    ],
  },
  {
    id: 'schema',
    name: 'Breaking Schema Column Drop',
    category: 'Architecture Shock',
    shockMagnitude: '+45% Blast Risk',
    description: 'Renamed legacy foreign key without backward-compatible dual-write migration.',
    nodes: [
      { id: 'pr', label: 'PR #98: Rename OrgId', type: 'trigger', status: 'critical', impact: 'Direct Cause', details: 'Dropped organization_id in favor of tenant_id' },
      { id: 'auth', label: 'Mobile GraphQL API', type: 'service', status: 'critical', impact: '500 Crashes', details: 'Old iOS/Android clients crash requesting deprecated field' },
      { id: 'db', label: 'Database Replica', type: 'storage', status: 'nominal', impact: 'Synced', details: 'Replication lag remains nominal at 12ms' },
      { id: 'billing', label: 'Reporting Pipeline', type: 'external', status: 'warning', impact: 'Job Failure', details: 'Nightly ETL pipeline fails due to missing column' },
      { id: 'cache', label: 'Redis Cache', type: 'storage', status: 'warning', impact: 'Key Invalidation', details: 'Cache serialization errors spike across clusters' },
    ],
  },
];

export const BlastRadiusView: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('sqli');
  const [activeNodeId, setActiveNodeId] = useState<string>('auth');

  const currentScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];
  const activeNode = currentScenario.nodes.find((n) => n.id === activeNodeId) || currentScenario.nodes[0];

  return (
    <div className="space-y-4 slide-up">
      {/* Scenario Selection Control Strip */}
      <div className="surface p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ice/60 uppercase tracking-wider mr-2">
            Simulate shock scenario:
          </span>
          {SCENARIOS.map((s) => {
            const isSelected = selectedScenarioId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedScenarioId(s.id);
                  setActiveNodeId(s.nodes[1].id);
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-white text-ink shadow-md font-bold'
                    : 'bg-white/5 text-ice/80 border border-line hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{s.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-ink/10 text-ink' : 'bg-white/10 text-ice/70'
                }`}>
                  {s.category}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-ember/15 border border-ember/30 text-ember text-xs font-bold flex items-center gap-2 shrink-0">
          <Flame size={14} />
          {currentScenario.shockMagnitude}
        </div>
      </div>

      {/* Main Interactive Map & Node Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive SVG Topology Map */}
        <div className="lg:col-span-8 surface p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-ice/70 uppercase tracking-wider flex items-center gap-2">
              <Share2 size={14} className="text-ice" />
              Service Dependency Graph
            </span>
            <span className="text-xs text-ice/50 font-mono">
              Click node to inspect blast impact
            </span>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="relative py-8 flex items-center justify-center">
            <svg viewBox="0 0 700 280" className="w-full h-auto select-none">
              <defs>
                <linearGradient id="gradUltra" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a2fd4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ff5a2c" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Connecting animated paths */}
              <path
                d="M 120 140 Q 230 80 340 90"
                fill="none"
                stroke={currentScenario.nodes[1].status === 'critical' ? '#ff5a2c' : '#1a2fd4'}
                strokeWidth="2.5"
                strokeDasharray="4 4"
                className="opacity-75"
              />
              <path
                d="M 120 140 Q 230 200 340 190"
                fill="none"
                stroke={currentScenario.nodes[4].status === 'critical' ? '#ff5a2c' : '#3dd8b2'}
                strokeWidth="2"
                strokeDasharray="4 4"
                className="opacity-60"
              />
              <path
                d="M 340 90 L 560 90"
                fill="none"
                stroke={currentScenario.nodes[2].status === 'critical' ? '#ff5a2c' : '#1a2fd4'}
                strokeWidth="2.5"
                strokeDasharray="4 4"
                className="opacity-75"
              />
              <path
                d="M 340 90 Q 450 140 560 200"
                fill="none"
                stroke={currentScenario.nodes[3].status === 'critical' ? '#ff5a2c' : 'rgba(255, 255, 255, 0.2)'}
                strokeWidth="2"
                className="opacity-50"
              />

              {/* Node 1: Trigger PR */}
              <g 
                onClick={() => setActiveNodeId(currentScenario.nodes[0].id)} 
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <circle cx="120" cy="140" r="32" fill="#050507" stroke="#ff5a2c" strokeWidth="2.5" />
                <circle cx="120" cy="140" r="38" fill="none" stroke="#ff5a2c" strokeWidth="1" className="orb-ring" />
                <text x="120" y="137" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">PR DIFF</text>
                <text x="120" y="151" textAnchor="middle" fill="#ff5a2c" fontSize="9" fontWeight="600">TRIGGER</text>
              </g>

              {/* Node 2: Service / Gateway */}
              <g 
                onClick={() => setActiveNodeId(currentScenario.nodes[1].id)} 
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <circle 
                  cx="340" 
                  cy="90" 
                  r="30" 
                  fill="#050507" 
                  stroke={currentScenario.nodes[1].status === 'critical' ? '#ff5a2c' : '#1a2fd4'} 
                  strokeWidth="2.5" 
                />
                <text x="340" y="87" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">GATEWAY</text>
                <text 
                  x="340" 
                  y="101" 
                  textAnchor="middle" 
                  fill={currentScenario.nodes[1].status === 'critical' ? '#ff5a2c' : '#d4d4d8'} 
                  fontSize="8" 
                  fontWeight="600"
                >
                  {currentScenario.nodes[1].status.toUpperCase()}
                </text>
              </g>

              {/* Node 3: Database */}
              <g 
                onClick={() => setActiveNodeId(currentScenario.nodes[2].id)} 
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <circle 
                  cx="560" 
                  cy="90" 
                  r="30" 
                  fill="#050507" 
                  stroke={currentScenario.nodes[2].status === 'critical' ? '#ff5a2c' : '#3dd8b2'} 
                  strokeWidth="2.5" 
                />
                <text x="560" y="87" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">DATABASE</text>
                <text 
                  x="560" 
                  y="101" 
                  textAnchor="middle" 
                  fill={currentScenario.nodes[2].status === 'critical' ? '#ff5a2c' : '#3dd8b2'} 
                  fontSize="8" 
                  fontWeight="600"
                >
                  {currentScenario.nodes[2].status.toUpperCase()}
                </text>
              </g>

              {/* Node 4: Cache */}
              <g 
                onClick={() => setActiveNodeId(currentScenario.nodes[4].id)} 
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <circle 
                  cx="340" 
                  cy="190" 
                  r="28" 
                  fill="#050507" 
                  stroke={currentScenario.nodes[4].status === 'warning' ? '#f59e0b' : '#3dd8b2'} 
                  strokeWidth="2" 
                />
                <text x="340" y="188" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="600">REDIS</text>
                <text x="340" y="200" textAnchor="middle" fill="#d4d4d8" fontSize="8">CACHE</text>
              </g>

              {/* Node 5: External API */}
              <g 
                onClick={() => setActiveNodeId(currentScenario.nodes[3].id)} 
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <circle 
                  cx="560" 
                  cy="200" 
                  r="28" 
                  fill="#050507" 
                  stroke={currentScenario.nodes[3].status === 'warning' ? '#f59e0b' : '#3dd8b2'} 
                  strokeWidth="2" 
                />
                <text x="560" y="198" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="600">EXTERNAL</text>
                <text x="560" y="210" textAnchor="middle" fill="#d4d4d8" fontSize="8">WEBHOOK</text>
              </g>
            </svg>
          </div>

          {/* Quick Nodes Navigation Bar */}
          <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ice/60 font-medium">Nodes in path:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {currentScenario.nodes.map((node) => {
                const isActive = activeNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveNodeId(node.id)}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                      isActive
                        ? 'bg-white text-ink font-bold'
                        : 'bg-ink border border-line text-ice/70 hover:text-white'
                    }`}
                  >
                    {node.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Node Blast Radius Card */}
        <div className="lg:col-span-4 surface p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <span className="text-xs font-bold text-ice/60 uppercase tracking-widest">
                Target Node Telemetry
              </span>
              <span className={`badge uppercase text-[10px] ${
                activeNode.status === 'critical' ? 'risk-high' : activeNode.status === 'warning' ? 'risk-medium' : 'risk-low'
              }`}>
                {activeNode.status}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <h3 className="head text-xl text-white">{activeNode.label}</h3>
              <div className="p-3 rounded-xl bg-ink/70 border border-line">
                <div className="text-[11px] font-bold uppercase text-ice/60 mb-1">
                  Expected Impact
                </div>
                <div className={`text-base font-bold font-mono ${
                  activeNode.status === 'critical' ? 'text-ember' : activeNode.status === 'warning' ? 'text-amber' : 'text-mint'
                }`}>
                  {activeNode.impact}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-ice/80 block mb-1">
                  Impact Analysis
                </span>
                <p className="text-xs text-ice/85 leading-relaxed">
                  {activeNode.details}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-ink/40 border border-line space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-ice/70">
                  <span>Regression Probability</span>
                  <span className="font-mono font-semibold text-white">
                    {activeNode.status === 'critical' ? '92%' : activeNode.status === 'warning' ? '48%' : '3%'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-ice/70">
                  <span>Downstream Dependents</span>
                  <span className="font-mono font-semibold text-white">7 services</span>
                </div>
                <div className="flex items-center justify-between text-ice/70">
                  <span>Rollback Complexity</span>
                  <span className="font-mono font-semibold text-white">
                    {activeNode.status === 'critical' ? 'High (DB stateful)' : 'Low'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line">
            <button
              type="button"
              onClick={() => alert(`Pre-merge guardrail simulated for ${activeNode.label}. Safeguard policy generated.`)}
              className="w-full btn-primary text-xs py-2.5 justify-center font-bold"
            >
              Generate Guardrail Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
