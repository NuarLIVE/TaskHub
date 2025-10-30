import { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import OrderCreatePage from './pages/OrderCreatePage';
import TaskCreatePage from './pages/TaskCreatePage';
import MarketPage from './pages/MarketPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrderDetailPage from './pages/OrderDetailPage';
import TaskDetailPage from './pages/TaskDetailPage';
import ProposalsPage from './pages/ProposalsPage';
import MessagesPage from './pages/MessagesPage';
import {
  DealPage,
  WalletPage,
  TalentsPage,
  NotificationsPage,
  SavedPage,
  DisputesPage,
  MyOrdersPage,
  MyDealsPage,
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
      setRoute(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  let Page;

  if (route === '/') {
    Page = HomePage;
  } else if (route === '/login') {
    Page = LoginPage;
  } else if (route === '/register') {
    Page = RegisterPage;
  } else if (route === '/onboarding') {
    Page = OnboardingPage;
  } else if (route === '/profile') {
    Page = ProfilePage;
  } else if (route === '/market') {
    Page = MarketPage;
  } else if (route === '/order/new') {
    Page = OrderCreatePage;
  } else if (route === '/task/new') {
    Page = TaskCreatePage;
  } else if (route.startsWith('/orders/')) {
    Page = OrderDetailPage;
  } else if (route.startsWith('/tasks/')) {
    Page = TaskDetailPage;
  } else if (route === '/proposals') {
    Page = ProposalsPage;
  } else if (route.startsWith('/messages')) {
    Page = MessagesPage;
  } else if (route.startsWith('/deal/')) {
    Page = DealPage;
  } else if (route === '/wallet') {
    Page = WalletPage;
  } else if (route === '/talents') {
    Page = TalentsPage;
  } else if (route === '/notifications') {
    Page = NotificationsPage;
  } else if (route === '/saved') {
    Page = SavedPage;
  } else if (route.startsWith('/disputes')) {
    Page = DisputesPage;
  } else if (route === '/me/orders') {
    Page = MyOrdersPage;
  } else if (route === '/me/deals') {
    Page = MyDealsPage;
  } else if (route === '/me/portfolio') {
    Page = ProfilePage;
  } else if (route === '/settings/profile') {
    Page = SettingsProfilePage;
  } else if (route === '/settings/security') {
    Page = SettingsSecurityPage;
  } else if (route === '/settings/notifications') {
    Page = NotificationsPage;
  } else if (route === '/settings/payments') {
    Page = WalletPage;
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
  } else {
    Page = NotFoundPage;
  }

  const isAuthPage = route === '/login' || route === '/register' || route === '/onboarding';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isAuthPage && <NavBar />}
      <Page />
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default App;
