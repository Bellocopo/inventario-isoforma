import { useAuth } from "@/features/auth/useAuth";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Box, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const searchSchema = z.object({
  redirect: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.auth.status === "signed-in") {
      throw redirect({ to: search.redirect ?? "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setAuthError(null);
    try {
      await signIn(data.email, data.password);
      await navigate({ to: redirectTo ?? "/" });
    } catch {
      setAuthError("E-mail ou senha incorretos.");
    }
  }

  return (
    <div className="bg-header flex min-h-screen items-center justify-center p-4">
      <Card className="border-success w-full max-w-sm border-t-4 shadow-2xl">
        <CardHeader className="items-center gap-1 pt-8 pb-6">
          <Box className="text-success size-12" strokeWidth={2.5} />
          <CardTitle className="text-2xl font-bold tracking-tight">
            <span className="text-success">iso</span>forma
          </CardTitle>
          <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
            Inventário
          </p>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-destructive text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>

            {authError && (
              <p className="text-destructive text-sm">{authError}</p>
            )}

            <Button
              type="submit"
              className="mt-2 w-full font-bold tracking-widest uppercase"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Entrar no Sistema
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
