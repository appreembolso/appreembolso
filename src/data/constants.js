export const SAMPLE_DATA = {
  companies: [
    { id: 'comp_1', name: 'Tech Solutions', logoMain: 'TS', logoSub: 'Tech', color: 'text-blue-600', logoUrl: null },
    { id: 'comp_2', name: 'Green Energy', logoMain: 'GE', logoSub: 'Green', color: 'text-emerald-600', logoUrl: null }
  ],
  costCenters: [
    { id: 'cc_1', name: 'Administrativo' },
    { id: 'cc_2', name: 'Comercial' },
    { id: 'cc_3', name: 'Operacional' },
    { id: 'cc_4', name: 'TI' }
  ],
  expenseCategories: [
    { id: 'cat_1', name: 'Alimentação' },
    { id: 'cat_2', name: 'Transporte' },
    { id: 'cat_3', name: 'Hospedagem' },
    { id: 'cat_4', name: 'Material de Escritório' },
    { id: 'cat_5', name: 'Outros' }
  ],
  app_users: [
    { id: 'admin_user', name: 'Admin User', email: 'appreembolso@gmail.com', role: 'admin', allowedCompanies: ['comp_1', 'comp_2'] },
    { id: 'user_1', name: 'João Silva', email: 'joao@empresa.com', role: 'user', allowedCompanies: ['comp_1'] },
    { id: 'user_2', name: 'Maria Souza', email: 'maria@empresa.com', role: 'user', allowedCompanies: ['comp_2'] }
  ]
};

export const DEFAULT_COMPANIES = [
  { id: 'default', name: 'Minha Empresa', logoMain: 'ME', logoSub: '', color: 'text-slate-700', logoUrl: null }
];

export const PAGE_TITLES = {
  dashboard: 'Dashboard Financeiro',
  active_expenses: 'Lançamento de Despesas',
  substitutes: 'Despesas Substitutas',
  generated_reports: 'Relatórios Gerados',
  submitted_reports: 'Relatórios Enviados',
  expense_repository: 'Repositório de Despesas',
  reconciliation: 'Conciliação Bancária',
  bank_statement: 'Extrato Bancário',
  management: 'Configurações do Sistema'
};

export const COMPANY_COLORS = [
  { label: 'Azul', value: 'text-blue-600' },
  { label: 'Verde Esmeralda', value: 'text-emerald-600' },
  { label: 'Verde Escuro', value: 'text-green-800' },   // <--- NOVO
  { label: 'Verde Oliva', value: 'text-lime-700' },     // <--- NOVO
  { label: 'Roxo', value: 'text-purple-600' },
  { label: 'Laranja', value: 'text-orange-600' },
  { label: 'Amarelo Escuro', value: 'text-amber-600' }, // <--- NOVO
  { label: 'Vermelho', value: 'text-red-600' },         // <--- NOVO
  { label: 'Cinza', value: 'text-slate-600' },
  { label: 'Preto', value: 'text-black' },
];