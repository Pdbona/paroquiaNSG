import React, { useState, useMemo } from 'react';
import '../styles/DonorForm.css';
import axios from 'axios';
import BrandLogo from './BrandLogo';
import { adicionar, mensagemDeErro } from '../services/db';
import {
  formatarCEP,
  formatarTelefone,
  somenteDigitos,
  emailValido,
  telefoneValido,
  cepValido,
} from '../utils/formato';

function DonorForm({ equipes, itens, onVoltar }) {
  const [etapa, setEtapa] = useState('dados'); // dados, itens, confirmacao, sucesso
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cep: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [itensSelecionados, setItensSelecionados] = useState([]);
  // Quantidade digitada em cada card da prateleira, por item_id — só entra
  // no pedido quando a pessoa clica em Adicionar.
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

  const itensPorEquipe = useMemo(() => {
    return equipesAtivas
      .map((equipe) => ({
        equipe,
        itens: itensDisponiveis.filter((item) => item.equipe_id === equipe.id),
      }))
      .filter((grupo) => grupo.itens.length > 0);
  }, [equipesAtivas, itensDisponiveis]);

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
    if (formData.cep && !cepValido(formData.cep)) {
      setErro('O CEP deve ter 8 dígitos (ou deixe em branco)');
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
  const quantidadeNoCard = (item, carrinho) => {
    if (quantidadesPrateleira[item.id] !== undefined) return quantidadesPrateleira[item.id];
    return carrinho ? String(carrinho.quantidade) : '1';
  };

  const definirQuantidadeNoCard = (itemId, valor) => {
    setQuantidadesPrateleira((anterior) => ({ ...anterior, [itemId]: valor }));
  };

  const adicionarAoCarrinho = (item) => {
    setErro('');

    const jaNoCarrinho = itensSelecionados.find((registro) => registro.id === item.id);
    const quantidadeNumero = parseInt(quantidadeNoCard(item, jaNoCarrinho), 10);

    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) {
      setErro(`Digite uma quantidade maior que zero para "${item.nome}"`);
      return;
    }

    setItensSelecionados((anterior) => {
      if (jaNoCarrinho) {
        return anterior.map((registro) =>
          registro.id === item.id ? { ...registro, quantidade: quantidadeNumero } : registro
        );
      }
      return [
        ...anterior,
        {
          id: item.id,
          nome: item.nome,
          quantidade: quantidadeNumero,
          equipe_id: item.equipe_id,
        },
      ];
    });
  };

  const removerItem = (id) => {
    setItensSelecionados((anterior) => anterior.filter((item) => item.id !== id));
    setQuantidadesPrateleira((anterior) => {
      const copia = { ...anterior };
      delete copia[id];
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

      const base = {
        doador_nome: formData.nome.trim(),
        doador_email: formData.email.trim(),
        doador_telefone: formData.telefone,
        doador_cep: formData.cep,
        doador_endereco: formData.endereco,
        doador_bairro: formData.bairro,
        doador_cidade: formData.cidade,
        doador_estado: formData.estado,
        data_criacao: new Date(),
        entregue: false,
      };

      // Um documento por item: cada equipe acompanha o que é dela.
      await Promise.all(
        itensSelecionados.map((item) =>
          adicionar('doacoes', {
            ...base,
            item_id: item.id,
            item_nome: item.nome,
            quantidade: item.quantidade,
            equipe_id: item.equipe_id,
          })
        )
      );

      setEtapa('sucesso');
    } catch (problema) {
      setErro(`Erro ao registrar doação: ${mensagemDeErro(problema)}`);
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

  if (etapa === 'sucesso') {
    return (
      <div className="donor-container">
        <BrandLogo variante="lateral" />
        <div className="donor-card sucesso">
          <div className="sucesso-icon">✅</div>
          <h2>Muito Obrigado!</h2>
          <p>Sua doação foi registrada com sucesso.</p>
          <p className="mensagem-secundaria">
            A equipe entrará em contato pelo telefone <strong>{formData.telefone}</strong> para
            combinar a entrega.
          </p>
          <button onClick={recomecar} className="btn-primary">
            Voltar ao Início
          </button>
          <button onClick={novaDoacao} className="btn-secondary botao-largo">
            Registrar outra doação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="donor-container">
      <BrandLogo variante="lateral" />
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
              <label>CEP (opcional)</label>
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
                    placeholder="Rua e número"
                  />
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

            {itensPorEquipe.map((grupo) => (
              <div key={grupo.equipe.id} className="prateleira-equipe">
                <h4 className="prateleira-titulo">{grupo.equipe.nome}</h4>
                <div className="grade-prateleira">
                  {grupo.itens.map((item) => {
                    const noCarrinho = itensSelecionados.find(
                      (registro) => registro.id === item.id
                    );
                    return (
                      <div
                        key={item.id}
                        className={`item-prateleira ${noCarrinho ? 'no-carrinho' : ''}`}
                      >
                        {noCarrinho && <span className="selo-carrinho">🛒 No pedido</span>}
                        <div className="item-prateleira-nome">{item.nome}</div>
                        <div className="item-prateleira-meta">Precisa de {item.quantidade}</div>
                        <div className="item-prateleira-acoes">
                          <input
                            type="number"
                            min="1"
                            value={quantidadeNoCard(item, noCarrinho)}
                            onChange={(evento) =>
                              definirQuantidadeNoCard(item.id, evento.target.value)
                            }
                            className="input-quantidade"
                            aria-label={`Quantidade de ${item.nome}`}
                          />
                          <button
                            className="btn-dourado btn-mini"
                            onClick={() => adicionarAoCarrinho(item)}
                          >
                            {noCarrinho ? 'Atualizar' : '+ Adicionar'}
                          </button>
                        </div>
                        {noCarrinho && (
                          <button
                            className="link-remover"
                            onClick={() => removerItem(item.id)}
                          >
                            Remover do pedido
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {itensSelecionados.length > 0 && (
              <div className="bloco-itens">
                <h3>Itens Selecionados ({itensSelecionados.length})</h3>
                <div className="itens-selecionados">
                  {itensSelecionados.map((item) => (
                    <div key={item.id} className="item-selecionado">
                      <div className="item-info">
                        <strong>{item.nome}</strong>
                        <span>
                          {item.quantidade} unidade{item.quantidade > 1 ? 's' : ''}
                        </span>
                      </div>
                      <button onClick={() => removerItem(item.id)} className="btn-danger btn-mini">
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
                  <strong>Localidade:</strong> {formData.endereco ? `${formData.endereco}, ` : ''}
                  {formData.bairro ? `${formData.bairro}, ` : ''}
                  {formData.cidade}/{formData.estado}
                </p>
              )}
            </div>

            <div className="confirmacao-secao">
              <h4>Itens a Doar</h4>
              {itensSelecionados.map((item) => {
                const equipe = equipes.find((registro) => registro.id === item.equipe_id);
                return (
                  <div key={item.id} className="item-confirmacao">
                    <span>
                      <strong>{item.nome}</strong>
                      {equipe && <small> · {equipe.nome}</small>}
                    </span>
                    <span>
                      {item.quantidade} unidade{item.quantidade > 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
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
  );
}

export default DonorForm;
