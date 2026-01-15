import { Link } from 'react-router-dom';
import mesafacil from '@/assets/mesafacil.png';
import { useEffect } from 'react';

export default function PrivacyPage() {
    useEffect(() => window.scrollTo(0, 0));
    
    return (
        <div className="font-inter min-h-screen bg-gray-50">
            {/* Header */}
            <header className="w-full bg-white flex justify-between items-center px-8 py-4 shadow-md">
                <Link to="/">
                    <img src={mesafacil} alt="logo" className="w-40 sm:w-32" />
                </Link>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12 max-w-5xl">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Políticas de Privacidade</h1>

                    <div className="prose max-w-none">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">POLÍTICA DE PRIVACIDADE – MESA FÁCIL</h2>
                        <p className="text-gray-600 mb-6"><strong>Última atualização:</strong> 14 de janeiro de 2026</p>

                        <p className="mb-4">
                            A presente <strong>Política de Privacidade</strong> tem como objetivo demonstrar o compromisso da <strong>IDEIA LTDA.</strong> com
                            a privacidade, a segurança e a proteção dos dados pessoais coletados de usuários e parceiros da plataforma <strong>MesaFácil</strong>,
                            em conformidade com a <strong>Lei nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD)</strong> e demais legislações
                            aplicáveis.
                        </p>
                        <p className="mb-4">
                            Ao acessar ou utilizar os serviços da plataforma MesaFácil, o usuário declara estar ciente e de acordo com as práticas descritas
                            nesta Política.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">1. INFORMAÇÕES COLETADAS</h3>
                        <p className="mb-4">
                            A MesaFácil poderá coletar dados pessoais de acordo com o tipo de usuário e a funcionalidade utilizada.
                        </p>
                        <p className="font-medium mb-2">1.1. Usuários finais (clientes dos restaurantes)</p>
                        <p className="mb-2">Poderão ser coletados:</p>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>Dados de identificação, como nome;</li>
                            <li>Endereço de entrega, <strong>exclusivamente nos casos de pedidos na modalidade delivery</strong>;</li>
                            <li>Dados de contato, como e-mail, quando houver cadastro;</li>
                            <li>Dados de navegação, como endereço IP, localização aproximada, tipo de dispositivo e sistema operacional;</li>
                            <li>Informações relacionadas aos pedidos realizados;</li>
                            <li>Dados de pagamento, os quais são <strong>processados por plataformas terceiras</strong>, não sendo armazenados pela MesaFácil.</li>
                        </ul>

                        <p className="font-medium mb-2">1.2. Restaurantes parceiros (estabelecimentos comerciais)</p>
                        <p className="mb-2">Poderão ser coletados:</p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>Nome do estabelecimento;</li>
                            <li>Dados de login e credenciais de acesso ao painel administrativo;</li>
                            <li>Informações operacionais necessárias para o funcionamento da plataforma.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">2. FINALIDADES DO TRATAMENTO DE DADOS</h3>
                        <p className="mb-4">
                            Os dados pessoais coletados são tratados para as seguintes finalidades:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>Permitir a navegação e o uso adequado da plataforma;</li>
                            <li>Viabilizar a geração e o processamento de pedidos realizados via QR Code;</li>
                            <li>Permitir o acesso e a utilização do painel de controle pelos restaurantes parceiros;</li>
                            <li>Melhorar a experiência do usuário, por meio de análises de uso e navegação;</li>
                            <li>Enviar comunicações informativas, operacionais ou relacionadas ao serviço;</li>
                            <li>Cumprir obrigações legais, regulatórias ou contratuais.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">3. COMPARTILHAMENTO DE DADOS</h3>
                        <p className="mb-4">
                            A MesaFácil <strong>não vende, aluga ou comercializa dados pessoais</strong>.
                        </p>
                        <p className="mb-4">
                            O compartilhamento poderá ocorrer apenas nas seguintes hipóteses:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>Com os restaurantes responsáveis pelos pedidos realizados;</li>
                            <li>Com prestadores de serviços essenciais, como intermediadores de pagamento, exclusivamente para fins de processamento das transações;</li>
                            <li>Quando exigido por autoridade competente, em cumprimento de obrigação legal ou ordem judicial.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">4. COOKIES E TECNOLOGIAS DE RASTREAMENTO</h3>
                        <p className="mb-4">
                            A MesaFácil utiliza cookies e tecnologias semelhantes para:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-4">
                            <li>Garantir o funcionamento adequado da plataforma;</li>
                            <li>Coletar dados estatísticos e analíticos;</li>
                            <li>Armazenar preferências do usuário.</li>
                        </ul>
                        <p className="mb-6">
                            O usuário pode configurar seu navegador para recusar cookies, ciente de que essa ação poderá limitar determinadas funcionalidades da plataforma.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">5. SEGURANÇA DOS DADOS</h3>
                        <p className="mb-4">
                            A MesaFácil adota medidas técnicas e administrativas apropriadas para proteger os dados pessoais sob sua responsabilidade, incluindo, entre outras:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>Transmissão segura de dados por meio de protocolo HTTPS;</li>
                            <li>Controle de acesso aos sistemas;</li>
                            <li>Criptografia de informações sensíveis, quando aplicável;</li>
                            <li>Monitoramento e prevenção de acessos não autorizados.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">6. DIREITOS DOS TITULARES DE DADOS</h3>
                        <p className="mb-4">
                            Nos termos da LGPD, os titulares de dados pessoais possuem os seguintes direitos:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-4">
                            <li>Confirmar a existência de tratamento de dados;</li>
                            <li>Acessar seus dados pessoais;</li>
                            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
                            <li>Solicitar a portabilidade dos dados, quando aplicável;</li>
                            <li>Revogar o consentimento, nos casos em que esta for a base legal.</li>
                        </ul>
                        <p className="mb-6">
                            As solicitações deverão ser encaminhadas pelos canais de contato indicados nesta Política.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">7. RETENÇÃO E EXCLUSÃO DOS DADOS</h3>
                        <p className="mb-4">
                            Os dados pessoais serão armazenados pelo tempo necessário para o cumprimento das finalidades descritas nesta Política, observadas as exigências legais e regulatórias aplicáveis.
                        </p>
                        <p className="mb-6">
                            Após esse período, os dados poderão ser eliminados ou anonimizados, conforme previsto na LGPD.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">8. ALTERAÇÕES NA POLÍTICA DE PRIVACIDADE</h3>
                        <p className="mb-6">
                            A MesaFácil reserva-se o direito de alterar esta Política de Privacidade a qualquer tempo. Recomenda-se a consulta periódica deste documento. Alterações relevantes poderão ser comunicadas por meio da plataforma ou por outros canais disponíveis.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">9. CONTATO</h3>
                        <p className="mb-4">
                            Para esclarecimentos, solicitações ou exercício dos direitos previstos na LGPD, o titular poderá entrar em contato com o Encarregado de Dados (DPO) da MesaFácil:
                        </p>
                        <p className="mb-6">
                            📧 <strong>E-mail:</strong> kaioportela10@gmail.com<br/>
                            📞 <strong>Telefone:</strong> (88) 9 8849-9692
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">10. LEI APLICÁVEL E FORO</h3>
                        <p className="mb-6">
                            Esta Política de Privacidade será regida e interpretada de acordo com as leis da República Federativa do Brasil, especialmente a LGPD. Fica eleito o foro da comarca da sede da empresa para dirimir quaisquer controvérsias decorrentes deste documento, salvo disposição legal em contrário.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}