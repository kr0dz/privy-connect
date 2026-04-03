import { useEffect, useState, useCallback } from 'react';
import { ArrowDownLeft, ArrowUpRight, Coins, Filter, Search } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth/authService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'debit' | 'credit';
  provider: string;
  provider_ref: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  status: string;
}

const TYPE_LABELS: Record<string, string> = {
  welcome_bonus: 'Bono bienvenida',
  promotion_bonus: 'Codigo promo',
  loyalty_bonus: 'Bono fidelidad',
  birthday_bonus: 'Bono cumpleaños',
  content_unlock: 'Desbloqueo contenido',
  tip: 'Propina',
  message: 'Mensaje premium',
  purchase: 'Compra de monedas',
};

function getDescription(tx: Transaction): string {
  if (!tx.metadata) {
    return tx.provider_ref || '—';
  }
  const meta = tx.metadata as Record<string, unknown>;
  const ttType = typeof meta.transaction_type === 'string' ? meta.transaction_type : null;
  if (ttType && TYPE_LABELS[ttType]) {
    const desc = typeof meta.description === 'string' ? meta.description : null;
    return desc || TYPE_LABELS[ttType];
  }
  return tx.provider_ref || tx.provider || '—';
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'credit', label: 'Ingresos' },
  { value: 'debit', label: 'Gastos' },
];

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const session = await authService.getSession().catch(() => null);
    if (!session?.user.id) {
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    // Load wallet balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .maybeSingle();

    setWalletBalance(Number(profile?.wallet_balance ?? 0));

    // Find wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!wallet) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from('transactions')
      .select('id, amount, currency, type, provider, provider_ref, metadata, created_at, status')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filterType !== 'all') {
      query = query.eq('type', filterType);
    }

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    const { data } = await query;
    setTransactions((data || []) as Transaction[]);
    setLoading(false);
  }, [filterType, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = searchText
    ? transactions.filter((tx) => {
        const desc = getDescription(tx).toLowerCase();
        return (
          desc.includes(searchText.toLowerCase()) ||
          tx.currency.toLowerCase().includes(searchText.toLowerCase())
        );
      })
    : transactions;

  const totalCoinsIn = transactions
    .filter((t) => t.type === 'credit' && t.currency === 'coins')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalCoinsOut = transactions
    .filter((t) => t.type === 'debit' && t.currency === 'coins')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-24">
        <div className="max-w-4xl mx-auto mb-4">
          <BackButton fallbackTo="/dashboard" />
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">
            Historial de transacciones
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Todos tus movimientos de monedas y pagos.
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-glass border border-primary/20 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Coins className="w-3 h-3" /> Saldo actual
              </p>
              <p className="text-2xl font-display font-bold text-primary">{Math.floor(walletBalance)}</p>
            </div>
            <div className="bg-surface-glass border border-green-500/20 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3 text-green-500" /> Total ingresado
              </p>
              <p className="text-2xl font-display font-bold text-green-500">+{Math.floor(totalCoinsIn)}</p>
            </div>
            <div className="bg-surface-glass border border-destructive/20 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-destructive" /> Total gastado
              </p>
              <p className="text-2xl font-display font-bold text-destructive">−{Math.floor(totalCoinsOut)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar descripcion..."
                className="pl-9"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36">
                <Filter className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-36"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Desde"
            />
            <Input
              type="date"
              className="w-36"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Hasta"
            />
            <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setSearchText(''); setFilterType('all'); }}>
              Limpiar
            </Button>
          </div>

          {/* Table */}
          <div className="bg-surface-glass border border-border/50 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Cargando transacciones...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay movimientos que coincidan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString('es', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-sm">{getDescription(tx)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          tx.type === 'credit'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {tx.type === 'credit'
                            ? <ArrowDownLeft className="w-3 h-3" />
                            : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type === 'credit' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${
                        tx.type === 'credit' ? 'text-green-500' : 'text-destructive'
                      }`}>
                        {tx.type === 'credit' ? '+' : '−'}{Math.abs(tx.amount)} {tx.currency === 'coins' ? '💎' : tx.currency.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${tx.status === 'succeeded' ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {tx.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TransactionHistory;
