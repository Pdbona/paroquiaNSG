import React, { useState, useMemo } from 'react';
import '../styles/DonorForm.css';
import axios from 'axios';
import BrandLogo from './BrandLogo';
import { registrarDoacaoRateada, mensagemDeErro } from '../services/db';
import { garantirSessaoAnonima } from '../services/auth';
import { ratearEntreEquipes } from '../utils/agregacoes';
import {
  formatarCEP,
  formatarTelefone,
  formatarQuantidadeUnidade,
  somenteDigitos,
  emailValido,
  telefoneValido,
  cepValido,
  normalizarNome,
} from '../utils/formato';

function DonorForm({ equipes, itens, onVoltar }) {
  const [etapa, setEtapa] = useState('dados'); // dados, itens, confirmacao, sucesso
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cep: '',
    endereco: '',
    numero: '',
    referencia: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [itensSelecionados, setItensSelecionados] = useState([]);
  // Quantidade digitada em cada card da prateleira, por chave do item — só
  // entra no pedido quando a pessoa clica em Adicionar.
  const [quantidadesPrateleira, setQuantidadesPrateleira] = useState({});
  const [erro, setErro] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Só oferece itens de equipes ativas.
  const equipesAtivas = useMemo(
    () => equipes.filter((equipe) => equipe.ativa !== false),
    [equipes]
  );

  const itensDisponiveis = useMemo(() => {
    const idsAtivos = new Set(equipesAtivas.map((equipe) => equipe.id));
    return itens.filter((item) => item.ativo !== false && idsAtivos.has(item.equipe_id));
  }, [itens, equipesAtivas]);

  /**
   * O doador não escolhe equipe — vê um catálogo único, com a quantidade
   * somada de todas as equipes que pedem aquele item (mesmo nome). O rateio
   * entre equipes acontece na hora de gravar, em confirmarDoacao.
   *
   * "necessario" aqui é o que AINDA FALTA (meta menos o que já foi
   * registrado como doado), não a meta original — "itens.recebido" sobe na
   * hora do registro da doação (registrarDoacaoRateada), mesmo antes da
   * entrega/retirada acontecer de verdade. Isso evita o catálogo continuar
   * pedindo um item que já foi todo prometido por outra pessoa, e atualiza
   * sozinho pra quem está com a tela aberta (onSnapshot em tempo real).
   * Item com meta zerada some da prateleira — não fica mais disponível pra
   * doação.
   */
  const catalogo = useMemo(() => {
    const grupos = new Map();
    itensDisponiveis.forEach((item) => {
      const chave = normalizarNome(item.nome);
      const faltam = Math.max(0, (Number(item.quantidade) || 0) - (Number(item.recebido) || 0));
      if (!grupos.has(chave)) {
        // A unidade vem do primeiro item encontrado com esse nome — equipes
        // diferentes pedindo o "mesmo" item devem usar a mesma unidade
        // (ver aviso no REGRAS_FIREBASE.txt).
        grupos.set(chave, { chave, nome: item.nome, unidade: item.unidade || '', necessario: 0 });
      }
      grupos.get(chave).necessario += faltam;
    });
    return [...grupos.values()]
      .filter((grupo) => grupo.necessario > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [itensDisponiveis]);

  const handleInputChange = (evento) => {
    const { name, value } = evento.target;

    let valorTratado = value;
    if (name === 'telefone') valorTratado = formatarTelefone(value);
    if (name === 'cep') valorTratado = formatarCEP(value);

    setFormData((anterior) => ({ ...anterior, [name]: valorTratado }));
  };

  const buscarCEP = async () => {
    const cep = somenteDigitos(formData.cep);

    if (!cepValido(cep)) {
      setErro('O CEP deve ter 8 dígitos');
      return;
    }

    try {
      setBuscandoCep(true);
      setErro('');
      const resposta = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

      if (resposta.data.erro) {
        setErro('CEP não encontrado');
        return;
      }

      setFormData((anterior) => ({
        ...anterior,
        endereco: resposta.data.logradouro || '',
        bairro: resposta.data.bairro || '',
        cidade: resposta.data.localidade || '',
        estado: resposta.data.uf || '',
      }));
    } catch (problema) {
      setErro('Não foi possível consultar o CEP. Preencha o endereço na mão.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const irParaItens = () => {
    setErro('');

    if (!formData.nome.trim()) {
      setErro('Digite seu nome');
      return;
    }
    if (!formData.telefone.trim()) {
      setErro('Digite seu telefone');
      return;
    }
    if (!telefoneValido(formData.telefone)) {
      setErro('Telefone inválido. Use DDD + número, ex: (11) 98765-4321');
      return;
    }
    if (!formData.email.trim()) {
      setErro('Digite seu e-mail');
      return;
    }
    if (!emailValido(formData.email)) {
      setErro('E-mail inválido');
      return;
    }
    if (!formData.cep.trim()) {
      setErro('Digite seu CEP');
      return;
    }
    if (!cepValido(formData.cep)) {
      setErro('O CEP deve ter 8 dígitos');
      return;
    }

    if (itensDisponiveis.length === 0) {
      setErro('Ainda não há itens cadastrados para doação. Tente novamente mais tarde.');
      return;
    }

    setEtapa('itens');
  };

  // Valor mostrado no campo de quantidade do card: o que a pessoa está
  // digitando agora, ou — se ainda não mexeu — o que já está no carrinho.
  const quantidadeNoCard = (grupo, carrinho) => {
    if (quantidadesPrateleira[grupo.chave] !== undefined) return quantidadesPrateleira[grupo.chave];
    return carrinho ? String(carrinho.quantidade) : '1';
  };

  const definirQuantidadeNoCard = (chave, valor) => {
    setQuantidadesPrateleira((anterior) => ({ ...anterior, [chave]: valor }));
  };

  const adicionarAoCarrinho = (grupo) => {
    setErro('');

    const jaNoCarrinho = itensSelecionados.find((registro) => registro.chave === grupo.chave);
    const quantidadeNumero = parseInt(quantidadeNoCard(grupo, jaNoCarrinho), 10);

    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) {
      setErro(`Digite uma quantidade maior que zero para "${grupo.nome}"`);
      return;
    }

    setItensSelecionados((anterior) => {
      if (jaNoCarrinho) {
        return anterior.map((registro) =>
          registro.chave === grupo.chave ? { ...registro, quantidade: quantidadeNumero } : registro
        );
      }
      return [
        ...anterior,
        { chave: grupo.chave, nome: grupo.nome, unidade: grupo.unidade, quantidade: quantidadeNumero },
      ];
    });
  };

  const removerItem = (chave) => {
    setItensSelecionados((anterior) => anterior.filter((item) => item.chave !== chave));
    setQuantidadesPrateleira((anterior) => {
      const copia = { ...anterior };
      delete copia[chave];
      return copia;
    });
  };

  const irParaConfirmacao = () => {
    if (itensSelecionados.length === 0) {
      setErro('Selecione pelo menos um item');
      return;
    }
    setErro('');
    setEtapa('confirmacao');
  };

  const confirmarDoacao = async () => {
    try {
      setSalvando(true);
      setErro('');

      // O login anônimo do App.jsx roda no carregamento da página, em segundo
      // plano — se ele falhar naquele momento (comum em navegadores internos
      // de app, tipo WhatsApp/Instagram, que bloqueiam o armazenamento que o
      // Firebase Auth usa), o app segue funcionando normalmente até cair bem
      // aqui, na hora de gravar. Tenta de novo agora, que é quando realmente
      // importa: se conseguir, a gravação segue normal; se não conseguir e as
      // regras exigirem login, o catch abaixo mostra um aviso que a pessoa
      // consegue agir (não a mensagem técnica pensada pro Admin).
      await garantirSessaoAnonima();

      const dadosDoador = {
        doador_nome: formData.nome.trim(),
        doador_email: formData.email.trim(),
        doador_telefone: formData.telefone,
        doador_cep: formData.cep,
        doador_endereco: formData.endereco,
        doador_numero: formData.numero,
        doador_referencia: formData.referencia,
        doador_bairro: formData.bairro,
        doador_cidade: formData.cidade,
        doador_estado: formData.estado,
        data_criacao: new Date(),
        entregue: false,
      };

      // Rateia cada item do carrinho entre as equipes que o pedem, com base
      // no estado mais atual de itens (chega em tempo real via onSnapshot).
      const alocacoes = itensSelecionados.flatMap((entrada) => {
        const itensDoGrupo = itensDisponiveis.filter(
          (item) => normalizarNome(item.nome) === entrada.chave
        );
        const registros = itensDoGrupo.map((item) => {
          const equipe = equipes.find((registro) => registro.id === item.equipe_id);
          return {
            id: item.id,
            equipeId: item.equipe_id,
            equipeNome: equipe ? equipe.nome : '',
            necessario: Number(item.quantidade) || 0,
            recebido: Number(item.recebido) || 0,
          };
        });

        if (registros.length === 0) return [];

        const equipePorItem = new Map(registros.map((r) => [r.id, r.equipeId]));
        return ratearEntreEquipes(entrada.quantidade, registros)
          .filter((parte) => parte.quantidade > 0)
          .map((parte) => ({
            itemId: parte.id,
            equipeId: equipePorItem.get(parte.id),
            itemNome: entrada.nome,
            itemUnidade: entrada.unidade,
            quantidade: parte.quantidade,
          }));
      });

      if (alocacoes.length === 0) {
        setErro('Não foi possível registrar a doação. Atualize a página e tente de novo.');
        return;
      }

      await registrarDoacaoRateada(alocacoes, dadosDoador);
      setEtapa('sucesso');
    } catch (problema) {
      // "permission-denied" aqui, depois de já ter tentado o login anônimo de
      // novo acima, quase sempre é o navegador bloqueando o login (WhatsApp/
      // Instagram in-app, ou modo privado) — não faz sentido mandar o doador
      // conferir o Firebase Console (mensagemDeErro é escrita pro Admin).
      if (problema?.code === 'permission-denied') {
        setErro(
          'Não foi possível registrar sua doação agora. Isso costuma acontecer quando o link é ' +
            'aberto pelo navegador interno do WhatsApp ou Instagram. Toque em "⋮" ou no ícone de ' +
            'compartilhar e escolha "Abrir no navegador" (Chrome ou Safari), depois registre de ' +
            'novo. Se o problema continuar, avise a organização do evento.'
        );
      } else {
        setErro(`Erro ao registrar doação: ${mensagemDeErro(problema)}`);
      }
    } finally {
      setSalvando(false);
    }
  };

  // Mantém os dados de contato e limpa só os itens: é comum a pessoa lembrar
  // de mais uma coisa logo depois de registrar.
  const novaDoacao = () => {
    setItensSelecionados([]);
    setQuantidadesPrateleira({});
    setErro('');
    setEtapa('itens');
  };

  const recomecar = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cep: '',
      endereco: '',
      numero: '',
      referencia: '',
      bairro: '',
      cidade: '',
      estado: '',
    });
    setItensSelecionados([]);
    setQuantidadesPrateleira({});
    setErro('');
    setEtapa('dados');
    onVoltar();
  };

  // Só aparece em telas largas (ver .tela-dividida/.painel-marca no CSS) —
  // no celular a logo pequena dentro do cartão já cobre a marca.
  const painelMarca = (
    <div className="painel-marca">
      <BrandLogo variante="lateral" />
      <p className="painel-marca-legenda">
        II Encontro de Jovens com Cristo
        <br />
        Paróquia Nossa Senhora de Guadalupe
      </p>
    </div>
  );

  if (etapa === 'sucesso') {
    return (
      <div className="donor-container">
        <div className="tela-dividida">
          {painelMarca}
          <div className="donor-card sucesso">
            <div className="sucesso-icon">✅</div>
            <h2>Muito Obrigado!</h2>
            <p>Sua doação foi registrada com sucesso.</p>
            <p className="mensagem-secundaria">
              Em breve entraremos em contato para combinar a entrega ou a retirada da sua doação.
            </p>
            <button onClick={recomecar} className="btn-primary">
              Voltar ao Início
            </button>
            <button onClick={novaDoacao} className="btn-secondary botao-largo">
              Registrar outra doação
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="donor-container">
      <div className="tela-dividida">
        {painelMarca}
        <div className="donor-card">
        <div className="donor-header">
          <BrandLogo variante="cartao" />
          <h1>🎁 Fazer Doação</h1>
          <p>II Encontro de Jovens com Cristo</p>
          <p className="donor-subtitle">Paróquia Nossa Senhora de Guadalupe</p>
          <div className="etapas">
            <div
              className={`etapa ${etapa === 'dados' ? 'ativa' : ''} ${
                ['itens', 'confirmacao'].includes(etapa) ? 'completa' : ''
              }`}
            >
              1. Dados
            </div>
            <div
              className={`etapa ${etapa === 'itens' ? 'ativa' : ''} ${
                etapa === 'confirmacao' ? 'completa' : ''
              }`}
            >
              2. Itens
            </div>
            <div className={`etapa ${etapa === 'confirmacao' ? 'ativa' : ''}`}>
              3. Confirmação
            </div>
          </div>
        </div>

        {erro && <div className="alerta alerta-erro">{erro}</div>}

        {etapa === 'dados' && (
          <div className="donor-formulario">
            <h3>Suas Informações</h3>

            <div className="formulario-grupo">
              <label>Nome Completo *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Seu nome"
              />
            </div>

            <div className="formulario-grupo">
              <label>E-mail *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
              />
            </div>

            <div className="formulario-grupo">
              <label>Telefone (com WhatsApp) *</label>
              <input
                type="tel"
                name="telefone"
                inputMode="numeric"
                value={formData.telefone}
                onChange={handleInputChange}
                placeholder="(11) 98765-4321"
              />
            </div>

            <div className="formulario-grupo">
              <label>CEP *</label>
              <div className="cep-input">
                <input
                  type="text"
                  name="cep"
                  inputMode="numeric"
                  value={formData.cep}
                  onChange={handleInputChange}
                  onBlur={() => cepValido(formData.cep) && buscarCEP()}
                  placeholder="00000-000"
                  maxLength="9"
                />
                <button onClick={buscarCEP} disabled={buscandoCep}>
                  {buscandoCep ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {(formData.endereco || formData.cidade) && (
              <>
                <div className="formulario-grupo">
                  <label>Endereço</label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    placeholder="Rua"
                  />
                </div>

                <div className="linha-dupla">
                  <div className="formulario-grupo campo-numero">
                    <label>Número</label>
                    <input
                      type="text"
                      name="numero"
                      value={formData.numero}
                      onChange={handleInputChange}
                      placeholder="Ex: 123"
                    />
                  </div>
                  <div className="formulario-grupo">
                    <label>Ponto de Referência</label>
                    <input
                      type="text"
                      name="referencia"
                      value={formData.referencia}
                      onChange={handleInputChange}
                      placeholder="Ex: perto da padaria, portão azul"
                    />
                  </div>
                </div>

                <div className="linha-dupla">
                  <div className="formulario-grupo">
                    <label>Bairro</label>
                    <input
                      type="text"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="formulario-grupo">
                    <label>Cidade</label>
                    <input
                      type="text"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="formulario-grupo campo-uf">
                    <label>UF</label>
                    <input
                      type="text"
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                      maxLength="2"
                    />
                  </div>
                </div>
              </>
            )}

            <button onClick={irParaItens} className="btn-primary botao-largo">
              Próximo: Selecionar Itens
            </button>

            <button onClick={onVoltar} className="btn-secondary botao-largo">
              Voltar
            </button>
          </div>
        )}

        {etapa === 'itens' && (
          <div className="donor-formulario">
            <h3>Escolha na Prateleira</h3>
            <p className="texto-apoio">
              Toque na quantidade que você quer doar de cada item e clique em Adicionar.
            </p>

            <div className="grade-prateleira">
              {catalogo.map((grupo) => {
                const noCarrinho = itensSelecionados.find(
                  (registro) => registro.chave === grupo.chave
                );
                return (
                  <div
                    key={grupo.chave}
                    className={`item-prateleira ${noCarrinho ? 'no-carrinho' : ''}`}
                  >
                    {noCarrinho && <span className="selo-carrinho">🛒 No pedido</span>}
                    <div className="item-prateleira-nome">{grupo.nome}</div>
                    <div className="item-prateleira-meta">
                      Precisa de {formatarQuantidadeUnidade(grupo.necessario, grupo.unidade)}
                    </div>
                    <div className="item-prateleira-acoes">
                      <input
                        type="number"
                        min="1"
                        value={quantidadeNoCard(grupo, noCarrinho)}
                        onChange={(evento) =>
                          definirQuantidadeNoCard(grupo.chave, evento.target.value)
                        }
                        className="input-quantidade"
                        aria-label={`Quantidade de ${grupo.nome}`}
                      />
                      <button
                        className="btn-dourado btn-mini"
                        onClick={() => adicionarAoCarrinho(grupo)}
                      >
                        {noCarrinho ? 'Atualizar' : '+ Adicionar'}
                      </button>
                    </div>
                    {noCarrinho && (
                      <button className="link-remover" onClick={() => removerItem(grupo.chave)}>
                        Remover do pedido
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {itensSelecionados.length > 0 && (
              <div className="bloco-itens">
                <h3>Itens Selecionados ({itensSelecionados.length})</h3>
                <div className="itens-selecionados">
                  {itensSelecionados.map((item) => (
                    <div key={item.chave} className="item-selecionado">
                      <div className="item-info">
                        <strong>{item.nome}</strong>
                        <span>{formatarQuantidadeUnidade(item.quantidade, item.unidade)}</span>
                      </div>
                      <button
                        onClick={() => removerItem(item.chave)}
                        className="btn-danger btn-mini"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <button onClick={irParaConfirmacao} className="btn-primary botao-largo">
                  Próximo: Confirmar Doação
                </button>
              </div>
            )}

            <button onClick={() => setEtapa('dados')} className="btn-secondary botao-largo">
              Voltar
            </button>
          </div>
        )}

        {etapa === 'confirmacao' && (
          <div className="donor-formulario">
            <h3>Confirme Seus Dados</h3>

            <div className="confirmacao-secao">
              <h4>Dados Pessoais</h4>
              <p>
                <strong>Nome:</strong> {formData.nome}
              </p>
              <p>
                <strong>E-mail:</strong> {formData.email}
              </p>
              <p>
                <strong>Telefone:</strong> {formData.telefone}
              </p>
              {formData.cidade && (
                <p>
                  <strong>Localidade:</strong> {formData.endereco ? `${formData.endereco}` : ''}
                  {formData.numero ? `, ${formData.numero}` : ''}
                  {formData.bairro ? ` — ${formData.bairro}` : ''}
                  {formData.cidade ? `, ${formData.cidade}` : ''}
                  {formData.estado ? `/${formData.estado}` : ''}
                  {formData.referencia ? ` (${formData.referencia})` : ''}
                </p>
              )}
            </div>

            <div className="confirmacao-secao">
              <h4>Itens a Doar</h4>
              {itensSelecionados.map((item) => (
                <div key={item.chave} className="item-confirmacao">
                  <span>
                    <strong>{item.nome}</strong>
                  </span>
                  <span>{formatarQuantidadeUnidade(item.quantidade, item.unidade)}</span>
                </div>
              ))}
            </div>

            <div className="alerta alerta-info">
              ℹ️ Você concorda que seus dados serão usados apenas para coordenar a coleta da
              doação.
            </div>

            <button
              onClick={confirmarDoacao}
              disabled={salvando}
              className="btn-primary botao-largo"
            >
              {salvando ? 'Registrando...' : '✅ Confirmar e Registrar Doação'}
            </button>

            <button
              onClick={() => setEtapa('itens')}
              className="btn-secondary botao-largo"
              disabled={salvando}
            >
              Voltar
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default DonorForm;
