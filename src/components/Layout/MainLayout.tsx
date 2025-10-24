import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../Dashboard/Dashboard';
import { ClientsView } from '../Clients/ClientsView';
import { OccasionalClientsView } from '../OccasionalClients/OccasionalClientsView';
import { ServicesView } from '../Services/ServicesView';
import { InvoicesView } from '../Invoices/InvoicesView';
import { StatementsView } from '../Statements/StatementsView';
import { IPCView } from '../IPC/IPCView';
import { CalendarView } from '../Calendar/CalendarView';

export function MainLayout() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <ClientsView />;
      case 'occasional':
        return <OccasionalClientsView />;
      case 'services':
        return <ServicesView />;
      case 'invoices':
        return <InvoicesView />;
      case 'statements':
        return <StatementsView />;
      case 'ipc':
        return <IPCView />;
      case 'calendar':
        return <CalendarView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
