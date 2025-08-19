import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Messages from './pages/Messages';
import Contactus from './pages/ContactUS';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Support from './pages/Support';
import Deals from './pages/Deals';
import DealDetails from './pages/DealDetails';
import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import Reports from './pages/Reports';
import ReportDetails from './pages/ReportDetails';
import AddContact from './pages/AddContact';

// Authentication pages
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Component pages
import ComponentAccordion from './pages/components/Accordion';
import ComponentAvatar from './pages/components/Avatar';
import ComponentAlerts from './pages/components/Alerts';
import ComponentBadge from './pages/components/Badge';
import ComponentBreadcrumb from './pages/components/Breadcrumb';
import ComponentButtons from './pages/components/Buttons';
import ComponentCalendar from './pages/components/Calendar';
import ComponentCard from './pages/components/Card';
import ComponentCarousel from './pages/components/Carousel';
import ComponentCollapse from './pages/components/Collapse';
import ComponentDropdown from './pages/components/Dropdown';
import ComponentGantt from './pages/components/Gantt';
import ComponentListGroup from './pages/components/ListGroup';
import ComponentModals from './pages/components/Modals';
import ComponentNavsTabs from './pages/components/NavsTabs';
import ComponentOffcanvas from './pages/components/Offcanvas';
import ComponentProgress from './pages/components/Progress';
import ComponentPlaceholder from './pages/components/Placeholder';
import ComponentPagination from './pages/components/Pagination';
import ComponentPopovers from './pages/components/Popovers';
import ComponentScrollspy from './pages/components/Scrollspy';
import ComponentSortable from './pages/components/Sortable';
import ComponentSpinners from './pages/components/Spinners';
import ComponentToast from './pages/components/Toast';
import ComponentTooltips from './pages/components/Tooltips';
import ComponentTypedText from './pages/components/TypedText';
import ComponentChatWidget from './pages/components/ChatWidget';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/contacts" element={<Contactus />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/support" element={<Support />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/deal-details" element={<DealDetails />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/lead-details" element={<LeadDetails />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/report-details" element={<ReportDetails />} />
          <Route path="/add-contact" element={<AddContact />} />
          
          {/* Authentication routes */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          
          {/* Component routes */}
          <Route path="/components/accordion" element={<ComponentAccordion />} />
          <Route path="/components/avatar" element={<ComponentAvatar />} />
          <Route path="/components/alerts" element={<ComponentAlerts />} />
          <Route path="/components/badge" element={<ComponentBadge />} />
          <Route path="/components/breadcrumb" element={<ComponentBreadcrumb />} />
          <Route path="/components/buttons" element={<ComponentButtons />} />
          <Route path="/components/calendar" element={<ComponentCalendar />} />
          <Route path="/components/card" element={<ComponentCard />} />
          <Route path="/components/carousel" element={<ComponentCarousel />} />
          <Route path="/components/collapse" element={<ComponentCollapse />} />
          <Route path="/components/dropdown" element={<ComponentDropdown />} />
          <Route path="/components/gantt" element={<ComponentGantt />} />
          <Route path="/components/list-group" element={<ComponentListGroup />} />
          <Route path="/components/modals" element={<ComponentModals />} />
          <Route path="/components/navs-tabs" element={<ComponentNavsTabs />} />
          <Route path="/components/offcanvas" element={<ComponentOffcanvas />} />
          <Route path="/components/progress" element={<ComponentProgress />} />
          <Route path="/components/placeholder" element={<ComponentPlaceholder />} />
          <Route path="/components/pagination" element={<ComponentPagination />} />
          <Route path="/components/popovers" element={<ComponentPopovers />} />
          <Route path="/components/scrollspy" element={<ComponentScrollspy />} />
          <Route path="/components/sortable" element={<ComponentSortable />} />
          <Route path="/components/spinners" element={<ComponentSpinners />} />
          <Route path="/components/toast" element={<ComponentToast />} />
          <Route path="/components/tooltips" element={<ComponentTooltips />} />
          <Route path="/components/typed-text" element={<ComponentTypedText />} />
          <Route path="/components/chat-widget" element={<ComponentChatWidget />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;