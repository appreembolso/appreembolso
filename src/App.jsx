import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { auth, db, storage, appId, initializeApp, getApp, getApps, deleteApp, getAuth } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, writeBatch, updateDoc, deleteDoc, setDoc, addDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { generateUUID, parseCurrency, safePromise } from './utils/helpers'; 
import { SAMPLE_DATA } from './data/constants';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ExpenseModal from './components/ExpenseModal';
import ReportPrintModal from './components/ReportPrintModal';
import ManagementModal from './components/ManagementModal';
import AuditReportModal from './components/AuditReportModal';
import { ConfirmModal, EditReportIdModal } from './components/ConfirmModal';

const DashboardPage = React.lazy(() => import('./components/DashboardPage'));
const ExpensesPage = React.lazy(() => import('./components/ExpensesPage'));
const GeneratedReportsPage = React.lazy(() => import('./components/GeneratedReportsPage'));
const SubmittedReportsPage = React.lazy(() => import('./components/SubmittedReportsPage'));
const RepositoryPage = React.lazy(() => import('./components/RepositoryPage')); 
const ReconciliationPage = React.lazy(() => import('./components/ReconciliationPage'));
const BankStatementPage = React.lazy(() => import('./components/BankStatementPage'));
const ManagementPage = React.lazy(() => import('./components/ManagementPage'));

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Erro capturado:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-red-50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center border border-red-200">
            <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Erro Inesperado</h2>
            <p className="text-sm text-red-600 mb-4">{this.state.error?.message || 'Ocorreu um erro.'}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition cursor-pointer">Recarregar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const { expenses, costCenters, categories, appUsers, companies, currentCompany, setCurrentCompany, availableCompanies, loading: dataLoading } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubstituteForm, setIsSubstituteForm] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [editReportModal, setEditReportModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [auditModal, setAuditModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); 
  const [viewReport, setViewReport] = useState(null);
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [managementType, setManagementType] = useState(null);
  const [managementItem, setManagementItem] = useState(null);
  
  useEffect(() => { setSelectedExpenses([]); }, [activeTab, currentCompany?.id]);

  const filteredCostCenters = useMemo(() => {
    if (!costCenters) return [];
    if (!currentCompany) return costCenters; 
    return costCenters.filter(cc => {
        const isGlobal = !cc.companyId || cc.companyId === "";
        const isForCurrentCompany = cc.companyId === currentCompany.id;
        return isGlobal || isForCurrentCompany;
    });
  }, [costCenters, currentCompany]);

  const handleLogin = useCallback(async (email, password) => { 
    try { await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password); } 
    catch (e) { 
      if (email === 'appreembolso@gmail.com' && (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential')) { 
        try { await createUserWithEmailAndPassword(auth, email, password); alert("Conta Admin criada!"); } 
        catch(err) { alert("Erro fatal: " + err.message); } 
      } else { alert("Erro no login: " + e.message); } 
    } 
  }, []);

  const handleLogout = useCallback(async () => { try { await signOut(auth); } catch (error) { console.error(error); } }, []);
  
  const handleSeedData = useCallback(async () => { 
    if (!confirm("Adicionar dados de exemplo?")) return; 
    setIsProcessing(true); setMessage("Inserindo dados..."); 
    try { 
      const batch = writeBatch(db); 
      SAMPLE_DATA.companies.forEach(c => batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'companies')), c)); 
      SAMPLE_DATA.costCenters.forEach(c => batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'costCenters')), c)); 
      SAMPLE_DATA.expenseCategories.forEach(c => batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenseCategories')), c)); 
      SAMPLE_DATA.app_users.forEach(u => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', u.email.replace(/[^a-zA-Z0-9]/g, '_')), { ...u, id: u.email.replace(/[^a-zA-Z0-9]/g, '_') })); 
      await batch.commit(); setMessage("Dados inseridos!"); setTimeout(() => setMessage(''), 3000); 
    } catch (err) { alert("Erro: " + err.message); } finally { setIsProcessing(false); } 
  }, []);
  
  // --- ATUALIZAÇÃO IMPORTANTE NA FUNÇÃO SAVE ---
  const handleSave = useCallback(async (data, file, id) => { 
    if (!currentUser) { alert("Erro: Sem usuário."); return; } 
    
    // 1. Verificação de Duplicidade
    const normalize = (val) => val ? String(val).replace(/\D/g, '') : '';
    const newCnpj = normalize(data.supplierDocument);
    const newNumber = normalize(data.receiptNumber);

    if (newCnpj && newNumber) {
        const isDuplicate = expenses.some(existingItem => {
            // Ignora se for o item que está sendo editado
            if (id && existingItem.id === id) return false;
            // Verifica apenas na empresa atual
            if (existingItem.companyId !== currentCompany.id) return false;
            
            const existingCnpj = normalize(existingItem.supplierDocument);
            const existingNumber = normalize(existingItem.receiptNumber);

            return existingCnpj === newCnpj && existingNumber === newNumber;
        });

        if (isDuplicate) {
            alert(`BLOQUEADO: Despesa em Duplicidade!\n\nJá existe um lançamento para o Fornecedor (CNPJ final ${newCnpj.slice(-4)}) com a Nota Fiscal Nº ${data.receiptNumber}.`);
            
            // --- CORREÇÃO DO TRAVAMENTO ---
            // Lançamos um erro intencional para que o Modal saiba que o processo falhou
            // e pare o spinner de "Salvando", liberando os botões.
            throw new Error("CANCEL_DUPLICATE"); 
        }
    }

    setShowForm(false); setMessage("Salvando..."); 
    
    try { 
      let attachmentUrl = id && expenseToEdit?.attachmentUrl ? expenseToEdit.attachmentUrl : null; 
      if (file) { 
        try { 
          const fileRef = ref(storage, `receipts/${currentUser.uid}/${generateUUID()}.${file.name.split('.').pop()}`); 
          const uploadTask = uploadBytes(fileRef, file); 
          await Promise.race([uploadTask, new Promise((_, r) => setTimeout(() => r('TIMEOUT'), 4000))]); 
          attachmentUrl = await getDownloadURL(fileRef); 
        } catch (err) { } 
      } 
      const cleanData = { ...data }; 
      if (!isSubstituteForm) delete cleanData.substituteType; 
      const payload = { userId: currentUser.uid, ...cleanData, attachmentUrl, value: parseCurrency(data.value), date: Timestamp.fromDate(new Date(data.date + 'T12:00:00')), status: isSubstituteForm ? 'Substitute' : 'Active', companyId: currentCompany.id, isPaid: false }; 
      const col = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'expenses'); 
      const dbTask = id ? updateDoc(doc(col, id), payload) : addDoc(col, payload); 
      await safePromise(dbTask); 
      setMessage("Salvo!"); setTimeout(() => setMessage(''), 3000); 
    } catch (e) { 
        console.error(e);
        alert("Erro ao salvar: " + e.message); 
        throw e; // Repassa erro para o modal destravar também em caso de falha real
    } 
  }, [currentUser, expenseToEdit, isSubstituteForm, currentCompany, expenses]); 
  
  const handleSaveManagement = useCallback(async (type, data, id, file) => { 
    setMessage("Processando..."); 
    try { 
      if (file) { 
        try { 
          const folder = type === 'app_users' ? 'user_photos' : 'company_logos'; 
          const fileExtension = file.name.split('.').pop(); 
          const fileName = `${generateUUID()}.${fileExtension}`; 
          const fileRef = ref(storage, `${folder}/${fileName}`); 
          await uploadBytes(fileRef, file); 
          const url = await getDownloadURL(fileRef); 
          if (type === 'app_users') data.photoURL = url; else data.logoUrl = url; 
        } catch (err) { console.error("Erro upload:", err); alert("Aviso: Falha no upload."); } 
      } 
      if (type === 'app_users' && !id && data.password) { 
        let secondaryApp; 
        try { 
          const config = getApp().options; 
          secondaryApp = !getApps().some(a => a.name === 'Secondary') ? initializeApp(config, "Secondary") : getApp("Secondary"); 
          const secondaryAuth = getAuth(secondaryApp); 
          const userCred = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password); 
          const { password, ...userDocData } = data; 
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', userCred.user.uid), { ...userDocData, id: userCred.user.uid, allowedCompanies: data.allowedCompanies || [] }); 
          deleteApp(secondaryApp).catch(e => console.log(e)); setMessage("Usuário criado!"); setTimeout(() => setMessage(''), 3000); return Promise.resolve(); 
        } catch (authError) { if(secondaryApp) deleteApp(secondaryApp).catch(e => console.log(e)); alert("Erro Auth: " + authError.message); return Promise.reject(authError); } 
      } 
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', type); 
      const dbTask = id ? setDoc(doc(colRef, id), data, { merge: true }) : addDoc(colRef, data); 
      await dbTask; setMessage("Salvo!"); setTimeout(() => setMessage(''), 3000); 
    } catch (e) { alert("Erro: " + e.message); } 
  }, []);
  
  const handleBatchDelete = useCallback(async () => { 
    const items = expenses.filter(e => selectedExpenses.includes(e.id)); 
    const hasReconciled = items.some(item => item.isReconciled);
    if (hasReconciled) {
        alert("AÇÃO BLOQUEADA: Um ou mais itens selecionados já foram conciliados e não podem ser excluídos.");
        setShowDeleteConfirm(false);
        return;
    }
    setIsProcessing(true); 
    try { 
      const fileDeletePromises = items
        .filter(item => item.attachmentUrl)
        .map(item => {
            try {
                const fileRef = ref(storage, item.attachmentUrl);
                return deleteObject(fileRef).catch(err => console.warn("Erro ao apagar arquivo:", err));
            } catch (e) { return Promise.resolve(); }
        });
      await Promise.all(fileDeletePromises);

      await safePromise(Promise.all(items.map(item => deleteDoc(doc(db, 'artifacts', appId, 'users', item.userId, 'expenses', item.id))))); 
      setSelectedExpenses([]); setShowDeleteConfirm(false); setMessage("Excluído!"); setTimeout(() => setMessage(''), 3000); 
    } catch (error) { alert("Erro: " + error.message); } finally { setIsProcessing(false); } 
  }, [expenses, selectedExpenses]);

  const getNextReportId = (allUserExpenses, currentCompanyId) => {
    const currentYear = new Date().getFullYear().toString(); 
    const prefix = `${currentYear}-`; 

    const companyExpenses = allUserExpenses.filter(e => e.companyId === currentCompanyId && e.reportId);

    const existingSequences = companyExpenses
        .filter(e => e.reportId.toString().startsWith(prefix))
        .map(e => {
            const suffix = e.reportId.toString().replace(prefix, '');
            const numberPart = suffix.split(' ')[0].replace(/\D/g, ''); 
            return parseInt(numberPart, 10);
        })
        .filter(num => !isNaN(num));

    if (existingSequences.length === 0) return `${prefix}0001`;

    const maxId = Math.max(...existingSequences);
    const nextId = maxId + 1;

    return `${prefix}${String(nextId).padStart(4, '0')}`;
  };
  
  const handleCloseReport = useCallback(async () => { 
    const selectedItems = expenses.filter(e => selectedExpenses.includes(e.id)); 
    if (selectedItems.length === 0) return; 
    
    if (!currentCompany?.id) { alert("Erro: Nenhuma empresa selecionada."); return; }
    if (selectedItems.some(i => i.costCenter !== selectedItems[0].costCenter)) { alert("ERRO: Centros de Custo diferentes."); return; } 
    
    setConfirmModal(null); setMessage("Gerando..."); 
    
    const isSub = selectedItems.some(i => i.status === 'Substitute' || i.substituteType); 
    
    try { 
      const rawId = getNextReportId(expenses, currentCompany.id);
      const finalId = isSub ? `${rawId} S` : rawId; 
      
      await safePromise(Promise.all(selectedItems.map(e => updateDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'expenses', e.id), { status: 'Closed', reportId: finalId, closingDate: new Date(), isPaid: false })))); 
      setSelectedExpenses([]); setActiveTab('generated_reports'); setMessage(`Relatório ${finalId} gerado!`); setTimeout(() => setMessage(''), 3000); 
    } catch(e) { alert("Erro: " + e.message); } 
  }, [expenses, selectedExpenses, currentUser, currentCompany]);
  
  const handleUpdateReportId = useCallback(async (oldId, newId) => { 
    const idExists = expenses.some(e => e.reportId === newId && e.companyId === currentCompany?.id); 
    if (idExists) { alert(`O ID "${newId}" já existe nesta empresa.`); return; } 
    setEditReportModal(null); setMessage("Atualizando..."); 
    try { 
      const items = expenses.filter(e => e.reportId === oldId); 
      const batch = writeBatch(db); 
      items.forEach(item => batch.update(doc(db, 'artifacts', appId, 'users', item.userId, 'expenses', item.id), { reportId: newId })); 
      await safePromise(batch.commit()); setMessage("Atualizado!"); setTimeout(() => setMessage(''), 3000); 
    } catch (error) { alert("Erro: " + error.message); } 
  }, [expenses, currentCompany]);
  
  const handleLaunchReport = useCallback(async (repId, ownerId) => { 
    const items = expenses.filter(e => e.reportId === repId && e.userId === ownerId); 
    await Promise.all(items.map(e => updateDoc(doc(db, 'artifacts', appId, 'users', ownerId, 'expenses', e.id), { status: 'Submitted', closingDate: new Date() }))); 
    setMessage("Enviado!"); setActiveTab('submitted_reports'); setTimeout(() => setMessage(''), 3000); 
  }, [expenses]);
  
  const handleTogglePayment = useCallback(async (repId, ownerId, newStatus) => { 
    const items = expenses.filter(e => e.reportId === repId && e.userId === ownerId); 
    const updateData = { isPaid: newStatus };
    await Promise.all(items.map(e => updateDoc(doc(db, 'artifacts', appId, 'users', ownerId, 'expenses', e.id), updateData))); 
    setMessage(newStatus ? "Pago!" : "Pagamento Cancelado!"); 
    setTimeout(() => setMessage(''), 3000); 
  }, [expenses]);
  
  const handleSaveAudit = useCallback(async (auditState) => { 
    if(!auditModal) return; 
    const batch = writeBatch(db); 
    Object.keys(auditState).forEach(itemId => {
        const status = auditState[itemId];
        const isGlosada = status === 'rejected';
        batch.update(doc(db, 'artifacts', appId, 'users', auditModal.ownerId, 'expenses', itemId), { 
            adminStatus: status,
            status: isGlosada ? 'Rejected' : 'Closed', 
            isGlosada: isGlosada 
        }); 
    });
    await safePromise(batch.commit()); setAuditModal(null); setMessage("Auditado!"); setTimeout(() => setMessage(''), 3000); 
  }, [auditModal]);
  
  const handleReopenReport = useCallback(async (repId, ownerId, mode = 'ALL') => { 
    const items = expenses.filter(e => e.reportId === repId && e.userId === ownerId);
    if (!items.length) return;
    const isReturn = items.some(i => i.status === 'Submitted');
    if (isReturn && !isAdmin) { alert("Ação não permitida."); return; }
    const batch = writeBatch(db);
    if (isReturn) {
        items.forEach(e => batch.update(doc(db, 'artifacts', appId, 'users', ownerId, 'expenses', e.id), { status: 'Rejected', isPaid: false }));
        setMessage("Devolvido para correção!");
    } else {
        items.forEach(e => {
            if (mode === 'REJECTED_ONLY' && !e.isGlosada && e.status !== 'Rejected') { return; }
            batch.update(doc(db, 'artifacts', appId, 'users', ownerId, 'expenses', e.id), { 
                status: e.substituteType ? 'Substitute' : 'Active', 
                reportId: null, closingDate: null, isPaid: false, adminStatus: null, isGlosada: false 
            });
        });
        setMessage(mode === 'REJECTED_ONLY' ? "Itens glosados reabertos!" : "Relatório reaberto!");
    }
    await safePromise(batch.commit()); 
    setTimeout(() => setMessage(''), 3000); 
  }, [expenses, isAdmin]);
  
  const handleConfirmDeleteReport = useCallback(async () => { 
    if (!reportToDelete) return; 
    setIsProcessing(true); 
    try { 
      const items = expenses.filter(e => e.reportId === reportToDelete.reportId && e.userId === reportToDelete.ownerId); 
      const batch = writeBatch(db); 
      items.forEach(e => batch.delete(doc(db, 'artifacts', appId, 'users', reportToDelete.ownerId, 'expenses', e.id))); 
      await safePromise(batch.commit()); setMessage("Excluído!"); setTimeout(() => setMessage(''), 3000); 
    } catch(e) { alert("Erro: " + e.message); } finally { setIsProcessing(false); setReportToDelete(null); } 
  }, [expenses, reportToDelete]);
  
  const handleDelete = useCallback(async (id, ownerId) => { 
    const item = expenses.find(e => e.id === id);
    if (item && item.isReconciled) { alert("AÇÃO BLOQUEADA: Esta despesa já está conciliada bancariamente."); return; }
    if(confirm("Excluir item?")) { 
        try {
            if (item && item.attachmentUrl) { try { const fileRef = ref(storage, item.attachmentUrl); await deleteObject(fileRef); } catch (err) { console.warn("Anexo já não existe", err); } }
            await deleteDoc(doc(db, 'artifacts', appId, 'users', ownerId, 'expenses', id)); 
            setMessage("Excluído!"); setTimeout(() => setMessage(''), 3000); 
        } catch(e) { alert("Erro ao excluir: " + e.message); }
    } 
  }, [expenses]);
  
  const handleManagementDelete = useCallback(async (type, id) => { 
    if(confirm("Excluir configuração?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', type, id)); setMessage("Excluído!"); setTimeout(() => setMessage(''), 3000); } 
  }, []);

  const handleDeleteReceipt = useCallback(async (e, item) => { 
    e.stopPropagation(); 
    if (!confirm("Remover comprovante?")) return; 
    try { 
      if (item.attachmentUrl) { try { await deleteObject(ref(storage, item.attachmentUrl)); } catch (err) { console.warn(err); } } 
      await updateDoc(doc(db, 'artifacts', appId, 'users', item.userId, 'expenses', item.id), { attachmentUrl: null }); 
      setMessage("Removido!"); setTimeout(() => setMessage(''), 3000); 
    } catch (error) { alert("Erro: " + error.message); } 
  }, []);

  const handleGenerateReportFromPage = useCallback((ids) => { setSelectedExpenses(ids); setConfirmModal({ type: 'close' }); }, []);
  const handleDeleteBatchFromPage = useCallback((ids) => { setSelectedExpenses(ids); setShowDeleteConfirm(true); }, []);
  const handleOpenNewExpense = useCallback((isSub) => { setExpenseToEdit(null); setIsSubstituteForm(isSub); setShowForm(true); }, []);
  const handleOpenEditExpense = useCallback((item) => { setExpenseToEdit(item); setIsSubstituteForm(item.status === 'Substitute'); setShowForm(true); }, []);
  const handleViewReportByObj = useCallback((reportObj) => { if(reportObj) setViewReport(reportObj); }, []);
  
  const handleViewReportById = useCallback((repId) => {
      const found = expenses.find(e => e.reportId === repId && e.companyId === currentCompany?.id);
      if(found) { setViewReport({ reportId: found.reportId, ownerId: found.userId, costCenter: found.costCenter, closingDate: found.closingDate }); } 
      else { alert("Relatório não encontrado ou pertence a outra empresa."); }
  }, [expenses, currentCompany]);

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader className="animate-spin text-white"/></div>;
  if (!currentUser) return <LoginScreen onLogin={handleLogin} loading={false} />;

  return (
    <div className="h-screen w-screen bg-slate-950 font-sans flex flex-col overflow-hidden text-slate-800">
      {message && <div className="bg-emerald-600 text-white p-3 text-center text-xs font-bold shadow-lg animate-fadeIn z-[100] flex justify-center items-center gap-2 fixed top-6 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400"><CheckCircle size={14}/> {message}</div>}

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden h-full">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isAdminView={isAdmin} currentCompany={currentCompany} setCurrentCompany={setCurrentCompany} availableCompanies={availableCompanies} currentUser={currentUser} appUsers={appUsers} onLogout={handleLogout} />
        
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 relative p-4 md:p-6">
          <ErrorBoundary>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-full overflow-hidden">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader className="animate-spin text-indigo-600" size={40}/></div>}>
                
                {activeTab === 'dashboard' && <DashboardPage key={currentCompany?.id} expenses={expenses.filter(e => e.companyId === currentCompany?.id)} costCenters={filteredCostCenters} appUsers={appUsers} currentCompany={currentCompany} onViewReport={handleViewReportById} currentUser={currentUser} isAdminView={isAdmin} />}
                
                {(activeTab === 'active_expenses' || activeTab === 'substitutes') && <ExpensesPage key={currentCompany?.id} activeTab={activeTab} expenses={expenses.filter(e => e.companyId === currentCompany?.id && e.userId === currentUser.uid)} costCenters={filteredCostCenters} categories={categories} user={currentUser} onNewExpense={handleOpenNewExpense} onEditExpense={handleOpenEditExpense} onDeleteExpense={handleDelete} onGenerateReport={handleGenerateReportFromPage} onDeleteBatch={handleDeleteBatchFromPage} currentCompany={currentCompany} />}
                
                {activeTab === 'generated_reports' && (
                    <GeneratedReportsPage 
                        key={currentCompany?.id} 
                        expenses={expenses.filter(e => e.companyId === currentCompany?.id)} 
                        costCenters={filteredCostCenters} 
                        appUsers={appUsers}               
                        onViewReport={handleViewReportByObj} 
                        onLaunch={handleLaunchReport} 
                        onReopen={handleReopenReport} 
                        onEditId={setEditReportModal} 
                        onAudit={setAuditModal}           
                        currentCompany={currentCompany} 
                        currentUser={currentUser}
                        isAdminView={isAdmin}             
                    />
                )}
                
                {activeTab === 'submitted_reports' && <SubmittedReportsPage key={currentCompany?.id} expenses={expenses.filter(e => e.companyId === currentCompany?.id)} costCenters={filteredCostCenters} appUsers={appUsers} isAdminView={isAdmin} onViewReport={handleViewReportByObj} onEditId={setEditReportModal} onPay={handleTogglePayment} onDelete={setReportToDelete} onReopen={handleReopenReport} currentCompany={currentCompany} />}
                
                {activeTab === 'expense_repository' && <RepositoryPage key={currentCompany?.id} expenses={expenses.filter(e => e.companyId === currentCompany?.id && e.status !== 'Active' && e.status !== 'Substitute' && e.status !== 'Closed')} costCenters={filteredCostCenters} companies={companies} appUsers={appUsers} isAdminView={isAdmin} onViewReport={handleViewReportById} onDeleteExpense={handleDelete} onEditExpense={handleOpenEditExpense} currentCompany={currentCompany} />}
                
                {activeTab === 'reconciliation' && 
                  <ReconciliationPage 
                    user={currentUser} 
                    expenses={expenses.filter(e => e.companyId === currentCompany?.id && e.status === 'Submitted')} 
                    allExpenses={expenses} 
                    companies={companies} 
                    currentCompany={currentCompany} 
                    onViewReport={handleViewReportById} 
                  />
                }
                
                {activeTab === 'bank_statement' && 
                  <BankStatementPage 
                    key={currentCompany?.id} 
                    user={currentUser} 
                    companies={companies} 
                    currentCompany={currentCompany} 
                    expenses={expenses.filter(e => e.companyId === currentCompany?.id)} 
                    allExpenses={expenses} 
                    onViewReport={handleViewReportById} 
                  />
                }
                
                {activeTab === 'management' && <ManagementPage key={currentCompany?.id} companies={companies} costCenters={costCenters} categories={categories} appUsers={appUsers} isProcessing={isProcessing} onSeedData={handleSeedData} onDeleteItem={handleManagementDelete} onEditItem={(type, item) => { setManagementType(type); setManagementItem(item); setManagementModalOpen(true); }} currentCompany={currentCompany} />}
              
              </Suspense>
            </div>
          </ErrorBoundary>
        </main>
      </div>
      {showForm && <ExpenseModal onSubmit={handleSave} expenseToEdit={expenseToEdit} onClose={() => setShowForm(false)} costCentersList={filteredCostCenters} categoriesList={categories} isSubstituteMode={isSubstituteForm} currentCompany={currentCompany} onDeleteReceipt={handleDeleteReceipt} />}
      {confirmModal && <ConfirmModal isOpen={true} title="Fechar Relatório" msg={`Deseja fechar o relatório com ${selectedExpenses.length} itens?`} onClose={() => setConfirmModal(null)} onConfirm={handleCloseReport} isProcessing={isProcessing} />}
      {viewReport && <ReportPrintModal report={viewReport} items={expenses.filter(e => e.reportId === (viewReport.reportId || viewReport.id) && e.userId === viewReport.ownerId)} onClose={() => setViewReport(null)} company={currentCompany} appUsers={appUsers} currentUser={currentUser} />}
      {managementModalOpen && <ManagementModal isOpen={managementModalOpen} onClose={() => setManagementModalOpen(false)} onSave={handleSaveManagement} type={managementType} itemToEdit={managementItem} allCompanies={companies} />}
      {auditModal && <AuditReportModal isOpen={!!auditModal} onClose={() => setAuditModal(null)} reportId={auditModal.reportId} ownerId={auditModal.ownerId} items={expenses.filter(e => e.reportId === auditModal.reportId && e.userId === auditModal.ownerId)} onSave={handleSaveAudit} />}
      <EditReportIdModal isOpen={!!editReportModal} currentId={editReportModal} onClose={() => setEditReportModal(null)} onSave={handleUpdateReportId} />
      <ConfirmModal isOpen={showDeleteConfirm} title="Excluir Itens Selecionados" msg={`Atenção! Você está prestes a excluir ${selectedExpenses.length} itens permanentemente. Esta ação não pode ser refeita.`} isDanger={true} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleBatchDelete} isProcessing={isProcessing} />
      <ConfirmModal isOpen={!!reportToDelete} title="Excluir Relatório Completo" msg={`Atenção! Você excluirá PERMANENTEMENTE o relatório ${reportToDelete?.reportId} e todas as despesas vinculadas a ele. Esta ação não pode ser refeita.`} isDanger={true} onClose={() => setReportToDelete(null)} onConfirm={handleConfirmDeleteReport} isProcessing={isProcessing} />
    </div>
  );
}