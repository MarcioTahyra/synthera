"use client";

import { useState } from "react";
import { ArrowLeftRight, Plus, X, CheckCircle, Clock, AlertTriangle, MapPin, Building2, PackageCheck, ShieldAlert } from "lucide-react";
import type { Transfer } from "@/data/mock-transfers";
import type { PlatformSnapshot } from "@/lib/platform-types";

const EXCESS_THRESHOLD = 1.4;
type MatchDecision = "accepted" | "rejected" | "ignored";

type MatchCandidate = {
  id: string;
  sourceUnitId: string;
  sourceUnit: string;
  sourceCompany: string;
  sourceLocation: string;
  sourceHas: string;
  sourceAvailableQty: number;
  destinationUnitId: string;
  destinationUnit: string;
  destinationCompany: string;
  destinationLocation: string;
  destinationNeeds: string;
  destinationNeedQty: number;
  medicineName: string;
  medicineId: string;
  transferableQty: number;
  score: number;
};

const statusConfig: Record<Transfer["status"], { label: string; className: string; icon: typeof Clock }> = {
  concluída: { label: "Concluída", className: "border border-[#68ddbd]/20 bg-[#68ddbd]/10 text-[#7ce4c7]", icon: CheckCircle },
  aprovada: { label: "Aprovada", className: "border border-[#68ddbd]/20 bg-[#68ddbd]/10 text-[#7ce4c7]", icon: CheckCircle },
  pendente: { label: "Pendente", className: "border border-[#f3c96d]/20 bg-[#f3c96d]/10 text-[#f3c96d]", icon: Clock },
};

type TransferTabProps = {
  data: PlatformSnapshot;
  onTransferComplete: () => Promise<void>;
};

