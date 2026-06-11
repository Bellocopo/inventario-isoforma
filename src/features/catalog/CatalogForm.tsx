import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useRole } from "@/features/auth/useRole";
import { SupplierSelect } from "@/shared/components/SupplierSelect";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { SupplierId } from "@/shared/lib/suppliers";
import type { Material, MaterialInput } from "./types";
import { useCatalogMutations } from "./useCatalog";

const schema = z.object({
  categoria: z.enum(["PADRAO", "MASTER", "ADITIVO"]),
  tipo: z.string().min(1, "Obrigatório"),
  embal: z.enum(["SC", "BB"]),
  kg: z.number().positive("Deve ser > 0"),
  fornecedor: z.string().nullable(),
  colorCode: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIA_LABELS: Record<Material["categoria"], string> = {
  PADRAO: "Resina Padrão",
  MASTER: "Masterbatch",
  ADITIVO: "Aditivo",
};

interface CatalogFormProps {
  mode: "add" | "edit";
  material?: Material;
  materialId?: string;
  onDone?: () => void;
}

export function CatalogForm({
  mode,
  material,
  materialId,
  onDone,
}: CatalogFormProps) {
  const { isAdmin } = useRole();
  const { addMaterial, updateMaterial } = useCatalogMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues:
      mode === "edit" && material
        ? {
            categoria: material.categoria,
            tipo: material.tipo,
            embal: material.embal,
            kg: material.kg,
            fornecedor: material.fornecedor,
            colorCode: material.colorCode,
          }
        : {
            categoria: "PADRAO",
            tipo: "",
            embal: "SC",
            kg: 0,
            fornecedor: "none",
            colorCode: "#000000",
          },
  });

  const categoria = useWatch({ control: form.control, name: "categoria" });

  function onSubmit(values: FormValues) {
    const input: MaterialInput = {
      tipo: values.tipo,
      embal: values.embal,
      kg: values.kg,
      categoria: values.categoria,
      colorCode:
        values.categoria === "MASTER" ? (values.colorCode ?? null) : null,
      fornecedor:
        values.categoria === "PADRAO"
          ? ((values.fornecedor as SupplierId | null) ?? null)
          : values.categoria === "MASTER"
            ? "masterbatch"
            : null,
      ativo: material?.ativo ?? true,
    };

    if (mode === "add") {
      addMaterial(input);
      form.reset({
        categoria: values.categoria,
        tipo: "",
        embal: values.embal,
        kg: 0,
        fornecedor: "none",
        colorCode: "#000000",
      });
    } else if (materialId) {
      updateMaterial(materialId, input);
      onDone?.();
    }
  }

  if (!isAdmin) return null;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="border-border bg-card space-y-4 rounded-xl border-2 border-dashed p-4"
      >
        {/* Categoria */}
        <FormField
          control={form.control}
          name="categoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Categoria
              </FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-col gap-2 sm:flex-row sm:gap-4"
                >
                  {(["PADRAO", "MASTER", "ADITIVO"] as const).map((cat) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <RadioGroupItem value={cat} id={`cat-${cat}`} />
                      <Label
                        htmlFor={`cat-${cat}`}
                        className="cursor-pointer text-sm"
                      >
                        {CATEGORIA_LABELS[cat]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {/* Tipo */}
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem className="w-full sm:min-w-[180px] sm:flex-1">
                <FormLabel className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Tipo
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex: R-350-L"
                    onBlur={(e) => {
                      field.onBlur();
                      field.onChange(e.target.value.toUpperCase());
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Embal + KG: mesma linha 50/50 no mobile, inline no desktop */}
          <div className="flex gap-3 sm:contents">
            {/* Embal */}
            <FormField
              control={form.control}
              name="embal"
              render={({ field }) => (
                <FormItem className="w-1/2 sm:w-24">
                  <FormLabel className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Embal
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="BB">BB</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* KG */}
            <FormField
              control={form.control}
              name="kg"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem className="w-1/2 sm:w-28">
                  <FormLabel className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    KG
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      step={0.1}
                      value={value}
                      onChange={(e) => onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Cor / Fornecedor condicional */}
          {categoria === "PADRAO" && (
            <FormField
              control={form.control}
              name="fornecedor"
              render={({ field }) => (
                <FormItem className="w-full sm:w-auto">
                  <FormLabel className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Fornecedor
                  </FormLabel>
                  <FormControl>
                    <SupplierSelect
                      value={(field.value as SupplierId) ?? "none"}
                      onChange={(v) => field.onChange(v)}
                      className="w-full sm:w-36"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {categoria === "MASTER" && (
            <FormField
              control={form.control}
              name="colorCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Cor
                  </FormLabel>
                  <FormControl>
                    <input
                      type="color"
                      value={field.value ?? "#000000"}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="border-input h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Ações */}
          <div className="flex gap-2 pb-0.5">
            <Button
              type="submit"
              size="sm"
              disabled={form.formState.isSubmitting}
            >
              {mode === "add" ? "Adicionar" : "Salvar"}
            </Button>
            {mode === "edit" && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={onDone}
              >
                <X />
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
