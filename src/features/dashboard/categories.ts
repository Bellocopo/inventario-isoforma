import { FlaskConical, Package2, Palette } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Categoria } from "@/features/catalog/types";
import type { CategorySummary } from "./types";

export interface CategoryConfig {
  id: Categoria;
  label: string; // exibido no card e em "DETALHES: <label>"
  icon: LucideIcon;
  subtitle: (s: CategorySummary) => string;
  solid: string; // card selecionado (fundo sólido + texto + borda)
  iconIdle: string; // badge do ícone quando não selecionado
  tagIdle: string; // tag "N TIPOS" quando não selecionado
  headerBg: string; // faixa de detalhes (fundo claro)
  headerText: string; // faixa de detalhes (texto + ícone)
}

const nf = new Intl.NumberFormat("pt-BR");

export const CATEGORIES: CategoryConfig[] = [
  {
    id: "PADRAO",
    label: "Resinas Padrão",
    icon: Package2,
    subtitle: (s) => `${nf.format(s.paletes)} paletes em estoque`,
    solid: "bg-primary text-primary-foreground border-primary",
    iconIdle: "bg-primary/10 text-primary",
    tagIdle: "bg-primary/10 text-primary",
    headerBg: "bg-primary/5",
    headerText: "text-primary",
  },
  {
    id: "MASTER",
    label: "Masterbatches",
    icon: Palette,
    subtitle: () => "Volume em sacos e caixas",
    solid: "bg-brand-pink-foreground text-white border-brand-pink-foreground",
    iconIdle: "bg-brand-pink text-brand-pink-foreground",
    tagIdle: "bg-brand-pink text-brand-pink-foreground",
    headerBg: "bg-brand-pink/40",
    headerText: "text-brand-pink-foreground",
  },
  {
    id: "ADITIVO",
    label: "Aditivos Químicos",
    icon: FlaskConical,
    subtitle: () => "Volume em sacos e bombonas",
    solid:
      "bg-brand-purple-foreground text-white border-brand-purple-foreground",
    iconIdle: "bg-brand-purple text-brand-purple-foreground",
    tagIdle: "bg-brand-purple text-brand-purple-foreground",
    headerBg: "bg-brand-purple/40",
    headerText: "text-brand-purple-foreground",
  },
];

export const CATEGORY_BY_ID: Record<Categoria, CategoryConfig> =
  Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
    Categoria,
    CategoryConfig
  >;
