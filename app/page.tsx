"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Activity,
  ArrowLeftRight,
  Boxes,
  Building2,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import type { PlatformSnapshot } from "@/lib/platform-types";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { UnitsTab } from "@/components/tabs/units-tab";
import { TransferTab } from "@/components/tabs/transfer-tab";
import { StockTab } from "@/components/tabs/stock-tab";
import { PurchasesTab } from "@/components/tabs/purchases-tab";
import { InventorySyncTab } from "@/components/tabs/inventory-sync-tab";

type TabKey = "dashboard" | "match" | "unidades" | "estoque" | "sincronizar" | "compras";

const APP_NAME = "SYNTHERA";
const PLATFORM_LOAD_TIMEOUT_MS = 10000;

const tabItems: { key: TabKey; label: string; icon: typeof TrendingUp }[] = [
  { key: "dashboard", label: "Dashboard Executivo", icon: TrendingUp },
  { key: "match", label: "Synthera Match", icon: ArrowLeftRight },
  { key: "unidades", label: "Gestão de Unidades", icon: Building2 },
  { key: "estoque", label: "Monitor de Estoque", icon: Boxes },
  { key: "sincronizar", label: "Sincronizar Estoque", icon: Boxes },
  { key: "compras", label: "Compras Inteligentes", icon: ShoppingCart },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");
  const [platformData, setPlatformData] = useState<PlatformSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refreshPlatformData() {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), PLATFORM_LOAD_TIMEOUT_MS);

    try {
      const response = await fetch("/api/platform", { signal: controller.signal });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Falha ao carregar a plataforma.");
      }

      const payload = (await response.json()) as PlatformSnapshot;
      setPlatformData(payload);
    } catch (error) {
      setLoadError(error instanceof DOMException && error.name === "AbortError"
        ? "A plataforma demorou para responder. Verifique o servidor local e tente novamente."
        : error instanceof Error ? error.message : "Falha inesperada ao carregar os dados.");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), PLATFORM_LOAD_TIMEOUT_MS);

    async function loadPlatformData() {
      try {
        const response = await fetch("/api/platform", { signal: controller.signal });
        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "Falha ao carregar a plataforma.");
        }

        const payload = (await response.json()) as PlatformSnapshot;
        setPlatformData(payload);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setLoadError("A plataforma demorou para responder. Verifique o servidor local e tente novamente.");
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Falha inesperada ao carregar os dados.");
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void loadPlatformData();

    return () => controller.abort();
  }, []);

  if (!platformData && !loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f12] text-slate-300">
        Carregando dados da plataforma...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f12] px-6 text-center text-slate-200">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-200">Erro de carga</p>
          <p className="mt-2 text-base text-slate-100">{loadError}</p>
        </div>
      </div>
    );
  }

  const data = platformData as PlatformSnapshot;

  return (
    <div className="site-shell min-h-screen text-slate-100">
      <div className="mx-auto flex max-w-screen-2xl flex-col xl:flex-row">
        <aside className="w-full border-b border-white/5 bg-[#0d1419] px-5 py-5 xl:min-h-screen xl:w-72 xl:border-b-0 xl:border-r">
          <div className="mb-8 flex items-center justify-end gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
              <Image
                src="/logo-synthera.svg"
                alt="Synthera logo"
                width={40}
                height={40}
                className="h-full w-full object-contain filter brightness-0 invert"
              />
            </div>
            <div>
              <p className="text-[18px] font-semibold tracking-[0.22em] text-white xl:text-[20px]">
                {APP_NAME}
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/5 bg-[#0f171c] p-4">
            <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <span>Sistema</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#68ddbd]/20 bg-[#68ddbd]/10 px-2 py-1 text-[#68ddbd]">
                <Activity className="h-3 w-3" />
                Online
              </span>
            </div>
            <p className="text-3xl font-semibold tracking-[-0.06em] text-white">94.2%</p>
            <p className="mt-1 text-xs text-slate-400">Eficácia operacional</p>
          </div>

          <nav className="space-y-1.5">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${isActive
                    ? "bg-[#68ddbd] text-[#07120f]"
                    : "text-slate-300 hover:bg-[#111b22] hover:text-white"
                    }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-white/5 pt-5">
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Filtro
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-[#10181d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-[#68ddbd]/45"
            >
              <option value="all">Todas as unidades</option>
              {data.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.companyName} · {u.name}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <main className="w-full px-4 py-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#10171c] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#68ddbd]">
                Synthera Platform
              </p>
              <p className="mt-1 text-sm text-slate-400">Operações integradas em tempo real</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[#68ddbd]/15 bg-[#0d1718] px-3 py-2 text-sm text-slate-200">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#68ddbd]" />
              Rede multiempresa e parceiros estratégicos
            </div>
          </header>

          {activeTab === "dashboard" && <DashboardTab data={data} />}
          {activeTab === "match" && <TransferTab data={data} onTransferComplete={refreshPlatformData} />}
          {activeTab === "unidades" && <UnitsTab data={data} />}
          {activeTab === "estoque" && <StockTab data={data} selectedUnitId={selectedUnitId} />}
          {activeTab === "sincronizar" && <InventorySyncTab data={data} onUploadComplete={refreshPlatformData} />}
          {activeTab === "compras" && <PurchasesTab data={data} />}
        </main>
      </div>
    </div>
  );
}
