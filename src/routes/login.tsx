import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    return { redirect: search.redirect as string | undefined };
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: Route.fullPath });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage('Revisa tu correo electrónico para confirmar tu cuenta.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirect || '/' });
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-heading text-2xl">ServiTech</CardTitle>
          <CardDescription>
            {isSignUp ? 'Crea tu cuenta' : 'Inicia sesión para continuar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
            </Button>
          </form>
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
