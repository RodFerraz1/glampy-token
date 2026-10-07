"use client";

import { useActionState } from "react";
import {
  importarVersao1,
  publicar,
  salvarBeneficio,
  type EstadoDaPublicacao,
  type ValoresDoBeneficio,
} from "@/app/ibiti/beneficios/catalogo/acoes";
import { CATEGORIAS } from "@/catalogo/categorias";
import { classeDeCampo } from "@/components/landing/base";
import { classeDoPrimario, classeDoSecundario, classeDoTexto, Erro } from "@/components/plataforma/formulario";

const VAZIO: ValoresDoBeneficio = { nome: "", descricao: "", categoria: "", imagemUrl: "", precoTabela: "", ativo: true };

const reaisParaCampo = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

export interface BeneficioEditavel {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  imagemUrl: string | null;
  precoTabelaCentavos: number;
  ativo: boolean;
}

export function FormularioDoBeneficio({ beneficio }: { beneficio?: BeneficioEditavel }) {
  const [estado, acao, salvando] = useActionState(salvarBeneficio.bind(null, beneficio?.id ?? null), {});
  const campo = (nome: string) => `${nome}-${beneficio?.id ?? "novo"}`;
  const valores: ValoresDoBeneficio =
    estado.valores ??
    (beneficio
      ? {
          nome: beneficio.nome,
          descricao: beneficio.descricao ?? "",
          categoria: beneficio.categoria,
          imagemUrl: beneficio.imagemUrl ?? "",
          precoTabela: reaisParaCampo(beneficio.precoTabelaCentavos),
          ativo: beneficio.ativo,
        }
      : VAZIO);

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor={campo("nome")} className="block text-[15px] font-medium">
          Nome
        </label>
        <input id={campo("nome")} name="nome" required defaultValue={valores.nome} className={`mt-2 ${classeDeCampo}`} />
      </div>
      <div>
        <label htmlFor={campo("descricao")} className="block text-[15px] font-medium">
          Descrição
        </label>
        <textarea
          id={campo("descricao")}
          name="descricao"
          rows={2}
          defaultValue={valores.descricao}
          className={`mt-2 ${classeDoTexto}`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={campo("categoria")} className="block text-[15px] font-medium">
            Categoria
          </label>
          <select
            id={campo("categoria")}
            name="categoria"
            required
            defaultValue={valores.categoria}
            className={`mt-2 ${classeDeCampo}`}
          >
            <option value="" disabled>
              Escolha
            </option>
            {CATEGORIAS.map((categoria) => (
              <option key={categoria}>{categoria}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={campo("preco")} className="block text-[15px] font-medium">
            Preço de tabela (R$)
          </label>
          <input
            id={campo("preco")}
            name="precoTabela"
            required
            inputMode="decimal"
            placeholder="1.500,00"
            defaultValue={valores.precoTabela}
            aria-describedby={campo("preco-nota")}
            className={`mt-2 ${classeDeCampo}`}
          />
          <p id={campo("preco-nota")} className="mt-1 text-sm text-cinza">
            O resgate custa 60% deste valor.
          </p>
        </div>
      </div>
      <div>
        <label htmlFor={campo("imagem")} className="block text-[15px] font-medium">
          Link da imagem
        </label>
        <input
          id={campo("imagem")}
          name="imagemUrl"
          type="url"
          placeholder="https://"
          defaultValue={valores.imagemUrl}
          className={`mt-2 ${classeDeCampo}`}
        />
      </div>
      {beneficio ? (
        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" name="ativo" value="sim" defaultChecked={valores.ativo} className="size-5 accent-folha" />
          Ativo: entra na próxima versão publicada
        </label>
      ) : (
        <input type="hidden" name="ativo" value="sim" />
      )}
      <Erro>{estado.erro}</Erro>
      <button type="submit" disabled={salvando} className={`w-full sm:w-auto ${classeDoPrimario}`}>
        {salvando ? "Salvando…" : beneficio ? "Salvar alterações" : "Criar benefício"}
      </button>
    </form>
  );
}

function AcaoDoCatalogo({
  acao,
  rotulo,
  andamento,
  primario,
}: {
  acao: () => Promise<EstadoDaPublicacao>;
  rotulo: string;
  andamento: string;
  primario?: boolean;
}) {
  const [estado, executar, executando] = useActionState(acao, {});
  return (
    <form action={executar} className="space-y-3">
      <Erro>{estado.erro}</Erro>
      {estado.mensagem && (
        <p role="status" className="rounded-lg bg-musgo px-4 py-3 text-[15px] text-folha">
          {estado.mensagem}
        </p>
      )}
      <button
        type="submit"
        disabled={executando}
        className={`w-full sm:w-auto ${primario ? classeDoPrimario : classeDoSecundario}`}
      >
        {executando ? andamento : rotulo}
      </button>
    </form>
  );
}

export const PublicarCatalogo = () => (
  <AcaoDoCatalogo acao={publicar} rotulo="Publicar nova versão" andamento="Publicando on-chain…" primario />
);

export const ImportarVersao1 = () => (
  <AcaoDoCatalogo acao={importarVersao1} rotulo="Importar a versão 1" andamento="Conferindo o hash e importando…" />
);