export function TransferTab({ data, onTransferComplete }: TransferTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>(data.transfers);
  const [matchDecisions, setMatchDecisions] = useState<Record<string, MatchDecision>>({});
  const [processingMatch, setProcessingMatch] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fromUnitId: "",
    toUnitId: "",
    medicineId: "",
    quantity: "",
    requestedBy: "",
  });

  const pending = transfers.filter((t) => t.status === "pendente").length;

  const unitsById = new Map(data.units.map((unit) => [unit.id, unit]));
  const medicinesById = new Map(data.medicines.map((medicine) => [medicine.id, medicine]));
  const getUnitName = (id: string) => unitsById.get(id)?.name ?? id;

  const excessItems = data.unitStocks
    .filter((s) => s.currentStock > s.forecastConsumption * EXCESS_THRESHOLD)
    .map((s) => ({
      ...s,
      medicineName: medicinesById.get(s.medicineId)?.name ?? s.medicineId,
      unitName: unitsById.get(s.unitId)?.name ?? s.unitId,
      companyName: unitsById.get(s.unitId)?.companyName ?? "Empresa vinculada",
      location: unitsById.get(s.unitId)?.location ?? "Local",
    }));

  const shortageItems = data.unitStocks
    .filter((s) => s.currentStock < s.forecastConsumption)
    .map((s) => ({
      ...s,
      medicineName: medicinesById.get(s.medicineId)?.name ?? s.medicineId,
      unitName: unitsById.get(s.unitId)?.name ?? s.unitId,
      companyName: unitsById.get(s.unitId)?.companyName ?? "Empresa vinculada",
      location: unitsById.get(s.unitId)?.location ?? "Local",
    }));

  const matchCandidates: MatchCandidate[] = excessItems
    .flatMap((source) => {
      return shortageItems
        .filter(
          (destination) =>
            destination.medicineId === source.medicineId &&
            destination.unitId !== source.unitId &&
            source.companyName !== destination.companyName,
        )
        .map((destination) => {
          const transferableQty = Math.min(
            source.currentStock - source.forecastConsumption,
            destination.forecastConsumption - destination.currentStock,
          );

          return {
            id: `${source.unitId}-${destination.unitId}-${source.medicineId}`,
            sourceUnitId: source.unitId,
            sourceUnit: source.unitName,
            sourceCompany: source.companyName,
            sourceLocation: source.location,
            sourceHas: source.medicineName,
            sourceAvailableQty: Math.max(0, source.currentStock - source.forecastConsumption),
            destinationUnitId: destination.unitId,
            destinationUnit: destination.unitName,
            destinationCompany: destination.companyName,
            destinationLocation: destination.location,
            destinationNeeds: destination.medicineName,
            destinationNeedQty: Math.max(0, destination.forecastConsumption - destination.currentStock),
            medicineName: source.medicineName,
            medicineId: source.medicineId,
            transferableQty: Math.max(0, transferableQty),
            score: Math.min(98, 72 + Math.round((transferableQty / 30) * 18)),
          };
        });
    })
    .filter((candidate) => candidate.transferableQty > 0)
    .slice(0, 6);

  async function handleDecision(candidate: MatchCandidate, decision: MatchDecision) {
    if (decision !== "accepted") {
      setMatchDecisions((prev) => ({ ...prev, [candidate.id]: decision }));
      return;
    }

    setProcessingMatch(candidate.id);
    setMatchError(null);

    try {
      const response = await fetch("/api/transfers/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUnitId: candidate.sourceUnitId,
          toUnitId: candidate.destinationUnitId,
          medicineId: candidate.medicineId,
          quantity: candidate.transferableQty,
          requestedBy: "Synthera Match",
        }),
      });

      const payload = (await response.json()) as Transfer & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível aceitar o match.");
      }

      setTransfers((prev) => [payload, ...prev]);
      setMatchDecisions((prev) => ({ ...prev, [candidate.id]: decision }));
      await onTransferComplete();
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "Não foi possível aceitar o match.");
    } finally {
      setProcessingMatch(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    void (async () => {
      try {
        const response = await fetch("/api/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromUnitId: form.fromUnitId,
            toUnitId: form.toUnitId,
            medicineId: form.medicineId,
            quantity: Number(form.quantity),
            requestedBy: form.requestedBy || "Sistema",
          }),
        });

        if (!response.ok) {
          throw new Error("Falha ao criar a transferência.");
        }

        const created = (await response.json()) as Transfer;
        setTransfers((prev) => [created, ...prev]);
        setShowForm(false);
        setForm({ fromUnitId: "", toUnitId: "", medicineId: "", quantity: "", requestedBy: "" });
      } catch {
        setShowForm(true);
      }
    })();
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-md bg-[#0d1117] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Matches ativos</p>
          <p className="mt-3 text-3xl font-semibold text-[#68ddbd]">{matchCandidates.length}</p>
          <p className="mt-2 text-xs text-slate-400">Conexões entre empresas</p>
        </article>
        <article className="rounded-md bg-[#0d1117] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Volume sugerido</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {matchCandidates.reduce((sum, item) => sum + item.transferableQty, 0)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Unidades em potencial</p>
        </article>
        <article className="rounded-md bg-[#0d1117] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Pendentes</p>
          <p className="mt-3 text-3xl font-semibold text-[#f3c96d]">{pending}</p>
          <p className="mt-2 text-xs text-slate-400">Transferências em revisão</p>
        </article>
        <article className="rounded-md bg-[#0f1b1a] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#7ce4c7]">Atenção cruzada</p>
          <p className="mt-3 text-3xl font-semibold text-[#68ddbd]">{new Set(matchCandidates.map((item) => item.sourceCompany)).size + new Set(matchCandidates.map((item) => item.destinationCompany)).size}</p>
          <p className="mt-2 text-xs text-slate-300">Empresas com demanda e excedente</p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md bg-[#0d1117] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#68ddbd]" />
            Oferta disponível
          </h3>
          <div className="space-y-2">
            {excessItems.slice(0, 6).map((item) => (
              <div key={`${item.unitId}-${item.medicineId}`} className="flex items-center justify-between rounded-xl bg-[#101821] px-3 py-2.5 text-sm ring-1 ring-[#1b232b]">
                <div>
                  <p className="font-medium text-white">{item.medicineName}</p>
                  <p className="text-xs text-slate-400">{item.unitName} · {item.companyName}</p>
                </div>
                <span className="font-semibold text-[#68ddbd]">+{item.currentStock - item.forecastConsumption} un.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md bg-[#0d1117] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ff8a8a]" />
            Demanda crítica
          </h3>
          <div className="space-y-2">
            {shortageItems.slice(0, 6).map((item) => (
              <div key={`${item.unitId}-${item.medicineId}`} className="flex items-center justify-between rounded-xl bg-[#151a1d] px-3 py-2.5 text-sm ring-1 ring-[#1b232b]">
                <div>
                  <p className="font-medium text-white">{item.medicineName}</p>
                  <p className="text-xs text-slate-400">{item.unitName} · {item.companyName}</p>
                </div>
                <span className="font-semibold text-[#ff8a8a]">-{item.forecastConsumption - item.currentStock} un.</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md bg-[#0d1117] shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col gap-3 border-b border-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ArrowLeftRight className="h-4 w-4 text-[#68ddbd]" />
            Match entre empresas
          </h3>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#68ddbd] px-3 py-2 text-sm font-semibold text-[#08110f] transition hover:bg-[#7ae0bc]"
          >
            <Plus className="h-4 w-4" />
            Nova recomendação
          </button>
        </div>

        {matchError && (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {matchError}
          </div>
        )}

        <div className="grid gap-4 p-4 xl:grid-cols-2">
          {matchCandidates.map((candidate) => {
            const decision = matchDecisions[candidate.id];
            return (
              <article key={candidate.id} className="rounded-md bg-[#111b22] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">MATCH</p>
                    <h4 className="mt-1 text-xl font-semibold text-white">{candidate.medicineName}</h4>
                  </div>
                  <span className="rounded-full border border-[#68ddbd]/20 bg-[#68ddbd]/10 px-2.5 py-1 text-xs font-medium text-[#68ddbd]">
                    {candidate.score}%
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[#1b232b] bg-[#0d1117] p-3">
                    <div className="mb-2 flex items-center gap-2 text-[#68ddbd]">
                      <PackageCheck className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Tem em estoque</span>
                    </div>
                    <p className="font-semibold text-white">{candidate.sourceUnit}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <Building2 className="h-3.5 w-3.5" />
                      {candidate.sourceCompany}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {candidate.sourceLocation}
                    </p>
                    <div className="mt-3 rounded-lg bg-[#101821] p-2 text-sm">
                      <p className="text-slate-300">{candidate.sourceHas}</p>
                      <p className="mt-1 font-semibold text-[#68ddbd]">{candidate.sourceAvailableQty} unidades disponíveis</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#1b232b] bg-[#0d1117] p-3">
                    <div className="mb-2 flex items-center gap-2 text-[#ff8a8a]">
                      <ShieldAlert className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Falta no meu ponto</span>
                    </div>
                    <p className="font-semibold text-white">{candidate.destinationUnit}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <Building2 className="h-3.5 w-3.5" />
                      {candidate.destinationCompany}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {candidate.destinationLocation}
                    </p>
                    <div className="mt-3 rounded-lg bg-[#151a1d] p-2 text-sm">
                      <p className="text-slate-300">{candidate.destinationNeeds}</p>
                      <p className="mt-1 font-semibold text-[#ff8a8a]">{candidate.destinationNeedQty} unidades em falta</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-[#1b232b] bg-[#0d1117] px-3 py-2 text-sm text-slate-300">
                  Quantidade sugerida: <span className="font-semibold text-white">{candidate.transferableQty} unidades</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => void handleDecision(candidate, "accepted")}
                    disabled={processingMatch !== null}
                    className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition ${decision === "accepted"
                      ? "bg-[#68ddbd] text-[#08110f] shadow-[0_8px_18px_rgba(104,221,189,0.18)]"
                      : "border border-[#68ddbd]/30 bg-[#68ddbd]/10 text-[#68ddbd] hover:bg-[#68ddbd]/15"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {processingMatch === candidate.id ? "Processando..." : "Aceitar"}
                  </button>
                  <button
                    onClick={() => void handleDecision(candidate, "rejected")}
                    disabled={processingMatch !== null}
                    className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition ${decision === "rejected"
                      ? "bg-red-500 text-white shadow-[0_8px_18px_rgba(239,68,68,0.18)]"
                      : "border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Negar
                  </button>
                  <button
                    onClick={() => void handleDecision(candidate, "ignored")}
                    disabled={processingMatch !== null}
                    className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition ${decision === "ignored"
                      ? "bg-slate-600 text-white"
                      : "border border-slate-500/30 bg-[#101821] text-slate-300 hover:bg-[#171f27]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Ignorar
                  </button>
                </div>

                {decision && (
                  <div className="mt-3 rounded-lg border border-[#1b232b] bg-[#101821] px-3 py-2 text-xs text-slate-300">
                    Status: <span className="font-semibold text-white">{decision === "accepted" ? "Aceito" : decision === "rejected" ? "Negado" : "Ignorado"}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="overflow-x-auto border-t border-[#1b232b]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#111b22] text-left text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Medicamento</th>
                <th className="px-4 py-3 font-medium">De</th>
                <th className="px-4 py-3 font-medium">Para</th>
                <th className="px-4 py-3 font-medium">Qtd</th>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const sc = statusConfig[t.status];
                const Icon = sc.icon;
                return (
                  <tr key={t.id} className="border-t border-[#1b232b] hover:bg-[#111b22]">
                    <td className="px-4 py-3 font-medium text-white">{t.medicineName}</td>
                    <td className="px-4 py-3 text-slate-300">{getUnitName(t.fromUnitId)}</td>
                    <td className="px-4 py-3 text-slate-300">{getUnitName(t.toUnitId)}</td>
                    <td className="px-4 py-3 text-slate-200">{t.quantity} un.</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{t.requestedBy}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(t.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${sc.className}`}>
                        <Icon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#1b232b] bg-[#0d1117] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Nova recomendação</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Unidade de Origem</label>
                <select
                  required
                  value={form.fromUnitId}
                  onChange={(e) => setForm((f) => ({ ...f, fromUnitId: e.target.value }))}
                  className="w-full rounded-xl border border-[#1b232b] bg-[#111b22] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#68ddbd]/30"
                >
                  <option value="">Selecione…</option>
                  {data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Unidade de Destino</label>
                <select
                  required
                  value={form.toUnitId}
                  onChange={(e) => setForm((f) => ({ ...f, toUnitId: e.target.value }))}
                  className="w-full rounded-xl border border-[#1b232b] bg-[#111b22] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#68ddbd]/30"
                >
                  <option value="">Selecione…</option>
                  {data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Medicamento</label>
                <select
                  required
                  value={form.medicineId}
                  onChange={(e) => setForm((f) => ({ ...f, medicineId: e.target.value }))}
                  className="w-full rounded-xl border border-[#1b232b] bg-[#111b22] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#68ddbd]/30"
                >
                  <option value="">Selecione…</option>
                  {data.medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Quantidade</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="Ex: 50"
                  className="w-full rounded-xl border border-[#1b232b] bg-[#111b22] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#68ddbd]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Solicitante</label>
                <input
                  type="text"
                  value={form.requestedBy}
                  onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))}
                  placeholder="Nome do solicitante"
                  className="w-full rounded-xl border border-[#1b232b] bg-[#111b22] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#68ddbd]/30"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-[#1b232b] py-2.5 text-sm text-slate-300 hover:bg-[#111b22]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#68ddbd] py-2.5 text-sm font-semibold text-[#08110f] hover:bg-[#7ae0bc]"
                >
                  Criar recomendação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pending > 0 && !showForm && (
        <div className="flex items-center gap-2 rounded-xl border border-[#f3c96d]/20 bg-[#f3c96d]/10 px-4 py-3 text-sm text-[#f3c96d]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{pending} transferência(s) aguardando aprovação.</span>
        </div>
      )}
    </section>
  );
}
