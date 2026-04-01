import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircle2, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authService, type UserRole } from '@/services/auth/authService';
import { supabase } from '@/lib/supabase';

interface ProfileLite {
  name: string | null;
  avatar_url: string | null;
}

const roleDashboardPath = (role: UserRole | null) => {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'fan') return '/dashboard/fan';
  return '/dashboard';
};

const NavUser = () => {
  const [name, setName] = useState('Mi cuenta');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [session, userRole] = await Promise.all([
          authService.getSession(),
          authService.getRole(),
        ]);

        if (!mounted) return;

        setRole(userRole);

        if (!session?.user.id) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!mounted) return;

        const profile = (data || null) as ProfileLite | null;
        setName(profile?.name || session.user.email || 'Mi cuenta');
        setAvatarUrl(profile?.avatar_url || null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    const onProfileUpdated = () => {
      void load();
    };
    window.addEventListener('profile:updated', onProfileUpdated);

    return () => {
      window.removeEventListener('profile:updated', onProfileUpdated);
      mounted = false;
    };
  }, []);

  const signOut = async () => {
    await authService.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground">Cargando...</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-7 h-7 rounded-full object-cover border border-border" />
          ) : (
            <UserCircle2 className="w-5 h-5" />
          )}
          <span className="max-w-32 truncate text-sm">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={roleDashboardPath(role)} className="cursor-pointer">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile-settings" className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            Profile Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()} className="cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavUser;
