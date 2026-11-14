import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import './LegalPage.css'

type LegalDocument = 'terms' | 'privacy'

const documentSections: Record<LegalDocument, { id: string; label: string }[]> = {
    terms: [
        { id: 'finalidade', label: 'Finalidade do portal' },
        { id: 'informacoes', label: 'Informações e serviços' },
        { id: 'uso-aceitavel', label: 'Uso aceitável' },
        { id: 'conteudo', label: 'Conteúdo e direitos' },
        { id: 'servicos-externos', label: 'Serviços externos' },
        { id: 'disponibilidade', label: 'Disponibilidade e alterações' },
        { id: 'lei-aplicavel', label: 'Lei aplicável e contato' },
    ],
    privacy: [
        { id: 'controlador', label: 'Controlador e contato' },
        { id: 'dados-finalidades', label: 'Dados e finalidades' },
        { id: 'bases', label: 'Bases legais' },
        { id: 'compartilhamento', label: 'Compartilhamento' },
        { id: 'cookies', label: 'Cookies e armazenamento' },
        { id: 'retencao', label: 'Retenção e descarte' },
        { id: 'direitos', label: 'Direitos dos titulares' },
        { id: 'seguranca', label: 'Segurança e atualizações' },
    ],
}

function LegalPage({ document }: { document: LegalDocument }) {
    const isPrivacy = document === 'privacy'
    const title = isPrivacy ? 'Política de Privacidade' : 'Termos de Uso'

    return (
        <>
            <Header />
            <main className="legal-page">
                <div className="legal-page-container">
                    <a className="legal-page-back" href="/">Voltar ao início</a>
                    <header className="legal-page-header">
                        <p className="legal-page-eyebrow">BROTANDO FEIRAS</p>
                        <h1>{title}</h1>
                        <p>Última atualização: 14 de novembro de 2026</p>
                    </header>

                    <div className="legal-page-layout">
                        <nav className="legal-page-toc" aria-label="Nesta página">
                            <h2>Nesta página</h2>
                            <ol>
                                {documentSections[document].map(({ id, label }) => (
                                    <li key={id}><a href={`#${id}`}>{label}</a></li>
                                ))}
                            </ol>
                        </nav>

                        {isPrivacy ? <PrivacyPolicy /> : <TermsOfUse />}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}

function PrivacyPolicy() {
    return (
        <article className="legal-page-article">
            <p className="legal-page-intro">
                Esta política explica como o Instituto Brotar, responsável pelo projeto Brotando Feiras,
                trata dados pessoais quando você navega pelo portal, fala com a equipe ou utiliza a área administrativa.
            </p>

            <section id="controlador">
                <h2>1. Controlador e contato</h2>
                <p>
                    O controlador dos dados pessoais tratados neste portal é o <strong>Instituto Brotar</strong>.
                    Para fazer uma solicitação sobre seus dados, use o <a href="/contato">formulário de contato</a>
                    e selecione “Dúvida” ou “Outro”, informando que o assunto é privacidade. O pedido será encaminhado
                    à equipe responsável.
                </p>
            </section>

            <section id="dados-finalidades">
                <h2>2. Dados tratados e finalidades</h2>
                <ul>
                    <li>
                        <strong>Mensagens de contato:</strong> nome, assunto, título e texto da mensagem; e-mail e telefone
                        são opcionais. Usamos esses dados para receber, organizar e responder dúvidas, sugestões,
                        reclamações e propostas de parceria.
                    </li>
                    <li>
                        <strong>Contas administrativas:</strong> nome, e-mail, função, foto de perfil, credenciais protegidas
                        por hash e dados técnicos de sessão. Esses dados permitem administrar o portal, proteger o acesso
                        e recuperar senhas. O portal não oferece contas para visitantes.
                    </li>
                    <li>
                        <strong>Perfis de produtores e eventos:</strong> nomes, localidades, informações de atividades,
                        produtos, datas, endereços, coordenadas e imagens que a equipe autorizada publica para apresentar
                        produtores e divulgar feiras e eventos.
                    </li>
                    <li>
                        <strong>Dados técnicos e de segurança:</strong> endereço IP, e-mail informado em tentativas de
                        acesso e informações da requisição podem ser tratados para proteger o serviço e limitar tentativas
                        automatizadas. Os controles de limite usam identificadores derivados por hash, em vez de guardar
                        esses identificadores em texto simples no registro do limite.
                    </li>
                    <li>
                        <strong>Preferências do navegador:</strong> a escolha entre tema claro e escuro é salva no
                        armazenamento local do navegador. Indicadores visuais de sessão e informações limitadas de perfil
                        administrativo também podem ser guardados no armazenamento local ou de sessão. O portal guarda
                        ainda no armazenamento local a informação de que o aviso de cookies foi fechado.
                    </li>
                </ul>
                <p>
                    A calculadora de precificação funciona no navegador: os valores digitados são usados para calcular o
                    resultado e não são enviados ao portal por esse recurso.
                </p>
            </section>

            <section id="bases">
                <h2>3. Bases legais e necessidade dos dados</h2>
                <p>
                    Tratamos cada categoria de dados conforme a finalidade, com fundamento aplicável na Lei Geral de
                    Proteção de Dados Pessoais (LGPD), como atender uma solicitação feita por você, cumprir obrigações
                    legais, proteger o portal e seus usuários ou, quando necessário, obter consentimento. Quando o
                    tratamento depender de consentimento, você poderá revogá-lo, sem afetar tratamentos anteriores
                    realizados validamente.
                </p>
                <p>
                    O nome e a mensagem são necessários para enviar o formulário. Informar e-mail ou telefone é opcional;
                    sem esses dados, talvez não seja possível responder por esses canais. As informações públicas sobre
                    produtores e eventos são fornecidas ou selecionadas pela equipe para divulgação do projeto.
                </p>
            </section>

            <section id="compartilhamento">
                <h2>4. Compartilhamento e serviços externos</h2>
                <p>
                    O Instituto Brotar permite acesso aos dados somente a pessoas autorizadas e a prestadores que apoiam
                    a operação do portal, conforme a necessidade do serviço e as instruções aplicáveis. A arquitetura
                    atual identifica os seguintes serviços:
                </p>
                <ul>
                    <li>Vercel, para hospedagem e disponibilização do site e do backend. As funções executam na região configurada para o projeto;</li>
                    <li>Aiven, para hospedagem do banco de dados MySQL, na região escolhida para o serviço contratado;</li>
                    <li>Cloudinary, para armazenamento e entrega de imagens publicadas no portal;</li>
                    <li>Resend, para enviar e-mails de recuperação de senha da área administrativa;</li>
                    <li>Photon, para busca de endereços usada pela equipe administrativa;</li>
                    <li>OpenStreetMap, cujos servidores de mapas recebem solicitações de tiles quando um mapa é exibido.</li>
                </ul>
                <p>
                    As configurações e informações públicas atuais dos fornecedores indicam: as funções da Vercel usam
                    Washington, D.C., nos Estados Unidos por padrão, salvo alteração nas configurações do projeto; o
                    armazenamento da Cloudinary usa centros de dados nos Estados Unidos por padrão; e a Resend mantém os
                    dados de clientes nos Estados Unidos. A região específica do banco de dados depende da opção feita
                    no serviço Aiven. Assim, mesmo com o portal voltado ao Brasil, parte do tratamento pode ocorrer fora
                    do país.
                </p>
                <p>
                    Fotos de eventos e imagens cadastradas para exibição pública podem ser entregues diretamente pela
                    rede do Cloudinary. Ao abrir um mapa, o navegador solicita imagens de mapa ao OpenStreetMap. A busca
                    de endereços é feita pelo backend junto ao Photon e pode incluir o texto pesquisado pelo administrador.
                    Os servidores externos podem receber dados técnicos da conexão necessários para responder à solicitação.
                </p>
                <p>
                    Links para Google Maps, WhatsApp e Instagram levam a serviços externos. Ao abrir um desses links,
                    os dados necessários para aquela função poderão ser enviados ao serviço escolhido, que aplica seus
                    próprios termos e sua própria política de privacidade. O mesmo vale para os fornecedores listados acima:
                </p>
                <ul className="legal-page-external-links">
                    <li><a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Privacidade da Vercel</a></li>
                    <li><a href="https://vercel.com/docs/functions/configuring-functions/region" target="_blank" rel="noreferrer">Regiões das funções da Vercel</a></li>
                    <li><a href="https://aiven.io/privacy" target="_blank" rel="noreferrer">Privacidade da Aiven</a></li>
                    <li><a href="https://cloudinary.com/privacy" target="_blank" rel="noreferrer">Privacidade da Cloudinary</a></li>
                    <li><a href="https://cloudinary.com/documentation/developer_onboarding_faq_storage" target="_blank" rel="noreferrer">Regiões de armazenamento da Cloudinary</a></li>
                    <li><a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer">Privacidade da Resend</a></li>
                    <li><a href="https://resend.com/security/gdpr" target="_blank" rel="noreferrer">Região de armazenamento da Resend</a></li>
                    <li><a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">Privacidade da OpenStreetMap Foundation</a></li>
                    <li><a href="https://operations.osmfoundation.org/policies/tiles/" target="_blank" rel="noreferrer">Regras de uso dos mapas OpenStreetMap</a></li>
                    <li><a href="https://github.com/komoot/photon" target="_blank" rel="noreferrer">Projeto Photon</a></li>
                    <li><a href="https://www.komoot.com/privacy" target="_blank" rel="noreferrer">Privacidade da Komoot</a></li>
                    <li><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacidade do Google</a></li>
                    <li><a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noreferrer">Privacidade do WhatsApp</a></li>
                    <li><a href="https://privacycenter.instagram.com/policy/" target="_blank" rel="noreferrer">Privacidade do Instagram</a></li>
                </ul>
                <p>
                    A infraestrutura e os prestadores podem estar localizados em países diferentes. Por isso, alguns dados
                    podem ser tratados fora do Brasil, conforme as regiões habilitadas em cada serviço. Eventuais
                    transferências internacionais devem estar amparadas nas hipóteses e nos mecanismos da LGPD e observar a
                    {' '}<a href="https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024" target="_blank" rel="noreferrer">regulamentação da ANPD</a>.
                </p>
                <p>
                    Se a equipe responder à sua mensagem por e-mail ou WhatsApp, o endereço de e-mail ou telefone que
                    você informou poderá ser enviado ao serviço escolhido. No WhatsApp, o link de resposta também inclui
                    seu nome e o título da mensagem para iniciar a conversa.
                </p>
                <p>
                    Ao abrir um mapa ou pedir uma rota, o navegador pode enviar ao fornecedor externo a localização pública
                    do evento consultado. Ao seguir um link para o Google Maps, o endereço do evento pode ser incluído
                    na solicitação feita a esse serviço.
                </p>
            </section>

            <section id="cookies">
                <h2>5. Cookies e armazenamento no navegador</h2>
                <p>
                    O portal usa um cookie técnico, restrito à área administrativa, para manter a sessão de acesso. Ele
                    é protegido para não ser lido por scripts da página e é necessário para autenticação e segurança.
                    Cada sessão tem validade técnica de até sete dias e pode ser encerrada antes pelo logout ou pela
                    administração. O portal também usa armazenamento local e de sessão para lembrar o tema escolhido e
                    exibir o estado da sessão administrativa. A opção de fechar o aviso de cookies também fica salva no
                    armazenamento local deste navegador.
                </p>
                <p>
                    No código do portal não há ferramentas de analytics nem pixels de publicidade. Se forem adicionadas
                    ferramentas opcionais de medição ou publicidade, esta política será atualizada e as opções de
                    consentimento serão apresentadas quando exigidas pela legislação.
                </p>
            </section>

            <section id="retencao">
                <h2>6. Retenção e descarte</h2>
                <p>
                    Não há um prazo fixo previamente definido para mensagens de contato ou registros de contas
                    administrativas. Os dados são mantidos enquanto forem necessários para a finalidade informada,
                    para a administração do portal, para a segurança ou para cumprir obrigações legais. Mensagens podem
                    ser excluídas pela equipe no painel administrativo; contas podem ser removidas pela administração.
                    Quando a finalidade terminar e não houver motivo legal para manter os dados, eles serão eliminados
                    ou anonimizados, respeitados os procedimentos técnicos de descarte e eventuais cópias de segurança.
                </p>
                <p>
                    Tokens de redefinição de senha são temporários, de uso único e expiram após 15 minutos. Cookies de
                    sessão expiram conforme a configuração técnica do serviço e podem ser apagados ao sair da área
                    administrativa ou pelo navegador.
                </p>
            </section>

            <section id="direitos">
                <h2>7. Seus direitos</h2>
                <p>
                    Nos termos da LGPD, você pode solicitar confirmação do tratamento e acesso aos dados, correção,
                    informações sobre compartilhamento, anonimização, bloqueio ou eliminação nos casos previstos em lei,
                    portabilidade quando aplicável e revogação de consentimento. Alguns pedidos podem ser limitados por
                    obrigações legais ou pela necessidade de resguardar direitos.
                </p>
                <p>
                    Para exercer esses direitos, use o <a href="/contato">formulário de contato</a> e identifique o pedido
                    como relacionado à privacidade. Poderemos solicitar informações razoáveis para confirmar sua identidade
                    e proteger seus dados. Você também pode consultar a página de
                    {' '}<a href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares" target="_blank" rel="noreferrer">direitos dos titulares da ANPD</a>.
                </p>
            </section>

            <section id="seguranca">
                <h2>8. Segurança e atualizações desta política</h2>
                <p>
                    Adotamos controles técnicos e administrativos compatíveis com o funcionamento do portal, incluindo
                    controle de acesso à área administrativa, proteção das credenciais e limitação de tentativas de uso
                    abusivo. Nenhuma transmissão ou armazenamento eletrônico é isento de riscos; se houver incidente
                    relevante que possa causar risco ou dano, serão adotadas as providências previstas em lei.
                </p>
                <p>
                    Esta política poderá ser atualizada quando o portal ou as práticas de tratamento mudarem. A data no
                    início da página indica a revisão mais recente. Para dúvidas, entre em contato pelo
                    {' '}<a href="/contato">canal do Instituto Brotar</a>.
                </p>
            </section>

            <p className="legal-page-reference">
                Referências: <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noreferrer">Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)</a>.
            </p>
        </article>
    )
}

function TermsOfUse() {
    return (
        <article className="legal-page-article">
            <p className="legal-page-intro">
                Estes termos explicam as regras para acessar e utilizar o portal Brotando Feiras, mantido pelo Instituto
                Brotar. Ao navegar no site, você concorda em respeitar estas condições e a
                {' '}<a href="/politica-de-privacidade">Política de Privacidade</a>.
            </p>

            <section id="finalidade">
                <h2>1. Finalidade do portal</h2>
                <p>
                    O Brotando Feiras divulga feiras e eventos, apresenta produtores e seus produtos, informa locais e
                    contatos e oferece uma calculadora de apoio à precificação. O portal é informativo e não realiza
                    compras, pagamentos, reservas ou intermediação de vendas entre visitantes e produtores.
                </p>
            </section>

            <section id="informacoes">
                <h2>2. Informações, eventos e calculadora</h2>
                <p>
                    A equipe procura manter corretos os dados de eventos, horários, locais, produtores e produtos, mas
                    datas, disponibilidade e informações podem mudar. Antes de se deslocar ou tomar uma decisão, confirme
                    os detalhes com a organização pelos canais de contato disponíveis.
                </p>
                <p>
                    A calculadora fornece estimativas a partir dos dados digitados por você. O resultado é uma referência
                    de planejamento, não uma garantia de preço, lucro, demanda, custo ou resultado comercial. A decisão
                    final sobre preços e vendas cabe ao produtor.
                </p>
            </section>

            <section id="uso-aceitavel">
                <h2>3. Uso aceitável</h2>
                <p>Ao utilizar o portal, você concorda em:</p>
                <ul>
                    <li>fornecer informações verdadeiras ao entrar em contato com a equipe;</li>
                    <li>não enviar conteúdo ilegal, abusivo, discriminatório, fraudulento ou que viole direitos de terceiros;</li>
                    <li>evitar incluir dados pessoais sensíveis ou informações de terceiros que não sejam necessárias para o assunto;</li>
                    <li>não tentar acessar contas, dados, sistemas ou áreas administrativas sem autorização;</li>
                    <li>não interferir no funcionamento do portal, contornar limites de acesso ou automatizar requisições de forma abusiva.</li>
                </ul>
                <p>
                    A área administrativa é reservada a pessoas autorizadas pelo Instituto Brotar. O acesso pode ser
                    suspenso ou encerrado quando necessário para proteger o portal, seus usuários ou os dados tratados.
                </p>
            </section>

            <section id="conteudo">
                <h2>4. Conteúdo e direitos</h2>
                <p>
                    Textos, marcas, identidade visual, fotografias e demais materiais do portal pertencem ao Instituto
                    Brotar, aos produtores ou aos respectivos titulares, conforme o caso. Não copie, altere ou reutilize
                    esses materiais de maneira que viole direitos autorais, de imagem ou outros direitos aplicáveis.
                </p>
                <p>
                    As mensagens enviadas pelo formulário são recebidas pela equipe e não são publicadas no site. A equipe
                    responsável por cadastrar conteúdo público deve ter autorização adequada para divulgar nomes, imagens,
                    descrições e informações de produtores e participantes. Se você identificar conteúdo que acredita
                    violar seus direitos, relate o endereço da página pelo
                    {' '}<a href="/contato">canal de contato</a> para análise.
                </p>
            </section>

            <section id="servicos-externos">
                <h2>5. Mapas e serviços externos</h2>
                <p>
                    O portal utiliza serviços de terceiros para mapas, armazenamento e entrega de imagens, hospedagem,
                    banco de dados e envio de mensagens de recuperação de senha. Links externos, como Google Maps,
                    WhatsApp e Instagram, levam a serviços sujeitos a seus próprios termos e políticas. O Instituto
                    Brotar não controla a disponibilidade nem o conteúdo desses serviços externos.
                </p>
            </section>

            <section id="disponibilidade">
                <h2>6. Disponibilidade e alterações</h2>
                <p>
                    O portal pode passar por manutenção, atualização ou interrupção temporária. Podemos alterar páginas,
                    recursos e estes termos para refletir mudanças no projeto ou nas regras aplicáveis. A versão vigente
                    estará disponível nesta página, com a data de atualização no início.
                </p>
                <p>
                    Na medida permitida pela legislação, o Instituto Brotar não garante que o site ou serviços externos
                    funcionarão sem interrupções ou erros. Esta cláusula não exclui direitos nem responsabilidades que
                    não possam ser afastados pela lei.
                </p>
            </section>

            <section id="lei-aplicavel">
                <h2>7. Lei aplicável e contato</h2>
                <p>
                    Estes termos são regidos pelas leis brasileiras. Eventuais conflitos serão tratados pelo foro
                    competente, respeitadas as regras legais de competência e os direitos do consumidor quando aplicáveis.
                </p>
                <p>
                    Para dúvidas, pedidos ou comunicações sobre estes termos, fale com o Instituto Brotar pelo
                    {' '}<a href="/contato">formulário de contato</a>.
                </p>
            </section>
        </article>
    )
}

export default LegalPage
