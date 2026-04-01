import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService, type UserRole } from "@/services/auth/authService";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "No se pudo crear la cuenta.";
}

const Signup = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>("fan");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreator = useMemo(() => role === "creator", [role]);

  useEffect(() => {
    let cancelled = false;

    authService
      .getSession()
      .then((session) => {
        if (!cancelled && session) {
          navigate("/discover", { replace: true });
        }
      })
      .catch(() => {
        // no-op
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    if (isCreator && !dateOfBirth) {
      toast.error("La fecha de nacimiento es obligatoria para creadores.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await authService.signUp({
        email: email.trim(),
        password,
        role,
        dateOfBirth: isCreator ? dateOfBirth : undefined,
      });

      if (session) {
        toast.success("Cuenta creada correctamente.");
        navigate("/discover", { replace: true });
        return;
      }

      toast.success("Cuenta creada. Revisa tu correo para confirmar tu registro.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container flex min-h-screen items-center justify-center py-24">
        <Card className="w-full max-w-lg border-primary/20 bg-surface-glass">
          <CardHeader className="space-y-2">
            <CardTitle className="font-display text-3xl">Get Started</CardTitle>
            <CardDescription>
              Crea tu cuenta para entrar como fan o empezar como creador.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isCheckingSession ? (
              <p className="text-sm text-muted-foreground">Verificando sesión...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-3">
                  <Label>Tipo de cuenta</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={role === "fan" ? "gold" : "outline"}
                      onClick={() => setRole("fan")}
                    >
                      Fan
                    </Button>
                    <Button
                      type="button"
                      variant={role === "creator" ? "gold" : "outline"}
                      onClick={() => setRole("creator")}
                    >
                      Creator
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar contraseña</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {isCreator && (
                  <div className="space-y-2">
                    <Label htmlFor="date-of-birth">Fecha de nacimiento</Label>
                    <Input
                      id="date-of-birth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required={isCreator}
                    />
                  </div>
                )}

                <Button type="submit" variant="gold" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
                </Button>

                <p className="text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <Link to="/login" className="text-primary underline underline-offset-4">
                    Iniciar sesión
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Signup;