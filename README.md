This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses Tailwind CSS and system fonts configured in `app/globals.css` (`Inter`, `Segoe UI`, sans-serif) to deliver a clean MedTech visual style.

## Planilha de estoque

Use uma linha por combinação de unidade e medicamento. O arquivo pode ser CSV, XLSX ou TXT e deve conter, no mínimo, uma identificação válida de unidade, uma identificação válida de medicamento e `currentStock` (ou `estoqueAtual`/`estoque`).

O modelo completo está em [`public/modelo-estoque.csv`](public/modelo-estoque.csv) e pode ser aberto no Excel ou no Google Sheets. As colunas aceitas são:

| Coluna | Obrigatória | Descrição |
| --- | --- | --- |
| `unitId` ou `unitName` | Sim | ID ou nome exato da unidade cadastrada |
| `medicineId` ou `medicineName` | Sim | ID ou nome exato do medicamento cadastrado |
| `currentStock` | Não | Estoque atual; também aceita `estoqueAtual` ou `estoque` |
| `forecastConsumption` | Não | Previsão de consumo; também aceita `previsaoConsumo` |
| `actualConsumption` | Não | Consumo realizado |
| `financialRisk` | Não | Risco financeiro |
| `shortageRisk` | Não | Risco de ruptura |
| `leadTimeDays` | Não | Prazo de reposição em dias |
| `batch` | Não | Número do lote |
| `expiryDate` | Não | Validade no formato `AAAA-MM-DD` |

Na aba **Sincronizar Estoque**, envie o arquivo em **Carregar planilha**. Linhas com unidade ou medicamento inexistente são rejeitadas; as demais atualizam o registro existente ou criam um novo registro de estoque.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
