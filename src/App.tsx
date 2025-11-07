import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { DbStatus } from './components/DbStatus';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFound from './pages/NotFound';

const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrderCreatePage = lazy(() => import('./pages/OrderCreatePage'));
const OrderEditPage = lazy(() => import('./pages/OrderEditPage'));
const TaskCreatePage = lazy(() => import('./pages/TaskCreatePage'));
const TaskEditPage = lazy(() => import('./pages/TaskEditPage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const MyDealsPage = lazy(() => import('./pages/MyDealsPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));
const ProposalsPage = lazy(() => import('./pages/ProposalsPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const ProposalsCreate = lazy(() => import('./pages/proposals/Create'));
const PublicProfile = lazy(() => import('./pages/users/PublicProfile'));
const PortfolioAdd = lazy(() => import('./pages/me/PortfolioAdd'));
const DealOpen = lazy(() => import('./pages/deal/Open'));
const BlockedUsersPage = lazy(() => import('./pages/BlockedUsersPage'));
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import WalletPage from './pages/WalletPage';
import {
  DealPage,
  NotificationsPage,
  SavedPage,
  DisputesPage,
  SettingsProfilePage,
  SettingsSecurityPage,
  OnboardingPage,
  AdminPage,
  TermsPage,
  PrivacyPage,
  FAQPage,
  ContactPage,
  NotFoundPage
} from './pages/AllPages';

function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      const routeWithoutQuery = hash.split('?')[0];
      setRoute(routeWithoutQuery);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  let Page;

  if (route === '/') {
    Page = HomePage;
  } else if (route === '/auth/login' || route === '/login') {
    Page = LoginPage;
  } else if (route === '/auth/register' || route === '/register') {
    Page = RegisterPage;
  } else if (route === '/onboarding') {
    Page = OnboardingPage;
  } else if (route === '/me' || route === '/profile') {
    Page = ProfilePage;
  } else if (route === '/me/edit') {
    Page = ProfilePage;
  } else if (route === '/my-deals') {
    Page = MyDealsPage;
  } else if (route === '/me/portfolio') {
    Page = ProfilePage;
  } else if (route.startsWith('/me/portfolio/add')) {
    Page = PortfolioAdd;
  } else if (route === '/orders') {
    Page = MarketPage;
  } else if (route === '/orders/create' || route === '/order/new') {
    Page = OrderCreatePage;
  } else if (route.match(/^\/order\/[^\/]+\/edit$/)) {
    Page = OrderEditPage;
  } else if (route.startsWith('/order/')) {
    Page = OrderDetailPage;
  } else if (route.startsWith('/orders/')) {
    Page = OrderDetailPage;
  } else if (route === '/tasks') {
    Page = MarketPage;
  } else if (route === '/tasks/create' || route === '/task/new') {
    Page = TaskCreatePage;
  } else if (route.match(/^\/task\/[^\/]+\/edit$/)) {
    Page = TaskEditPage;
  } else if (route.startsWith('/task/')) {
    Page = TaskDetailPage;
  } else if (route.startsWith('/tasks/')) {
    Page = TaskDetailPage;
  } else if (route === '/proposals') {
    Page = ProposalsPage;
  } else if (route.startsWith('/proposals/create')) {
    Page = ProposalsCreate;
  } else if (route.startsWith('/messages/')) {
    Page = MessagesPage;
  } else if (route === '/messages') {
    Page = MessagesPage;
  } else if (route.startsWith('/deal/open')) {
    Page = DealOpen;
  } else if (route.startsWith('/deal/')) {
    Page = DealPage;
  } else if (route === '/wallet') {
    Page = WalletPage;
  } else if (route === '/reviews') {
    Page = ProfilePage;
  } else if (route.startsWith('/u/') || route.startsWith('/users/')) {
    Page = PublicProfile;
  } else if (route === '/notifications') {
    Page = NotificationsPage;
  } else if (route === '/saved') {
    Page = SavedPage;
  } else if (route.startsWith('/disputes/')) {
    Page = DisputesPage;
  } else if (route === '/disputes') {
    Page = DisputesPage;
  } else if (route === '/settings/profile') {
    Page = SettingsProfilePage;
  } else if (route === '/settings/security') {
    Page = SettingsSecurityPage;
  } else if (route === '/settings/notifications') {
    Page = NotificationSettingsPage;
  } else if (route === '/settings/payments' || route === '/payment-methods') {
    Page = PaymentMethodsPage;
  } else if (route === '/settings/blocked' || route === '/blocked-users') {
    Page = BlockedUsersPage;
  } else if (route === '/media' || route === '/media-library') {
    Page = MediaLibraryPage;
  } else if (route === '/admin') {
    Page = AdminPage;
  } else if (route === '/terms') {
    Page = TermsPage;
  } else if (route === '/privacy') {
    Page = PrivacyPage;
  } else if (route === '/faq') {
    Page = FAQPage;
  } else if (route === '/contact') {
    Page = ContactPage;
  } else if (route === '/market' || route.startsWith('/market?')) {
    Page = MarketPage;
  } else if (route === '/404') {
    Page = NotFound;
  } else {
    Page = NotFound;
  }

  const isAuthPage = route === '/login' || route === '/register' || route === '/auth/login' || route === '/auth/register' || route === '/onboarding';

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        {!isAuthPage && <NavBar />}
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6FE7C8] border-r-transparent"></div>
              <p className="mt-4 text-[#3F7F6E]">Загрузка...</p>
            </div>
          </div>
        }>
          <Page />
        </Suspense>
        {!isAuthPage && <Footer />}
        <DbStatus />
      </div>
    </AuthProvider>
  );
}

export default App;
